"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, InsightCard, StatusBadge, saleStatusTone, stockStatusTone } from "@/components/ax/Cards";
import { Drawer, Modal } from "@/components/ax/Modal";
import { WeeklyTrend } from "@/components/ax/TrendChart";
import { AiReadyButton, AI_SPECS } from "@/components/ax/AiReady";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { EmptyState } from "@/components/ax/States";
import { Tabs } from "@/components/ax/Tabs";
import { toast } from "@/components/ax/Toast";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW, formatPct, formatPrice, productInsight } from "@/lib/analytics";
import { formatDateKR } from "@/lib/date";
import type { Inventory, Product } from "@/lib/types";

const TABS = [
  { id: "products", label: "상품" },
  { id: "inventory", label: "재고" },
  { id: "production", label: "OEM 생산" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as TabId) || "products";
  const [selected, setSelected] = useState<Product | null>(null);
  return (
    <div>
      <PageHeader title="상품·재고·생산" description="SKU별 판매·재고·OEM 생산 흐름을 확인하고 재고를 바로 갱신합니다. 신규 입력·CSV는 데이터 관리에서 합니다." actions={<><AiReadyButton spec={AI_SPECS.inventory} /><DataFreshness /></>} />
      <Tabs tabs={TABS} value={tab} onChange={(t) => router.replace(`/ax/products?tab=${t}`, { scroll: false })} />
      {tab === "products" && <ProductsTab onSelect={setSelected} />}
      {tab === "inventory" && <InventoryTab onSelect={setSelected} />}
      {tab === "production" && <ProductionTab />}
      <ProductDrawer product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense><Inner /></Suspense>;
}

function ProductsTab({ onSelect }: { onSelect: (p: Product) => void }) {
  const m = useModel();
  const { role } = useSession();
  const fin = can(role, "view_financials");
  const [category, setCategory] = useState("전체");
  const products = m.snapshot.products;
  if (products.length === 0) return <EmptyState title="상품이 없습니다" action={<Link href="/ax/data" className="btn-primary">상품 등록</Link>} />;
  const categories = ["전체", ...Array.from(new Set(products.map((p) => p.category)))];
  const list = products.filter((p) => category === "전체" || p.category === category);
  return (
    <DataCard title={`상품 목록 (${list.length})`} action={
      <select className="field !min-h-[42px] !w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="카테고리">
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
    }>
      <div tabIndex={0} className="table-scroll">
        <table className="text-[0.93rem]">
          <thead>
            <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
              <th className="py-2.5 pr-4 font-semibold">제품</th><th className="py-2.5 pr-4 font-semibold">카테고리</th><th className="py-2.5 pr-4 font-semibold">판매가</th>
              {fin && <><th className="py-2.5 pr-4 font-semibold">원가</th><th className="py-2.5 pr-4 font-semibold">마진율</th></>}
              <th className="py-2.5 pr-4 font-semibold">재고</th><th className="py-2.5 pr-4 font-semibold">4주 판매</th><th className="py-2.5 pr-4 font-semibold">상태</th><th className="py-2.5 font-semibold">고객 노출</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const mm = m.metrics.get(p.id)!;
              return (
                <tr key={p.id} className="row-hover cursor-pointer border-b" style={{ borderColor: "var(--border)" }} onClick={() => onSelect(p)}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-9 shrink-0 rounded-lg bg-surface-muted p-1"><ProductVisual category={p.category} variant={p.id.length} className="h-full" /></div>
                      <div><div className="font-semibold">{p.name} {p.isDemo && <span className="badge ml-1" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO</span>}</div><div className="text-[0.78rem] text-ink-soft">{p.sku}</div></div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">{p.category}</td>
                  <td className="tabular py-3 pr-4">{formatPrice(p.price)}</td>
                  {fin && <><td className="tabular py-3 pr-4 text-ink-soft">{p.cost != null ? formatPrice(p.cost) : "미입력"}</td><td className="tabular py-3 pr-4 font-semibold">{mm.marginRate != null ? `${Math.round(mm.marginRate * 100)}%` : "-"}</td></>}
                  <td className="tabular py-3 pr-4">{mm.currentStock.toLocaleString()}</td>
                  <td className="tabular py-3 pr-4">{mm.recent4wUnits.toLocaleString()} <span className="font-semibold" style={{ color: mm.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>{formatPct(mm.growthRate)}</span></td>
                  <td className="py-3 pr-4"><StatusBadge tone={saleStatusTone(p.status)}>{p.status}</StatusBadge></td>
                  <td className="py-3">{p.isPublished ? <StatusBadge tone="success">공개</StatusBadge> : <StatusBadge tone="neutral">비공개</StatusBadge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataCard>
  );
}

function InventoryTab({ onSelect }: { onSelect: (p: Product) => void }) {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const [status, setStatus] = useState("전체");
  const [edit, setEdit] = useState<{ product: Product; inv: Inventory } | null>(null);
  const statuses = ["전체", "품절위험", "부족주의", "안정", "과잉", "데이터 없음"];
  const rows = m.snapshot.products.map((p) => ({ p, mm: m.metrics.get(p.id)!, inv: m.snapshot.inventory.find((i) => i.productId === p.id) }))
    .filter((r) => status === "전체" || r.mm.stockStatus === status)
    .sort((a, b) => a.mm.daysOfStock - b.mm.daysOfStock);
  const canEdit = can(role, "edit_operational");

  return (
    <>
      <DataCard title="재고 현황" action={
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className="pressable min-h-[40px] rounded-xl border px-3 text-[0.86rem] font-semibold" style={status === s ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>{s}</button>
          ))}
        </div>
      }>
        <div tabIndex={0} className="table-scroll">
          <table className="text-[0.93rem]">
            <thead>
              <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-2.5 pr-4 font-semibold">제품</th><th className="py-2.5 pr-4 font-semibold">현재 재고</th><th className="py-2.5 pr-4 font-semibold">일 판매속도</th><th className="py-2.5 pr-4 font-semibold">예상 소진일</th><th className="py-2.5 pr-4 font-semibold">입고 예정</th><th className="py-2.5 pr-4 font-semibold">추천 발주/생산량</th><th className="py-2.5 pr-4 font-semibold">상태</th><th className="py-2.5 font-semibold">수정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, mm, inv }) => (
                <tr key={p.id} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="cursor-pointer py-3 pr-4" onClick={() => onSelect(p)}><div className="font-semibold">{p.name}</div><div className="text-[0.78rem] text-ink-soft">{p.sku}</div></td>
                  <td className="tabular py-3 pr-4">{inv ? `${inv.currentStock.toLocaleString()}개` : "미입력"}</td>
                  <td className="tabular py-3 pr-4">{mm.dailyVelocity.toFixed(1)}개/일</td>
                  <td className="tabular py-3 pr-4 font-semibold">{Number.isFinite(mm.daysOfStock) && inv ? `약 ${Math.round(mm.daysOfStock)}일` : "-"}</td>
                  <td className="tabular py-3 pr-4 text-ink-soft">{inv?.incomingStock ? `${inv.incomingStock.toLocaleString()}개 (${formatDateKR(inv.incomingDate)})` : "-"}</td>
                  <td className="tabular py-3 pr-4 font-semibold">{mm.recommendedOrder > 0 ? `${mm.recommendedOrder.toLocaleString()}개` : "불필요"}</td>
                  <td className="py-3 pr-4"><StatusBadge tone={stockStatusTone(mm.stockStatus)}>{mm.stockStatus}</StatusBadge></td>
                  <td className="py-3">
                    {canEdit && (
                      <button className="btn-ghost !min-h-[38px] !px-2.5 text-[0.85rem]" onClick={() => setEdit({ product: p, inv: inv ?? { productId: p.id, currentStock: 0, safetyStock: 0, incomingStock: 0 } })} aria-label={`${p.name} 재고 수정`}>
                        <Pencil size={15} aria-hidden /> 수정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.8rem] text-ink-soft">추천 발주량 = 6주 예상 판매(판매속도 × 42일 × 성장 보정) − 현재 재고 − 입고 예정 (RULE, 사람 승인 필요)</p>
      </DataCard>
      {edit && (
        <InventoryEditModal key={edit.product.id} product={edit.product} inv={edit.inv} onClose={() => setEdit(null)} onSave={async (next) => {
          try { await run((s) => s.upsertInventory(next)); toast("재고를 저장했습니다"); setEdit(null); } catch (e) { toast(e instanceof Error ? e.message : "저장 실패", "error"); }
        }} />
      )}
    </>
  );
}

function InventoryEditModal({ product, inv, onClose, onSave }: { product: Product; inv: Inventory; onClose: () => void; onSave: (i: Inventory) => void }) {
  const [v, setV] = useState({ currentStock: String(inv.currentStock), safetyStock: String(inv.safetyStock), incomingStock: String(inv.incomingStock), incomingDate: inv.incomingDate ?? "" });
  const nums = [v.currentStock, v.safetyStock, v.incomingStock].map(Number);
  const valid = nums.every((n) => Number.isInteger(n) && n >= 0);
  return (
    <Modal open onClose={onClose} title={`재고 수정 — ${product.name}`}>
      <div className="grid gap-3 @md:grid-cols-2">
        {([["currentStock", "현재 재고"], ["safetyStock", "안전 재고"], ["incomingStock", "입고 예정 수량"]] as const).map(([k, l]) => (
          <div key={k}><label className="field-label" htmlFor={k}>{l}</label><input id={k} className="field tabular" inputMode="numeric" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
        ))}
        <div><label className="field-label" htmlFor="inc-date">입고 예정일</label><input id="inc-date" type="date" className="field" value={v.incomingDate} onChange={(e) => setV({ ...v, incomingDate: e.target.value })} /></div>
      </div>
      {!valid && <p className="mt-2 text-[0.85rem]" style={{ color: "var(--danger)" }}>0 이상의 정수를 입력하세요.</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" disabled={!valid} onClick={() => onSave({ productId: product.id, currentStock: nums[0], safetyStock: nums[1], incomingStock: nums[2], incomingDate: v.incomingDate || null })}>저장</button>
      </div>
    </Modal>
  );
}

function ProductionTab() {
  const m = useModel();
  const plans = m.snapshot.production;
  const tone = (s: string) => (s === "생산중" ? "info" : s === "입고예정" ? "warning" : s === "완료" ? "success" : "neutral") as "info";
  return (
    <DataCard title="OEM 생산 현황" action={<Link href="/ax/data?tab=production" className="btn-secondary !min-h-[40px] text-[0.86rem]">생산 계획 입력</Link>}>
      {plans.length === 0 ? <EmptyState title="생산 계획이 없습니다" /> : (
        <div tabIndex={0} className="table-scroll">
          <table className="text-[0.93rem]">
            <thead>
              <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-2.5 pr-4 font-semibold">제품</th><th className="py-2.5 pr-4 font-semibold">OEM/ODM</th><th className="py-2.5 pr-4 font-semibold">최근 생산일</th><th className="py-2.5 pr-4 font-semibold">수량</th><th className="py-2.5 pr-4 font-semibold">입고 예정</th><th className="py-2.5 pr-4 font-semibold">상태</th><th className="py-2.5 font-semibold">재고 신호</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((pr) => {
                const p = m.productById.get(pr.productId);
                const mm = p ? m.metrics.get(p.id) : undefined;
                return (
                  <tr key={pr.id} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 pr-4 font-semibold">{p?.name ?? "-"}</td>
                    <td className="py-3 pr-4">{pr.partner}</td>
                    <td className="tabular py-3 pr-4">{formatDateKR(pr.lastProducedAt)}</td>
                    <td className="tabular py-3 pr-4">{pr.quantity.toLocaleString()}개</td>
                    <td className="tabular py-3 pr-4">{formatDateKR(pr.expectedArrival)}</td>
                    <td className="py-3 pr-4"><StatusBadge tone={tone(pr.status)}>{pr.status}</StatusBadge></td>
                    <td className="py-3">{mm ? <StatusBadge tone={stockStatusTone(mm.stockStatus)}>{mm.stockStatus}</StatusBadge> : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DataCard>
  );
}

function ProductDrawer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const m = useModel();
  const { role } = useSession();
  if (!product) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;
  const mm = m.metrics.get(product.id)!;
  const insight = productInsight(mm);
  const fin = can(role, "view_financials");
  const byChannel = m.snapshot.channels.map((c) => ({ c, units: m.snapshot.sales.filter((s) => s.productId === product.id && s.channelId === c.id).reduce((a, s) => a + s.units, 0) })).filter((x) => x.units > 0).sort((a, b) => b.units - a.units);
  const interest = m.customer.productInterest.find((p) => p.productId === product.id);
  return (
    <Drawer open onClose={onClose} title={product.name}>
      <div className="flex items-start gap-5">
        <div className="h-32 w-24 shrink-0 rounded-2xl bg-surface-muted p-3"><ProductVisual category={product.category} variant={product.id.length} className="h-full" /></div>
        <div className="space-y-1.5 text-[0.93rem]">
          <div className="flex flex-wrap gap-1.5"><StatusBadge tone={saleStatusTone(product.status)}>{product.status}</StatusBadge>{product.isDemo && <StatusBadge tone="warning">DEMO</StatusBadge>}</div>
          <div className="text-ink-soft">{product.sku} · {product.category}{product.line ? ` · ${product.line}` : ""}</div>
          <div className="tabular text-[1.2rem] font-bold">{formatPrice(product.price)}</div>
          {fin && <div className="text-ink-soft">원가 {product.cost != null ? formatPrice(product.cost) : "미입력"} · 마진 {mm.marginRate != null ? `${Math.round(mm.marginRate * 100)}%` : "-"}</div>}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          ["최근 4주 판매", `${mm.recent4wUnits.toLocaleString()}개`, formatPct(mm.growthRate) + " vs 이전 4주"],
          fin ? ["최근 4주 매출", formatKRW(mm.recent4wRevenue), `일 평균 ${mm.dailyVelocity.toFixed(1)}개`] : ["일 평균 판매", `${mm.dailyVelocity.toFixed(1)}개`, ""],
          ["현재 재고", `${mm.currentStock.toLocaleString()}개`, `추천 발주 ${mm.recommendedOrder.toLocaleString()}개`],
          ["고객 관심 (7일)", interest ? `${interest.recentScore}점` : "-", interest?.growth != null ? formatPct(interest.growth) : ""],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[0.8rem] text-ink-soft">{l}</div>
            <div className="tabular mt-0.5 text-[1.2rem] font-bold">{v}</div>
            <div className="text-[0.8rem] text-ink-soft">{s}</div>
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-[1rem] font-bold">판매 추세 (8주)</h3>
      <div className="mt-2"><WeeklyTrend weekly={mm.weekly} height={180} /></div>
      <h3 className="mt-5 text-[1rem] font-bold">채널별 판매 (최근 8주)</h3>
      <ul className="mt-2 space-y-2">
        {byChannel.length === 0 && <li className="text-[0.9rem] text-ink-soft">판매 데이터 없음</li>}
        {byChannel.map(({ c, units }) => <li key={c.id} className="flex justify-between rounded-xl bg-surface-muted px-4 py-2.5 text-[0.92rem]"><span>{c.name}</span><span className="tabular font-semibold">{units.toLocaleString()}개</span></li>)}
      </ul>
      <div className="mt-5"><InsightCard title="AI Product Insight" summary={insight.summary} evidence={insight.evidence} compact /></div>
    </Drawer>
  );
}
