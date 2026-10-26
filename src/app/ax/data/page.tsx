"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge } from "@/components/ax/Cards";
import { Tabs } from "@/components/ax/Tabs";
import { SalesImport } from "@/components/ax/SalesImport";
import { ImportHistory } from "@/components/ax/ImportHistory";
import { ProductImport } from "@/components/ax/ProductImport";
import { ExportCenter } from "@/components/ax/ExportCenter";
import { TransferCard } from "@/components/ax/TransferCard";
import { DataQualityCard } from "@/components/ax/DataQualityCard";
import { buildTransfer } from "@/lib/transfer";
import { EmptyState } from "@/components/ax/States";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { toast } from "@/components/ax/Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatPrice } from "@/lib/analytics";
import { todayISO } from "@/lib/date";
import { isLive } from "@/lib/config";
import type { B2BAccount, Channel, ChannelType, InputCycle, Product, ProductCategory, ProductionPlan, SalesRecord, SkinConcern, Texture } from "@/lib/types";
import { matchesQuery } from "@/lib/search";
import { cycleOf, INPUT_CYCLE_IDS, INPUT_CYCLES } from "@/lib/channel-cycle";

const TABS = [
  { id: "sales", label: "판매 입력·파일" },
  { id: "products", label: "상품" },
  { id: "channels", label: "채널" },
  { id: "production", label: "OEM 생산" },
  { id: "b2b", label: "B2B 거래처" },
  { id: "quality", label: "품질 점검" },
  { id: "export", label: "내보내기" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const CATEGORIES: ProductCategory[] = ["에센스/앰플", "크림", "토너/미스트", "클렌저", "선케어", "마스크"];
const CONCERNS: SkinConcern[] = ["수분", "진정", "탄력", "피부결", "광채", "데일리 케어"];
const CH_TYPES: ChannelType[] = ["직영몰", "온라인몰", "오프라인", "라이브/인플루언서", "B2B", "수출"];

function Inner() {
  const router = useRouter();
  const tab = (useSearchParams().get("tab") as TabId) || "sales";
  return (
    <div>
      <PageHeader title="데이터 관리" description="실제 데이터 1~2건부터 직접 넣어볼 수 있습니다. 재고는 상품·재고 화면에서 바로 수정합니다." actions={<DataFreshness />} />
      {!isLive && <p className="mb-4 rounded-xl px-3 py-2 text-[0.88rem]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><b className="font-semibold">DEMO</b> — 입력값은 이 브라우저에만 저장됩니다 (실제 저장은 Live 전환 후).</p>}
      {!isLive && tab !== "export" && <BackupReminder />}
      <Tabs tabs={TABS} value={tab} onChange={(t) => router.replace(`/ax/data?tab=${t}`, { scroll: false })} />
      {tab === "sales" && <SalesTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "channels" && <ChannelsTab />}
      {tab === "production" && <ProductionTab />}
      {tab === "b2b" && <B2BTab />}
      {tab === "quality" && <DataQualityCard />}
      {tab === "export" && <><ExportCenter /><TransferCard /></>}
    </div>
  );
}
/* Demo 주소에 실데이터를 넣었다면: 이 브라우저에만 있으니 백업 파일을 받아 두라는 안내 */
function BackupReminder() {
  const m = useModel();
  const { role } = useSession();
  const { summary } = buildTransfer(m.snapshot, "demo");
  if (!can(role, "view_financials") || summary.products + summary.sales + summary.settlements === 0) return null;
  return (
    <p className="mb-4 rounded-xl border p-3 text-[0.88rem]" style={{ borderColor: "var(--warning)" }} data-testid="backup-reminder">
      직접 입력한 실데이터(상품 {summary.products} · 판매 {summary.sales.toLocaleString()} · 정산 {summary.settlements})가 이 브라우저에만 있습니다. <Link className="font-semibold underline" href="/ax/data?tab=export#transfer">백업 파일 받기</Link> — 브라우저 데이터를 지우면 사라지며, Supabase 연결 후 이 파일로 그대로 옮길 수 있습니다.
    </p>
  );
}

export default function DataPage() {
  return <Suspense><Inner /></Suspense>;
}

function useSave() {
  const { run } = useData();
  const [busy, setBusy] = useState(false);
  const save = async (label: string, fn: Parameters<typeof run>[0]) => {
    setBusy(true);
    try { await run(fn); toast(label); return true; } catch (e) { toast(e instanceof Error ? e.message : "저장 실패", "error"); return false; } finally { setBusy(false); }
  };
  return { busy, save };
}

function NeedRole({ perm }: { perm: string }) {
  return <p className="rounded-xl bg-surface-muted p-4 text-[0.92rem] text-ink-soft">{perm}은(는) 대표·관리자 권한입니다.</p>;
}

/* ---------- 판매 ---------- */
function SalesTab() {
  const m = useModel();
  // 상품·채널이 하나도 없는 첫날에도 판매 파일로 시작할 수 있어야 한다 (D-042) — 직접 입력 카드만 안내로 바꾼다
  const noMasters = m.snapshot.products.length === 0 || !m.snapshot.channels.some((c) => c.active);
  return (
    <div className="grid gap-6 @4xl:grid-cols-2">
      {noMasters ? (
        <DataCard title="판매 1건 입력">
          <div data-testid="sales-start-from-file">
            <p className="text-[0.92rem] text-ink-soft">직접 입력하려면 상품과 채널이 먼저 필요합니다.</p>
            <p className="mt-2 text-[0.92rem]"><b>판매 파일로 바로 시작</b>할 수 있습니다: &lsquo;판매 파일 가져오기&rsquo;에 쇼핑몰 주문 엑셀(또는 CSV)을 올리면 파일 속 상품·채널을 그 자리에서 등록하고 판매까지 저장합니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/ax/data?tab=products" className="btn-secondary">상품 먼저 등록</Link>
              <Link href="/ax/data?tab=channels" className="btn-secondary">채널 먼저 등록</Link>
            </div>
          </div>
        </DataCard>
      ) : <ManualSaleCard />}
      <SalesImport />
      {/* 파일 가져오기 기록·되돌리기 (PASS 28, D-090) */}
      <ImportHistory className="@4xl:col-span-2" />
    </div>
  );
}

/* 판매 1건 입력 — PASS 32 (D-109): Enter로 저장(form) · 매출 자동 계산식을 그대로 보여 줌 · 상품 찾기(초성 가능)
   · 직접 입력한 판매는 그 자리에서 삭제(대표·관리자, 두 번 눌러 확인 — 파일로 들어온 판매는 '가져오기 기록'에서 되돌림) */
const SOURCE_LABEL: Record<SalesRecord["source"], string> = { manual: "직접 입력", csv: "파일", api: "연동", seed: "기준값" };
function ManualSaleCard() {
  const m = useModel();
  const { role } = useSession();
  const { busy, save } = useSave();
  const channels = m.snapshot.channels.filter((c) => c.active);
  const products = m.snapshot.products;
  const [f, setF] = useState({ saleDate: todayISO(), productId: products[0]?.id ?? "", channelId: channels[0]?.id ?? "", units: "", revenue: "" });
  const [pq, setPq] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const recent = [...m.snapshot.sales].filter((s) => s.source !== "seed").sort((a, b) => b.saleDate.localeCompare(a.saleDate)).slice(0, 8);
  const canDelete = can(role, "edit_master");
  // 두 번째 누름을 기다리는 시간 — 4초 안에 다시 누르지 않으면 원래대로
  useEffect(() => { if (!confirmId) return; const t = window.setTimeout(() => setConfirmId(null), 4000); return () => window.clearTimeout(t); }, [confirmId]);

  const p = m.productById.get(f.productId);
  const c = channels.find((x) => x.id === f.channelId);
  const computeRevenue = (units: number) => (p ? Math.round(units * p.price * (1 - (c?.avgDiscountRate ?? 0))) : 0);
  const unitsOk = f.units !== "" && Number.isInteger(Number(f.units)) && Number(f.units) >= 0;
  const revOk = f.revenue === "" || (Number.isFinite(Number(f.revenue)) && Number(f.revenue) >= 0);
  const shown = products.filter((x) => matchesQuery(pq, x.name, x.sku, x.category, x.line));
  const pickQuery = (v: string) => {
    setPq(v);
    const hits = products.filter((x) => matchesQuery(v, x.name, x.sku, x.category, x.line));
    if (hits.length && !hits.some((x) => x.id === f.productId)) setF({ ...f, productId: hits[0].id });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !unitsOk || !revOk || !p) return;
    const units = Number(f.units);
    const revenue = f.revenue ? Number(f.revenue) : computeRevenue(units);
    if (await save(`판매 1건을 저장했습니다 — ${p.name} ${units.toLocaleString()}개`, (s) => s.addSales([{ productId: f.productId, channelId: f.channelId, saleDate: f.saleDate, units, revenue, source: "manual" }]))) {
      setF({ ...f, units: "", revenue: "" });
      document.getElementById("s-units")?.focus(); // 같은 상품·채널로 이어서 입력
    }
  };
  const remove = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return; }
    setConfirmId(null);
    await save("판매 1건을 삭제했습니다", (s) => s.deleteSales([id]).then(() => undefined));
  };
  const rate = c?.avgDiscountRate ?? 0;

  return (
      <DataCard title="판매 1건 입력">
        <form onSubmit={submit} data-testid="manual-sale-form">
        {/* 순서: 언제·어디서 → 무엇 → 몇 개·얼마 (PASS 32) — 저장 뒤에는 수량 칸으로 돌아감 */}
        <div className="grid gap-3 @xl:grid-cols-2">
          <div><label className="field-label" htmlFor="s-date">판매일 (또는 집계일)</label><input id="s-date" type="date" className="field" value={f.saleDate} onChange={(e) => setF({ ...f, saleDate: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="s-ch">채널</label><select id="s-ch" className="field" value={f.channelId} onChange={(e) => setF({ ...f, channelId: e.target.value })}>{channels.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="@xl:col-span-2">
            <div className="flex items-end justify-between gap-2"><label className="field-label" htmlFor="s-prod">상품</label>{products.length > 6 && <span className="mb-1 text-[0.76rem] text-ink-soft tabular" aria-hidden>{pq ? `${shown.length}개 찾음` : `전체 ${products.length}개`}</span>}</div>
            <div className="flex flex-col gap-1.5 @xl:flex-row">
              {products.length > 6 && (
                <input type="search" className="field @xl:!w-[42%] @xl:shrink-0" placeholder="이름·코드로 찾기" value={pq} onChange={(e) => pickQuery(e.target.value)} aria-label="상품 찾기" aria-controls="s-prod" data-testid="manual-sale-product-search" />
              )}
              <select id="s-prod" className="field min-w-0 flex-1" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}>
                {(shown.length ? shown : products).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.sku})</option>)}
              </select>
            </div>
            {pq && shown.length === 0 && <p className="mt-1 text-[0.8rem] text-ink-soft" data-testid="manual-sale-product-none">&lsquo;{pq}&rsquo;에 맞는 상품이 없어 전체를 보여 줍니다</p>}
          </div>
          <div><label className="field-label" htmlFor="s-units">수량</label><input id="s-units" className="field tabular" inputMode="numeric" enterKeyHint="done" placeholder="예: 3" aria-invalid={f.units !== "" && !unitsOk} aria-describedby={f.units !== "" && !unitsOk ? "s-units-err" : undefined} value={f.units} onChange={(e) => setF({ ...f, units: e.target.value.trim() })} />
            {f.units !== "" && !unitsOk && <p id="s-units-err" className="mt-1 text-[0.8rem] font-semibold" style={{ color: "var(--danger)" }}>0 이상의 정수로 입력하세요</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="s-rev">매출 (비우면 자동 계산)</label>
            <input id="s-rev" className="field tabular" inputMode="numeric" enterKeyHint="done" aria-describedby="s-rev-calc" aria-invalid={!revOk} placeholder={unitsOk ? computeRevenue(Number(f.units)).toLocaleString() : "수량을 넣으면 자동 계산"} value={f.revenue} onChange={(e) => setF({ ...f, revenue: e.target.value.replace(/[,\s원₩]/g, "") })} />
          </div>
          {/* 자동 계산식 — 숫자가 어디서 나왔는지 바로 보이게 */}
          <p id="s-rev-calc" className="tabular -mt-1 text-[0.8rem] text-ink-soft @xl:col-span-2" aria-live="polite" data-testid="manual-sale-calc">
            {!revOk ? <span className="font-semibold" style={{ color: "var(--danger)" }}>매출은 0 이상의 숫자로 입력하세요</span>
              : f.revenue ? "입력한 매출로 저장합니다"
              : p && unitsOk ? <>판매가 {formatPrice(p.price)} × {Number(f.units).toLocaleString()}개{rate ? ` × (1 − ${c?.name} 할인 ${Math.round(rate * 1000) / 10}%)` : ""} = <b className="text-ink">{formatPrice(computeRevenue(Number(f.units)))}</b></>
              : "매출을 비우면 판매가 × 수량 × (1 − 채널 평균 할인율)로 계산합니다"}
          </p>
        </div>
        <button type="submit" className="btn-primary mt-4" disabled={busy || !unitsOk || !revOk} data-testid="manual-sale-save">
          <Plus size={17} aria-hidden /> 저장 <span className="hidden text-[0.78rem] font-medium opacity-80 @md:inline">(Enter)</span>
        </button>
        </form>
        <h3 className="mt-6 text-[0.95rem] font-bold">최근 입력된 판매 <span className="text-[0.8rem] font-medium text-ink-soft">(기준값 제외 · 판매일 순)</span></h3>
        {recent.length === 0 ? <p className="mt-2 text-[0.88rem] text-ink-soft">아직 없습니다 (Demo 기준값 제외)</p> : (
          <ul className="mt-2 space-y-1.5 text-[0.88rem]" data-testid="manual-sale-recent">
            {recent.map((s) => {
              const arm = confirmId === s.id;
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2" data-sale-row={s.id}>
                  <span className="min-w-0"><span className="tabular">{s.saleDate.slice(5).replace("-", ".")}</span> · <span className="font-semibold">{m.productById.get(s.productId)?.name ?? "삭제된 상품"}</span><span className="block text-[0.78rem] text-ink-soft @md:inline @md:before:content-['_·_']">{m.snapshot.channels.find((x) => x.id === s.channelId)?.name ?? "-"}</span></span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="tabular text-right">{s.units.toLocaleString()}개 · {formatPrice(s.revenue)}</span>
                    <StatusBadge tone="neutral">{SOURCE_LABEL[s.source] ?? s.source}</StatusBadge>
                    {canDelete && s.source === "manual" && (
                      <button type="button" disabled={busy} onClick={() => remove(s.id)} className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 text-[0.8rem] font-semibold ${arm ? "text-white" : "text-ink-soft hover:bg-surface"}`} style={arm ? { background: "var(--danger)" } : undefined} aria-label={arm ? "한 번 더 누르면 삭제" : `${m.productById.get(s.productId)?.name ?? ""} ${s.saleDate} 판매 삭제`} data-testid="manual-sale-delete">
                        <Trash2 size={14} aria-hidden />{arm ? "삭제 확인" : <span className="sr-only">삭제</span>}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </DataCard>
  );
}

/* ---------- 상품 ---------- */
const emptyProduct = (): Product => ({ id: `new-prod-${Date.now()}`, sku: "", name: "", category: "에센스/앰플", price: 0, cost: undefined, status: "신규", concerns: [], isPublished: false, purchaseLinks: [], mainChannelIds: [] });

function ProductsTab() {
  const m = useModel();
  const { role } = useSession();
  const { busy, save } = useSave();
  const [edit, setEdit] = useState<Product | null>(null);
  if (!can(role, "edit_master")) return <NeedRole perm="상품 등록·수정" />;
  return (
    <>
    <div className="grid gap-6 @4xl:grid-cols-5">
      <DataCard title={`상품 (${m.snapshot.products.length})`} className="@4xl:col-span-2" action={<button className="btn-primary !min-h-[40px] text-[0.86rem]" onClick={() => setEdit(emptyProduct())}><Plus size={16} aria-hidden /> 새 상품</button>}>
        <ul className="max-h-[520px] space-y-1.5 overflow-y-auto">
          {m.snapshot.products.map((p) => (
            <li key={p.id}><button onClick={() => setEdit(structuredClone(p))} className="row-hover flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[0.92rem]" style={{ borderColor: edit?.id === p.id ? "var(--primary)" : "var(--border)" }}>
              <span className="min-w-0"><span className="block truncate font-semibold">{p.name}</span><span className="text-[0.78rem] text-ink-soft">{p.sku}</span></span>
              {p.isDemo ? <StatusBadge tone="warning">DEMO</StatusBadge> : <StatusBadge tone="success">실데이터</StatusBadge>}
            </button></li>
          ))}
        </ul>
      </DataCard>
      <DataCard title={edit ? (edit.id.startsWith("new-") ? "새 상품 등록" : `수정 — ${edit.name}`) : "상품 선택"} className="@4xl:col-span-3">
        {!edit ? <EmptyState title="왼쪽에서 상품을 선택하거나 새 상품을 등록하세요" /> : (
          <ProductForm key={edit.id} value={edit} busy={busy} channels={m.snapshot.channels} onCancel={() => setEdit(null)} onSave={async (p) => { if (await save("상품을 저장했습니다", (s) => s.upsertProduct(p))) setEdit(null); }} skuTaken={(sku) => m.snapshot.products.some((x) => x.sku === sku && x.id !== edit.id)} />
        )}
      </DataCard>
    </div>
    <ProductImport />
    </>
  );
}

function ProductForm({ value, busy, channels, onSave, onCancel, skuTaken }: { value: Product; busy: boolean; channels: Channel[]; onSave: (p: Product) => void; onCancel: () => void; skuTaken: (sku: string) => boolean }) {
  const [p, setP] = useState<Product>(value);
  const [links, setLinks] = useState(value.purchaseLinks.map((l) => `${l.label}|${l.url}`).join("\n"));
  const errors = [!p.sku.trim() && "SKU 필수", skuTaken(p.sku.trim()) && "이미 있는 SKU", !p.name.trim() && "제품명 필수", !(p.price > 0) && "판매가 필수"].filter(Boolean) as string[];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 @xl:grid-cols-2">
        <div><label className="field-label" htmlFor="p-sku">SKU</label><input id="p-sku" className="field" value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="p-name">제품명 (실제 명칭)</label><input id="p-name" className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="p-cat">카테고리</label><select id="p-cat" className="field" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value as ProductCategory })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="field-label" htmlFor="p-line">라인 (선택)</label><input id="p-line" className="field" value={p.line ?? ""} onChange={(e) => setP({ ...p, line: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="p-price">판매가 (원)</label><input id="p-price" className="field tabular" inputMode="numeric" value={p.price || ""} onChange={(e) => setP({ ...p, price: Number(e.target.value) || 0 })} /></div>
        <div><label className="field-label" htmlFor="p-cost">원가 (원, 선택·민감)</label><input id="p-cost" className="field tabular" inputMode="numeric" value={p.cost ?? ""} onChange={(e) => setP({ ...p, cost: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
        <div><label className="field-label" htmlFor="p-tex">사용감</label><select id="p-tex" className="field" value={p.texture ?? ""} onChange={(e) => setP({ ...p, texture: (e.target.value || undefined) as Texture | undefined })}><option value="">미입력</option>{["가벼움", "중간", "리치"].map((t) => <option key={t}>{t}</option>)}</select></div>
        <div><label className="field-label" htmlFor="p-usage">사용기간 (일, 1개 기준 · 재구매 예상 계산)</label><input id="p-usage" className="field tabular" inputMode="numeric" placeholder="미입력 시 종류별 추정" value={p.usageDays ?? ""} onChange={(e) => setP({ ...p, usageDays: e.target.value === "" ? null : Math.min(365, Math.max(1, Number(e.target.value) || 1)) })} /></div>
        <div><label className="field-label" htmlFor="p-lead">OEM 생산기간 (일, 발주→입고)</label><input id="p-lead" className="field tabular" inputMode="numeric" placeholder="생산 착수 마감일 계산" value={p.leadTimeDays ?? ""} onChange={(e) => setP({ ...p, leadTimeDays: e.target.value === "" ? null : Math.min(365, Math.max(1, Number(e.target.value.replace(/[^0-9]/g, "")) || 1)) })} /></div>
        <div><label className="field-label" htmlFor="p-moq">최소 생산수량 (MOQ, 개)</label><input id="p-moq" className="field tabular" inputMode="numeric" placeholder="선택" value={p.moq ?? ""} onChange={(e) => setP({ ...p, moq: e.target.value === "" ? null : Math.min(10_000_000, Math.max(0, Number(e.target.value.replace(/[^0-9]/g, "")) || 0)) })} /></div>
        <div><label className="field-label" htmlFor="p-step">루틴 단계</label><select id="p-step" className="field" value={p.routineStep ?? ""} onChange={(e) => setP({ ...p, routineStep: e.target.value ? Number(e.target.value) : undefined })}><option value="">미입력</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>STEP {n}</option>)}</select></div>
      </div>
      <div>
        <span className="field-label">추천 분류 (피부 고민 — 효능 표현 아님)</span>
        <div className="flex flex-wrap gap-1.5">{CONCERNS.map((c) => { const on = p.concerns.includes(c); return <button key={c} type="button" aria-pressed={on} onClick={() => setP({ ...p, concerns: on ? p.concerns.filter((x) => x !== c) : [...p.concerns, c] })} className="pressable min-h-[38px] rounded-full border px-3 text-[0.85rem] font-semibold" style={on ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)" }}>{c}</button>; })}</div>
      </div>
      <div>
        <span className="field-label">주요 채널</span>
        <div className="flex flex-wrap gap-1.5">{channels.map((c) => { const on = p.mainChannelIds.includes(c.id); return <button key={c.id} type="button" aria-pressed={on} onClick={() => setP({ ...p, mainChannelIds: on ? p.mainChannelIds.filter((x) => x !== c.id) : [...p.mainChannelIds, c.id] })} className="pressable min-h-[38px] rounded-full border px-3 text-[0.85rem]" style={on ? { background: "var(--primary-soft)", borderColor: "var(--primary)" } : { borderColor: "var(--border)" }}>{c.name}</button>; })}</div>
      </div>
      <div><label className="field-label" htmlFor="p-desc">설명 (확인된 사실만)</label><textarea id="p-desc" className="field" value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="p-links">고객용 구매채널 (한 줄에 하나: 이름|URL)</label><textarea id="p-links" className="field font-mono text-[0.85rem]" placeholder="직영몰|https://..." value={links} onChange={(e) => setLinks(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-[0.92rem]"><input type="checkbox" className="h-4 w-4" checked={p.isPublished} onChange={(e) => setP({ ...p, isPublished: e.target.checked })} /> 고객 화면(MIRYEO AI Beauty)에 공개</label>
      {errors.length > 0 && <p className="text-[0.85rem]" style={{ color: "var(--danger)" }}>{errors.join(" · ")}</p>}
      <div className="flex gap-2 pt-1">
        <button className="btn-primary" disabled={busy || errors.length > 0} onClick={() => onSave({ ...p, sku: p.sku.trim(), name: p.name.trim(), isDemo: false, purchaseLinks: links.split("\n").map((l) => l.split("|")).filter(([a]) => a?.trim()).map(([label, url]) => ({ label: label.trim(), url: (url ?? "").trim() })) })}>저장</button>
        <button className="btn-secondary" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

/* ---------- 채널 ---------- */
function ChannelsTab() {
  const m = useModel();
  const { role } = useSession();
  const { busy, save } = useSave();
  const [c, setC] = useState<Channel>({ id: `new-ch-${Date.now()}`, name: "", type: "온라인몰", avgDiscountRate: 0, active: true });
  if (!can(role, "edit_master")) return <NeedRole perm="채널 등록·수정" />;
  return (
    <div className="grid gap-6 @4xl:grid-cols-2">
      <DataCard title={c.id.startsWith("new-") ? "새 채널" : `수정 — ${c.name}`}>
        <div className="grid gap-3 @xl:grid-cols-2">
          <div><label className="field-label" htmlFor="c-name">채널명</label><input id="c-name" className="field" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="c-type">유형</label><select id="c-type" className="field" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as ChannelType })}>{CH_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="field-label" htmlFor="c-disc">평균 할인율 (%)</label><input id="c-disc" className="field tabular" inputMode="decimal" value={Math.round(c.avgDiscountRate * 1000) / 10} onChange={(e) => setC({ ...c, avgDiscountRate: Math.min(1, Math.max(0, Number(e.target.value) / 100 || 0)) })} /></div>
          <label className="flex items-center gap-2 pt-7 text-[0.92rem]"><input type="checkbox" className="h-4 w-4" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} /> 사용 중</label>
          {/* 판매 입력 주기 (PASS 27, R-24) — 몰아서 올리는 채널은 그 채널의 마지막 입력 기준으로 '최근 4주' */}
          <div className="@xl:col-span-2">
            <label className="field-label" htmlFor="c-cycle">판매 입력 주기</label>
            <select id="c-cycle" data-testid="channel-cycle" className="field" value={cycleOf(c)} aria-describedby="c-cycle-help" onChange={(e) => setC({ ...c, inputCycle: e.target.value as InputCycle })}>
              {INPUT_CYCLE_IDS.map((k) => <option key={k} value={k}>{INPUT_CYCLES[k].label}</option>)}
            </select>
            <p id="c-cycle-help" className="mt-1 text-[0.82rem] text-ink-soft">{INPUT_CYCLES[cycleOf(c)].help}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" disabled={busy || !c.name.trim()} onClick={async () => { if (await save("채널을 저장했습니다", (s) => s.upsertChannel({ ...c, name: c.name.trim() }))) setC({ id: `new-ch-${Date.now()}`, name: "", type: "온라인몰", avgDiscountRate: 0, active: true }); }}>저장</button>
          {!c.id.startsWith("new-") && <button className="btn-secondary" onClick={() => setC({ id: `new-ch-${Date.now()}`, name: "", type: "온라인몰", avgDiscountRate: 0, active: true })}>새로 입력</button>}
        </div>
      </DataCard>
      <DataCard title={`채널 (${m.snapshot.channels.length})`}>
        <ul className="space-y-1.5">{m.snapshot.channels.map((x) => <li key={x.id}><button onClick={() => setC(x)} className="row-hover flex w-full justify-between rounded-xl border px-3 py-2.5 text-[0.92rem]" style={{ borderColor: "var(--border)" }}><span className="font-semibold">{x.name}</span><span className="text-ink-soft">{x.type} · {Math.round(x.avgDiscountRate * 100)}%{cycleOf(x) !== "daily" ? ` · 입력 ${INPUT_CYCLES[cycleOf(x)].short}` : ""}{x.active ? "" : " · 중지"}</span></button></li>)}</ul>
      </DataCard>
    </div>
  );
}

/* ---------- 생산 ---------- */
function ProductionTab() {
  const m = useModel();
  const { role } = useSession();
  const { busy, save } = useSave();
  const blank = (): ProductionPlan => ({ id: `new-prod-plan-${Date.now()}`, productId: m.snapshot.products[0]?.id ?? "", partner: "", quantity: 0, status: "계획", lastProducedAt: todayISO() });
  const [p, setP] = useState<ProductionPlan>(blank);
  if (!can(role, "edit_master")) return <NeedRole perm="생산 계획 입력" />;
  return (
    <DataCard title="OEM 생산 계획 입력">
      <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
        <div><label className="field-label" htmlFor="pp-prod">상품</label><select id="pp-prod" className="field" value={p.productId} onChange={(e) => setP({ ...p, productId: e.target.value })}>{m.snapshot.products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><label className="field-label" htmlFor="pp-partner">OEM/ODM 업체 (실제 명칭)</label><input id="pp-partner" className="field" value={p.partner} onChange={(e) => setP({ ...p, partner: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="pp-qty">수량</label><input id="pp-qty" className="field tabular" inputMode="numeric" value={p.quantity || ""} onChange={(e) => setP({ ...p, quantity: Number(e.target.value) || 0 })} /></div>
        <div><label className="field-label" htmlFor="pp-date">생산(발주)일</label><input id="pp-date" type="date" className="field" value={p.lastProducedAt ?? ""} onChange={(e) => setP({ ...p, lastProducedAt: e.target.value || null })} /></div>
        <div><label className="field-label" htmlFor="pp-arr">입고 예정일</label><input id="pp-arr" type="date" className="field" value={p.expectedArrival ?? ""} onChange={(e) => setP({ ...p, expectedArrival: e.target.value || null })} /></div>
        <div><label className="field-label" htmlFor="pp-status">상태</label><select id="pp-status" className="field" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value as ProductionPlan["status"] })}>{["계획", "생산중", "입고예정", "완료"].map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <button className="btn-primary mt-4" disabled={busy || !p.partner.trim() || !p.productId || p.quantity <= 0} onClick={async () => { if (await save("생산 계획을 저장했습니다", (s) => s.upsertProduction({ ...p, partner: p.partner.trim() }))) setP(blank()); }}>저장</button>
      <p className="mt-2 text-[0.82rem] text-ink-soft">목록은 상품·재고·생산 &gt; OEM 생산 탭에서 확인합니다.</p>
    </DataCard>
  );
}

/* ---------- B2B ---------- */
function B2BTab() {
  const m = useModel();
  const { role } = useSession();
  const { busy, save } = useSave();
  const blank = (): B2BAccount => ({ id: `new-b2b-${Date.now()}`, name: "", status: "협의중", totalRevenue: 0, mainProductIds: [] });
  const [b, setB] = useState<B2BAccount>(blank);
  if (!can(role, "edit_master")) return <NeedRole perm="거래처 입력" />;
  return (
    <div className="grid gap-6 @4xl:grid-cols-2">
      <DataCard title={b.id.startsWith("new-") ? "새 거래처" : `수정 — ${b.name}`}>
        <div className="grid gap-3 @xl:grid-cols-2">
          <div><label className="field-label" htmlFor="b-name">거래처명</label><input id="b-name" className="field" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="b-status">상태</label><select id="b-status" className="field" value={b.status} onChange={(e) => setB({ ...b, status: e.target.value as B2BAccount["status"] })}>{["거래중", "협의중", "휴면"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="field-label" htmlFor="b-last">최근 거래일</label><input id="b-last" type="date" className="field" value={b.lastOrderAt ?? ""} onChange={(e) => setB({ ...b, lastOrderAt: e.target.value || null })} /></div>
          <div><label className="field-label" htmlFor="b-next">다음 납품일</label><input id="b-next" type="date" className="field" value={b.nextDelivery ?? ""} onChange={(e) => setB({ ...b, nextDelivery: e.target.value || null })} /></div>
          <div><label className="field-label" htmlFor="b-rev">누적 매출 (원)</label><input id="b-rev" className="field tabular" inputMode="numeric" value={b.totalRevenue || ""} onChange={(e) => setB({ ...b, totalRevenue: Number(e.target.value) || 0 })} /></div>
          <div><label className="field-label" htmlFor="b-note">비고</label><input id="b-note" className="field" value={b.note ?? ""} onChange={(e) => setB({ ...b, note: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" disabled={busy || !b.name.trim()} onClick={async () => { if (await save("거래처를 저장했습니다", (s) => s.upsertB2B({ ...b, name: b.name.trim() }))) setB(blank()); }}>저장</button>
          {!b.id.startsWith("new-") && <button className="btn-secondary" onClick={() => setB(blank())}>새로 입력</button>}
        </div>
      </DataCard>
      <DataCard title={`거래처 (${m.snapshot.b2b.length})`}>
        <ul className="space-y-1.5">{m.snapshot.b2b.map((x) => <li key={x.id}><button onClick={() => setB(x)} className="row-hover flex w-full justify-between rounded-xl border px-3 py-2.5 text-[0.92rem]" style={{ borderColor: "var(--border)" }}><span className="font-semibold">{x.name}</span><span className="text-ink-soft">{x.status}</span></button></li>)}</ul>
      </DataCard>
    </div>
  );
}
