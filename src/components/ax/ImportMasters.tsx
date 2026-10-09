"use client";

import { useEffect, useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";
import { StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { uuidv4 } from "@/lib/data/source";
import { formatPrice } from "@/lib/analytics";
import { newProductFromFile, type SalesDiagnosis, type UnknownChannel, type UnknownProduct } from "@/lib/import";
import type { Channel, ProductCategory } from "@/lib/types";

const CATEGORIES: ProductCategory[] = ["에센스/앰플", "크림", "토너/미스트", "클렌저", "선케어", "마스크"];
const CHANNEL_TYPES: Channel["type"][] = ["직영몰", "온라인몰", "오프라인", "라이브/인플루언서", "B2B", "수출"];

/* 자료 진단 — 파일 자체 요약 (등록 여부와 무관) */
export function SalesDiagnosisCard({ d }: { d: SalesDiagnosis }) {
  const items: [string, string][] = [
    ["기간", d.from ? `${d.from} ~ ${d.to} (${d.days}일 · ${d.months}개월)` : "날짜 인식 실패"],
    ["행", `${d.rows.toLocaleString()}행`],
    ["상품", `${d.products}종`],
    ["채널", d.channels ? `${d.channels}곳` : "파일에 채널 열 없음"],
    ["수량 합계", `${d.units.toLocaleString()}개`],
    ["매출 합계", d.revenue == null ? "매출 열 없음 (판매가로 계산)" : formatPrice(d.revenue)],
  ];
  const warn = [
    d.badDates > 0 && `날짜 해석 실패 ${d.badDates}행`,
    d.badUnits > 0 && `수량 해석 실패 ${d.badUnits}행`,
    d.from && d.days < 28 && "4주 미만 — 성장률·재고 판단에는 최소 4주(권장 8주) 필요",
  ].filter(Boolean) as string[];
  return (
    <div className="mt-4 rounded-xl bg-surface-muted p-3.5" data-testid="sales-diagnosis">
      <h3 className="text-[0.92rem] font-bold">자료 진단 <span className="font-normal text-ink-soft">— 파일 그대로 요약 (저장 전)</span></h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.86rem] @xl:grid-cols-3">
        {items.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[0.76rem] text-ink-soft">{k}</dt><dd className="break-any font-semibold tabular">{v}</dd></div>)}
      </dl>
      {warn.length > 0 && <p className="mt-2 text-[0.82rem]" style={{ color: "var(--warning)" }}>{warn.join(" · ")}</p>}
    </div>
  );
}

interface ProdDraft { sku: string; category: ProductCategory | ""; price: string }
interface ChDraft { type: Channel["type"] | ""; discount: string }

/* 파일에만 있는 상품·채널 — 대표·관리자는 여기서 바로 등록 (DB 권한도 OWNER/ADMIN) */
export function ImportMasters({ products, channels }: { products: UnknownProduct[]; channels: UnknownChannel[] }) {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const [pd, setPd] = useState<Record<string, ProdDraft>>({});
  const [cd, setCd] = useState<Record<string, ChDraft>>({});
  const [all, setAll] = useState<ProductCategory | "">("");
  const [busy, setBusy] = useState(false);
  const sig = products.map((p) => p.key).join("|") + "#" + channels.map((c) => c.key).join("|");

  // 새 파일·새 미등록 목록이 오면 추정값으로 초안을 다시 채운다 (사용자가 바꾼 값은 같은 항목이면 유지)
  useEffect(() => {
    setPd((prev) => Object.fromEntries(products.map((p) => [p.key, prev[p.key] ?? { sku: p.sku, category: p.categoryGuess ?? "", price: p.avgUnitPrice ? String(p.avgUnitPrice) : "" }])));
    setCd((prev) => Object.fromEntries(channels.map((c) => [c.key, prev[c.key] ?? { type: c.typeGuess ?? "", discount: "0" }])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const takenSkus = useMemo(() => new Set(m.snapshot.products.map((p) => p.sku.toLowerCase())), [m.snapshot.products]);
  const problems = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const p of products) {
      const d = pd[p.key];
      if (!d) continue;
      if (!d.category) out.push(`${p.name}: 카테고리`);
      const price = Number(d.price.replace(/[,\s원]/g, ""));
      if (!Number.isInteger(price) || price <= 0) out.push(`${p.name}: 판매가`);
      const sku = d.sku.trim().toLowerCase();
      if (sku && (takenSkus.has(sku) || seen.has(sku))) out.push(`${p.name}: SKU 중복 ${d.sku}`);
      if (sku) seen.add(sku);
    }
    for (const c of channels) if (!cd[c.key]?.type) out.push(`${c.name}: 채널 유형`);
    return out;
  }, [products, channels, pd, cd, takenSkus]);

  if (!products.length && !channels.length) return null;
  const editable = can(role, "edit_master");

  if (!editable) {
    return (
      <div className="mt-4 rounded-xl p-3.5 text-[0.88rem]" style={{ background: "var(--warning-soft)" }} data-testid="import-masters">
        <b style={{ color: "var(--warning)" }}>등록되지 않은 상품 {products.length}개 · 채널 {channels.length}개</b> — 대표·관리자가 이 화면에서 같은 파일을 올리면 바로 등록할 수 있습니다. 등록 후 다시 올리면 해당 행이 저장됩니다.
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      const today = m.today;
      const taken = new Set(takenSkus);
      await run(async (s) => {
        for (const c of channels) {
          const d = cd[c.key];
          await s.upsertChannel({ id: uuidv4(), name: c.name, type: d.type as Channel["type"], avgDiscountRate: Math.min(0.9, Math.max(0, Number(d.discount) / 100 || 0)), active: true });
        }
        for (const p of products) {
          const d = pd[p.key];
          await s.upsertProduct(newProductFromFile({ name: p.name, sku: d.sku, category: d.category as ProductCategory, price: Number(d.price.replace(/[,\s원]/g, "")) }, taken, uuidv4(), today));
        }
      });
      toast(`상품 ${products.length}개 · 채널 ${channels.length}개를 등록했습니다. 판매 행을 다시 검증했습니다.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "등록 실패", "error");
    } finally { setBusy(false); }
  };

  return (
    <section className="@container mt-4 rounded-xl border p-3.5" style={{ borderColor: "var(--warning)" }} data-testid="import-masters">
      <h3 className="flex flex-wrap items-center gap-2 text-[0.95rem] font-bold">
        <PackagePlus size={18} aria-hidden style={{ color: "var(--warning)" }} />
        파일에만 있는 상품 {products.length}개 · 채널 {channels.length}개 — 여기서 바로 등록
      </h3>
      <p className="mt-1 text-[0.82rem] text-ink-soft">'추정' 값은 상품명·채널명·파일의 매출÷수량으로 미리 채운 것입니다. 확인 후 등록하세요. 새 상품은 고객 화면 비공개로 등록되며, 원가·사용기간·구매 링크는 상품 관리에서 보완합니다.</p>

      {products.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.84rem]">
            <label htmlFor="cat-all" className="font-semibold">카테고리 한꺼번에</label>
            <select id="cat-all" className="field !min-h-[36px] !w-auto !py-1 text-[0.84rem]" value={all} onChange={(e) => { const v = e.target.value as ProductCategory | ""; setAll(v); if (v) setPd((prev) => Object.fromEntries(Object.entries(prev).map(([k, d]) => [k, { ...d, category: d.category || v }]))); }}>
              <option value="">— 비어 있는 항목에 적용 —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <ul className="mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1" tabIndex={0} aria-label="등록할 상품 목록">
            {products.map((p) => {
              const d = pd[p.key] ?? { sku: "", category: "", price: "" };
              const set = (patch: Partial<ProdDraft>) => setPd((prev) => ({ ...prev, [p.key]: { ...d, ...patch } }));
              return (
                <li key={p.key} className="rounded-lg border p-2.5" style={{ borderColor: "var(--border)" }} data-unknown-product={p.name}>
                  <div className="break-any text-[0.88rem] font-bold">{p.name} <span className="font-normal text-ink-soft">· {p.rows}행 · {p.units.toLocaleString()}개</span></div>
                  <div className="mt-1.5 grid gap-2 @md:grid-cols-3">
                    <label className="block text-[0.76rem] text-ink-soft">SKU
                      <input aria-label={`${p.name} SKU`} className="field !min-h-[34px] !py-1 text-[0.84rem]" placeholder="비우면 AUTO 코드" value={d.sku} onChange={(e) => set({ sku: e.target.value })} />
                    </label>
                    <label className="block text-[0.76rem] text-ink-soft">카테고리 *{p.categoryGuess && d.category === p.categoryGuess && " · 추정 (상품명)"}
                      <select aria-label={`${p.name} 카테고리`} className="field !min-h-[34px] !py-1 text-[0.84rem]" value={d.category} onChange={(e) => set({ category: e.target.value as ProductCategory })}>
                        <option value="">— 선택 —</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="block text-[0.76rem] text-ink-soft">판매가 (원) *{p.avgUnitPrice != null && d.price === String(p.avgUnitPrice) && " · 추정 (파일 평균 단가)"}
                      <input aria-label={`${p.name} 판매가`} inputMode="numeric" className="field !min-h-[34px] !py-1 text-[0.84rem] tabular" placeholder="원" value={d.price} onChange={(e) => set({ price: e.target.value })} />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
          {products.some((p) => p.avgUnitPrice != null) && <p className="mt-1 text-[0.76rem] text-ink-soft">파일 평균 단가 = 매출 ÷ 수량 (할인이 반영돼 정가와 다를 수 있음)</p>}
        </>
      )}

      {channels.length > 0 && (
        <div className="mt-3 grid gap-2 @xl:grid-cols-2">
          {channels.map((c) => {
            const d = cd[c.key] ?? { type: "", discount: "0" };
            const set = (patch: Partial<ChDraft>) => setCd((prev) => ({ ...prev, [c.key]: { ...d, ...patch } }));
            return (
              <div key={c.key} className="rounded-lg border p-2.5 text-[0.84rem]" style={{ borderColor: "var(--border)" }} data-unknown-channel={c.name}>
                <div className="break-any font-bold">{c.name} <span className="font-normal text-ink-soft">· {c.rows}행</span></div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <select aria-label={`${c.name} 채널 유형`} className="field !min-h-[34px] !w-auto !py-1 text-[0.82rem]" value={d.type} onChange={(e) => set({ type: e.target.value as Channel["type"] })}>
                    <option value="">— 유형 선택 —</option>
                    {CHANNEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {c.typeGuess && d.type === c.typeGuess && <span className="text-[0.72rem] text-ink-soft">추정 (채널명)</span>}
                  <label className="flex items-center gap-1 text-[0.8rem]">평균 할인율 <input aria-label={`${c.name} 평균 할인율`} inputMode="numeric" className="field !min-h-[34px] !w-[64px] !py-1 text-[0.82rem]" value={d.discount} onChange={(e) => set({ discount: e.target.value })} />%</label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={busy || problems.length > 0} onClick={() => void save()} data-testid="register-masters">
          {busy ? "등록 중…" : `상품 ${products.length}개 · 채널 ${channels.length}개 등록 후 다시 검증`}
        </button>
        {problems.length > 0 && <StatusBadge tone="warning">확인 필요 {problems.length}: {problems.slice(0, 3).join(", ")}{problems.length > 3 ? " …" : ""}</StatusBadge>}
      </div>
    </section>
  );
}
