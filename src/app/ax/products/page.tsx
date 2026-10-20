"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, X } from "lucide-react";
import { useNarrow } from "@/lib/use-narrow";
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
import { Fold } from "@/components/ax/InfoTip";
import { CoverBarFor, ScenarioButton } from "@/components/ax/ProductionPlanner";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW, formatPct, formatPrice, productInsight, type ProductMetrics } from "@/lib/analytics";
import { formatDateKR } from "@/lib/date";
import { matchesQuery } from "@/lib/search";
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
  // 빠른 이동(?p=상품ID) → 해당 상품 상세를 바로 연다
  const mm = useModel();
  const pid = params.get("p");
  useEffect(() => {
    const p = pid ? mm.snapshot.products.find((x) => x.id === pid) : undefined;
    if (p) setSelected(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);
  const closeDrawer = () => { setSelected(null); if (pid) router.replace(`/ax/products?tab=${tab}`, { scroll: false }); };
  return (
    <div>
      <PageHeader title="상품·재고·생산" description="SKU별 판매·재고·OEM 생산 흐름을 확인하고 재고를 바로 갱신합니다. 신규 입력·CSV는 데이터 관리에서 합니다." actions={<><AiReadyButton spec={AI_SPECS.inventory} /><DataFreshness /></>} />
      <Tabs tabs={TABS} value={tab} onChange={(t) => router.replace(`/ax/products?tab=${t}`, { scroll: false })} />
      {tab === "products" && <ProductsTab onSelect={setSelected} />}
      {tab === "inventory" && <InventoryTab onSelect={setSelected} />}
      {tab === "production" && <ProductionTab />}
      <ProductDrawer product={selected} onClose={closeDrawer} />
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense><Inner /></Suspense>;
}

/* 상품 목록 — 검색(이름·SKU·초성)·정렬 (PASS 30, D-097). 정렬은 이 브라우저에 기억, 검색어는 화면을 떠나면 지움 */
type SortKey = "default" | "units" | "growth" | "stock" | "margin" | "price" | "cost" | "name";
const SORTS: { key: SortKey; label: string; dir: 1 | -1; fin?: boolean }[] = [
  { key: "default", label: "기본 순서", dir: 1 },
  { key: "units", label: "4주 판매 많은 순", dir: -1 },
  { key: "growth", label: "판매 증가율 높은 순", dir: -1 },
  { key: "stock", label: "재고 적은 순", dir: 1 },
  { key: "margin", label: "마진율 높은 순", dir: -1, fin: true },
  { key: "price", label: "판매가 높은 순", dir: -1 },
  { key: "name", label: "이름 순", dir: 1 },
];
const SORT_KEY = "miryeo-products-sort";

function ProductsTab({ onSelect }: { onSelect: (p: Product) => void }) {
  const m = useModel();
  const { role } = useSession();
  const fin = can(role, "view_financials");
  const [category, setCategory] = useState("전체");
  const [q, setQ] = useState("");
  const [sort, setSortState] = useState<{ key: SortKey; dir: 1 | -1 }>(() => {
    try { const v = JSON.parse(localStorage.getItem(SORT_KEY) ?? "null"); if (v && SORTS.some((x) => x.key === v.key) && (v.dir === 1 || v.dir === -1)) return v; } catch { /* 기본값 */ }
    return { key: "default", dir: 1 };
  });
  const setSort = (v: { key: SortKey; dir: 1 | -1 }) => { setSortState(v); try { localStorage.setItem(SORT_KEY, JSON.stringify(v)); } catch { /* 저장 안 돼도 동작 */ } };
  const narrow = useNarrow();
  const products = m.snapshot.products;
  if (products.length === 0) return <EmptyState title="상품이 없습니다" action={<Link href="/ax/data" className="btn-primary">상품 등록</Link>} />;
  const categories = ["전체", ...Array.from(new Set(products.map((p) => p.category)))];
  const key = sort.key === "margin" && !fin ? "default" : sort.key; // 재무 권한 없으면 마진 정렬 무시
  const val = (p: Product): number | string => {
    const mm = m.metrics.get(p.id)!;
    switch (key) {
      case "units": return mm.recent4wUnits;
      case "growth": return mm.prev4wUnits > 0 ? mm.growthRate : -Infinity; // 이전 판매 없는 신규는 맨 뒤
      case "stock": return mm.currentStock;
      case "margin": return mm.marginRate ?? -Infinity;
      case "price": return p.price;
      case "cost": return p.cost ?? -Infinity;
      case "name": return p.name;
      default: return 0;
    }
  };
  const filtered = products.filter((p) => (category === "전체" || p.category === category) && matchesQuery(q, p.name, p.sku, p.category, p.line));
  const list = key === "default" ? filtered : [...filtered].sort((a, b) => {
    const x = val(a), y = val(b);
    const c = typeof x === "string" ? x.localeCompare(String(y), "ko") : (x as number) - (y as number);
    return c * sort.dir || a.name.localeCompare(b.name, "ko");
  });
  // 표 머리 누르기: 같은 열이면 방향 바꾸기, 다른 열이면 그 열의 기본 방향
  const header = (k: SortKey, label: string) => {
    const active = key === k;
    const def = SORTS.find((x) => x.key === k)?.dir ?? (k === "cost" ? -1 : 1);
    return (
      <th className="py-1.5 pr-2 font-semibold" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button type="button" className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 -mx-2 hover:bg-surface-muted hover:text-ink" style={active ? { color: "var(--text-primary)" } : undefined} onClick={() => setSort(active ? { key: k, dir: sort.dir === 1 ? -1 : 1 } : { key: k, dir: def })} data-sort={k}>
          {label}
          {active ? (sort.dir === 1 ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />) : <ArrowUpDown size={13} className="opacity-40" aria-hidden />}
        </button>
      </th>
    );
  };
  const growth = (mm: ProductMetrics) => <b className="font-semibold" style={{ color: mm.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>{formatPct(mm.growthRate)}</b>;
  const demo = (p: Product) => p.isDemo && <span className="badge !px-1.5 !py-0 align-middle text-[0.68rem]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO</span>;
  const filteredOut = q || category !== "전체";
  return (
    <DataCard title={<>상품 목록 <span className="tabular text-ink-soft">({filteredOut ? `${list.length} / ${products.length}` : products.length})</span></>}>
      <div className="mb-3 flex flex-col gap-2 @xl:flex-row @xl:items-center" data-testid="product-toolbar">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">상품 검색</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input type="search" className="field !min-h-[42px] !pl-9 !pr-9" placeholder="이름·상품코드 검색 (초성 가능: ㅇㅍ)" value={q} onChange={(e) => setQ(e.target.value)} data-testid="product-search" enterKeyHint="search" />
          {q && <button type="button" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted" onClick={() => setQ("")} aria-label="검색어 지우기"><X size={15} aria-hidden /></button>}
        </label>
        <div className="flex gap-2">
          <select className="field !min-h-[42px] min-w-0 flex-1 @xl:!w-auto @xl:flex-none" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="카테고리">
            {categories.map((c) => <option key={c} value={c}>{c === "전체" ? "카테고리 전체" : c}</option>)}
          </select>
          <select className="field !min-h-[42px] min-w-0 flex-1 @xl:!w-auto @xl:flex-none" value={SORTS.some((x) => x.key === key) ? key : "default"} onChange={(e) => { const s2 = SORTS.find((x) => x.key === e.target.value)!; setSort({ key: s2.key, dir: s2.dir }); }} aria-label="정렬" data-testid="product-sort">
            {SORTS.filter((x) => !x.fin || fin).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[0.92rem]" data-testid="product-empty-search">
          <p className="font-semibold">{q ? <>&lsquo;{q}&rsquo;에 맞는 상품이 없습니다</> : "이 카테고리에 상품이 없습니다"}</p>
          <button type="button" className="btn-secondary mt-3 !min-h-[40px] text-[0.86rem]" onClick={() => { setQ(""); setCategory("전체"); }}>검색·카테고리 지우기</button>
        </div>
      ) : narrow ? (
        // 모바일: 표 대신 상품 카드 (PASS 13) → 판매가는 이름 줄 오른쪽(쇼핑 목록처럼), 숫자는 두 줄(마진·재고 / 4주 판매·상태), 공개는 기본이라 비공개만 표시 (PASS 30)
        <ul className="space-y-2" data-testid="product-cards">
          {list.map((p) => {
            const mm = m.metrics.get(p.id)!;
            return (
              <li key={p.id}>
                <button onClick={() => onSelect(p)} className="row-hover flex w-full items-start gap-2.5 rounded-xl border p-3 text-left" style={{ borderColor: "var(--border)" }} data-product-card={p.sku}>
                  <span className="h-14 w-11 shrink-0 rounded-lg bg-surface-muted p-1" aria-hidden><ProductVisual category={p.category} variant={p.id.length} productId={p.id} className="h-full" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 leading-snug"><span className="font-semibold">{p.name}</span> {demo(p)}</span>
                      <span className="tabular shrink-0 text-[0.9rem] font-bold">{formatPrice(p.price)}</span>
                    </span>
                    <span className="block truncate text-[0.78rem] text-ink-soft">{p.sku} · {p.category}</span>
                    <span className="tabular mt-1 block text-[0.82rem]">
                      {fin && <><span className="text-ink-soft">마진 </span>{mm.marginRate != null ? `${Math.round(mm.marginRate * 100)}%` : "-"}<span className="text-ink-soft"> · </span></>}<span className="text-ink-soft">재고 </span>{mm.currentStock.toLocaleString()}
                    </span>
                    <span className="tabular mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.82rem]">
                      <span><span className="text-ink-soft">4주 판매 </span>{mm.recent4wUnits.toLocaleString()} {growth(mm)}</span>
                      <StatusBadge tone={saleStatusTone(p.status)}>{p.status}</StatusBadge>
                      {!p.isPublished && <StatusBadge tone="neutral">비공개</StatusBadge>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
      <div tabIndex={0} className="table-scroll">
        <table className="text-[0.93rem]">
          <thead>
            <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
              {header("name", "제품")}<th className="py-2.5 pr-4 font-semibold">카테고리</th>{header("price", "판매가")}
              {fin && <>{header("cost", "원가")}{header("margin", "마진율")}</>}
              {header("stock", "재고")}{header("units", "4주 판매")}<th className="py-2.5 pr-4 font-semibold">상태</th><th className="py-2.5 font-semibold">고객 노출</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const mm = m.metrics.get(p.id)!;
              return (
                <tr key={p.id} className="row-hover cursor-pointer border-b" style={{ borderColor: "var(--border)" }} onClick={() => onSelect(p)}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-9 shrink-0 rounded-lg bg-surface-muted p-1"><ProductVisual category={p.category} variant={p.id.length} productId={p.id} className="h-full" /></div>
                      {/* 키보드로도 상세를 열 수 있게 이름을 버튼으로 (행 클릭은 마우스용 — PASS 30) */}
                      <div><button type="button" className="text-left font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); onSelect(p); }}>{p.name}</button> {demo(p)}<div className="text-[0.78rem] text-ink-soft">{p.sku}</div></div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">{p.category}</td>
                  <td className="tabular py-3 pr-4">{formatPrice(p.price)}</td>
                  {fin && <><td className="tabular py-3 pr-4 text-ink-soft">{p.cost != null ? formatPrice(p.cost) : "미입력"}</td><td className="tabular py-3 pr-4 font-semibold">{mm.marginRate != null ? `${Math.round(mm.marginRate * 100)}%` : "-"}</td></>}
                  <td className="tabular py-3 pr-4">{mm.currentStock.toLocaleString()}</td>
                  <td className="tabular py-3 pr-4">{mm.recent4wUnits.toLocaleString()} {growth(mm)}</td>
                  <td className="py-3 pr-4"><StatusBadge tone={saleStatusTone(p.status)}>{p.status}</StatusBadge></td>
                  <td className="py-3">{p.isPublished ? <StatusBadge tone="success">공개</StatusBadge> : <StatusBadge tone="neutral">비공개</StatusBadge>}</td>
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
  const narrow = useNarrow();
  const openEdit = (p: Product, inv?: Inventory) => setEdit({ product: p, inv: inv ?? { productId: p.id, currentStock: 0, safetyStock: 0, incomingStock: 0 } });

  return (
    <>
      <DataCard title="재고 현황" action={
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className="pressable min-h-[40px] rounded-xl border px-3 text-[0.86rem] font-semibold" style={status === s ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>{s}</button>
          ))}
        </div>
      }>
        {narrow ? (
          <ul className="space-y-2.5" data-testid="inventory-cards">
            {rows.map(({ p, mm, inv }) => (
              <li key={p.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} data-inv-card={p.sku}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onSelect(p)} className="min-w-0 text-left"><span className="block font-semibold leading-snug">{p.name}</span><span className="block text-[0.78rem] text-ink-soft">{p.sku}</span></button>
                  <StatusBadge tone={stockStatusTone(mm.stockStatus)}>{mm.stockStatus}</StatusBadge>
                </div>
                <dl className="tabular mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.88rem]">
                  <div><dt className="text-[0.76rem] text-ink-soft">현재 재고</dt><dd className="font-semibold">{inv ? `${inv.currentStock.toLocaleString()}개` : "미입력"}</dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">예상 소진</dt><dd className="font-semibold">{Number.isFinite(mm.daysOfStock) && inv ? `약 ${Math.round(mm.daysOfStock)}일` : "-"}</dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">일 판매속도</dt><dd>{mm.dailyVelocity.toFixed(1)}개/일</dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">입고 예정</dt><dd>{inv?.incomingStock ? `${inv.incomingStock.toLocaleString()}개` : "-"}</dd></div>
                  <div data-deadline={p.sku}><dt className="text-[0.76rem] text-ink-soft">생산 착수</dt><dd><DeadlineBadge mm={mm} /></dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">추천 생산량</dt><dd className="font-semibold">{mm.recommendedOrder > 0 ? `${mm.recommendedOrder.toLocaleString()}개` : "불필요"}</dd></div>
                </dl>
                {canEdit && <button className="btn-secondary mt-2.5 !min-h-[40px] w-full text-[0.86rem]" onClick={() => openEdit(p, inv)} aria-label={`${p.name} 재고 수정`}><Pencil size={15} aria-hidden /> 재고 수정</button>}
              </li>
            ))}
          </ul>
        ) : (
        <div tabIndex={0} className="table-scroll">
          <table className="text-[0.93rem]">
            <thead>
              <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-2.5 pr-4 font-semibold">제품</th><th className="py-2.5 pr-4 font-semibold">현재 재고</th><th className="py-2.5 pr-4 font-semibold">일 판매속도</th><th className="py-2.5 pr-4 font-semibold">예상 소진일</th><th className="py-2.5 pr-4 font-semibold">입고 예정</th><th className="py-2.5 pr-4 font-semibold">생산 착수</th><th className="py-2.5 pr-4 font-semibold">추천 발주/생산량</th><th className="py-2.5 pr-4 font-semibold">상태</th><th className="py-2.5 font-semibold">수정</th>
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
                  <td className="py-3 pr-4" data-deadline={p.sku}><DeadlineBadge mm={mm} /></td>
                  <td className="tabular py-3 pr-4 font-semibold">{mm.recommendedOrder > 0 ? `${mm.recommendedOrder.toLocaleString()}개` : "불필요"}<div className="text-[0.72rem] font-normal text-ink-soft">{mm.planBasis}</div></td>
                  <td className="py-3 pr-4"><StatusBadge tone={stockStatusTone(mm.stockStatus)}>{mm.stockStatus}</StatusBadge></td>
                  <td className="py-3">
                    {canEdit && (
                      <button className="btn-ghost !min-h-[38px] !px-2.5 text-[0.85rem]" onClick={() => openEdit(p, inv)} aria-label={`${p.name} 재고 수정`}>
                        <Pencil size={15} aria-hidden /> 수정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <Fold summary="계산 방식" className="mt-2" testId="inventory-formula"><p className="text-[0.8rem] text-ink-soft">
          생산기간 입력 상품: 추천 생산량 = 예측 일판매 × (생산기간 + 안전 {m.planning.safetyDays}일 + 입고 후 {m.planning.coverDays}일) − (현재 + 입고 예정), 최소 생산수량 이상·{m.planning.roundTo}개 단위 · 착수 마감 = 가용 재고가 생산기간 + 안전일수보다 먼저 바닥나기 전 날.
          미입력 상품: 6주 예상 판매 − 현재 − 입고 예정. 예측 일판매 = 최근 4주 판매속도 × 추세 보정. (RULE, 사람 승인 필요)
        </p></Fold>
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

/** 생산 착수 마감 배지 — 생산기간이 있는 상품만 */
function DeadlineBadge({ mm }: { mm: ProductMetrics }) {
  if (mm.leadTimeDays == null) return <span className="text-[0.8rem] text-ink-soft">생산기간 미입력</span>;
  if (mm.daysToDeadline == null || !mm.orderDeadline) return <span className="text-[0.8rem] text-ink-soft">판매·재고 부족으로 계산 불가</span>;
  const d = mm.daysToDeadline;
  return (
    <span className="whitespace-nowrap">
      <StatusBadge tone={d <= 0 ? "danger" : d <= 14 ? "warning" : "neutral"}>{d <= 0 ? "마감 지남" : `D-${d}`}</StatusBadge>
      <span className="ml-1 block text-[0.72rem] text-ink-soft tabular">{formatDateKR(mm.orderDeadline)}</span>
    </span>
  );
}

/* 생산 착수 일정 — OEM 생산기간을 반영한 마감일 순 (계약 별지 제1호 ②) */
function ProductionSchedule() {
  const m = useModel();
  const rows = m.snapshot.products
    .map((p) => ({ p, mm: m.metrics.get(p.id)!, active: m.snapshot.production.filter((x) => x.productId === p.id && (x.status === "생산중" || x.status === "입고예정" || x.status === "계획")) }))
    .filter((x) => x.mm && x.mm.leadTimeDays != null && x.mm.daysToDeadline != null)
    .sort((a, b) => a.mm.daysToDeadline! - b.mm.daysToDeadline!);
  const missing = m.snapshot.products.filter((p) => p.leadTimeDays == null);
  const narrow = useNarrow();
  const activeText = (active: typeof rows[number]["active"], mm: ProductMetrics) => (
    <>
      {active.length ? active.map((x) => `${x.status} ${x.quantity.toLocaleString()}개`).join(", ") : <span className="text-ink-soft">없음</span>}
      {active.some((x) => x.status !== "계획") && (mm.daysToDeadline ?? 1) <= 0 && <span className="block text-[0.74rem]" style={{ color: "var(--warning)" }}>진행 중 수량이 재고의 '입고 예정'에 들어갔는지 확인</span>}
    </>
  );
  return (
    <DataCard title="생산 착수 일정" className="mb-6"
      info={<>OEM 생산기간을 반영한 생산 시작 마감일입니다. 가용 재고(현재 + 입고 예정)가 버티는 기간이 생산기간 + 안전 {m.planning.safetyDays}일보다 짧아지기 전에 생산을 시작해야 품절 없이 입고됩니다. 마감이 가까운 순서이고, 막대는 두 기간을 같은 출발선(오늘)에서 비교한 것입니다. &lsquo;조건 바꿔 보기&rsquo;로 판매속도·추가 입고·생산기간을 바꿔 다시 계산해 볼 수 있습니다(저장 안 함).</>}
      action={<div className="flex flex-wrap items-center gap-2"><Link href="/ax/settings#planning" className="btn-ghost !min-h-[40px] !px-2.5 text-[0.84rem]" data-testid="planning-link">기준값: 안전 {m.planning.safetyDays}일·입고 후 {m.planning.coverDays}일·{m.planning.roundTo}개 단위</Link><Link href="/ax/data?tab=products" className="btn-secondary !min-h-[40px] text-[0.86rem]">생산기간 입력</Link></div>}>
      {rows.length === 0 ? <EmptyState title="생산기간이 입력된 상품이 없습니다" desc="상품별 OEM 생산기간(발주→입고 일수)을 입력하면 착수 마감일과 추천 생산량을 계산합니다." /> : narrow ? (
        <ul className="space-y-2.5" data-testid="production-schedule">
          {rows.map(({ p, mm, active }) => (
            <li key={p.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} data-schedule={p.sku}>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0"><span className="block font-semibold leading-snug">{p.name}</span><span className="block text-[0.76rem] text-ink-soft">{p.sku}</span></span>
                <DeadlineBadge mm={mm} />
              </div>
              <div className="mt-2"><CoverBarFor product={p} compact /></div>
              <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.88rem]">
                <div><dt className="text-[0.76rem] text-ink-soft">추천 생산량</dt><dd className="font-semibold">{mm.recommendedOrder > 0 ? `${mm.recommendedOrder.toLocaleString()}개` : "불필요"}</dd></div>
                <div><dt className="text-[0.76rem] text-ink-soft">가용 재고</dt><dd>{mm.availableStock.toLocaleString()}개 · 약 {Math.round(mm.availableStock / mm.forecastDaily)}일분</dd></div>
                <div><dt className="text-[0.76rem] text-ink-soft">생산기간 · 최소수량</dt><dd>{mm.leadTimeDays}일{p.moq ? ` · ${p.moq.toLocaleString()}개` : ""}</dd></div>
                <div><dt className="text-[0.76rem] text-ink-soft">예측 일판매</dt><dd>{mm.forecastDaily.toFixed(1)}개</dd></div>
              </dl>
              <div className="mt-2 text-[0.84rem]"><span className="text-[0.76rem] text-ink-soft">진행 중 생산 </span>{activeText(active, mm)}</div>
              <ScenarioButton product={p} className="mt-2.5 w-full" />
            </li>
          ))}
        </ul>
      ) : (
        <div tabIndex={0} className="table-scroll">
          <table className="text-[0.92rem]" data-testid="production-schedule">
            <thead>
              <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-2.5 pr-4 font-semibold">제품</th><th className="py-2.5 pr-4 font-semibold">착수 마감</th><th className="py-2.5 pr-4 font-semibold"><span className="sr-only">두 기간 비교: </span>재고 vs 생산+안전</th><th className="py-2.5 pr-4 font-semibold">생산기간 · 최소수량</th><th className="py-2.5 pr-4 font-semibold">가용 재고 · 일판매</th><th className="py-2.5 pr-4 font-semibold">추천 생산량</th><th className="py-2.5 font-semibold">진행 중 생산</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, mm, active }) => (
                <tr key={p.id} className="border-b" style={{ borderColor: "var(--border)" }} data-schedule={p.sku}>
                  <td className="py-3 pr-4"><div className="whitespace-nowrap font-semibold">{p.name}</div><div className="text-[0.76rem] text-ink-soft">{p.sku}</div></td>
                  <td className="py-3 pr-4"><DeadlineBadge mm={mm} /></td>
                  <td className="py-3 pr-4"><CoverBarFor product={p} compact /><ScenarioButton product={p} variant="link" /></td>
                  <td className="tabular py-3 pr-4">{mm.leadTimeDays}일{p.moq ? ` · ${p.moq.toLocaleString()}개` : ""}</td>
                  <td className="tabular py-3 pr-4 whitespace-nowrap">{mm.availableStock.toLocaleString()}개 <span className="text-[0.76rem] text-ink-soft">약 {Math.round(mm.availableStock / mm.forecastDaily)}일분</span><div className="text-[0.76rem] text-ink-soft">일 {mm.forecastDaily.toFixed(1)}개</div></td>
                  <td className="tabular py-3 pr-4 font-semibold">{mm.recommendedOrder > 0 ? `${mm.recommendedOrder.toLocaleString()}개` : "불필요"}</td>
                  <td className="py-3 text-[0.84rem]">{activeText(active, mm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Fold summary="입력·계산 안내" className="mt-2" testId="schedule-notes"><p className="text-[0.8rem] text-ink-soft">진행 중인 생산 수량은 재고 화면의 '입고 예정'에 입력해야 계산에 반영됩니다. 생산중·입고예정 계획이 있는 상품은 '생산 착수' Action을 만들지 않습니다. 착수 마감 = 재고가 버티는 기간 − (생산기간 + 안전 {m.planning.safetyDays}일), 소수점 버림.</p></Fold>
      {missing.length > 0 && <p className="mt-2 text-[0.84rem]" data-testid="leadtime-missing">생산기간 미입력 {missing.length}개: {missing.slice(0, 6).map((p) => p.name).join(", ")}{missing.length > 6 ? " 외" : ""} — 입력 전에는 6주 예측으로만 추천합니다.</p>}
    </DataCard>
  );
}

function ProductionTab() {
  const m = useModel();
  const plans = m.snapshot.production;
  const tone = (s: string) => (s === "생산중" ? "info" : s === "입고예정" ? "warning" : s === "완료" ? "success" : "neutral") as "info";
  const narrow = useNarrow();
  return (
    <>
    <ProductionSchedule />
    <DataCard title="OEM 생산 현황" action={<Link href="/ax/data?tab=production" className="btn-secondary !min-h-[40px] text-[0.86rem]">생산 계획 입력</Link>}>
      {plans.length === 0 ? <EmptyState title="생산 계획이 없습니다" /> : narrow ? (
        <ul className="space-y-2.5" data-testid="production-cards">
          {plans.map((pr) => {
            const p = m.productById.get(pr.productId);
            const mm = p ? m.metrics.get(p.id) : undefined;
            return (
              <li key={pr.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{p?.name ?? "-"}</span><StatusBadge tone={tone(pr.status)}>{pr.status}</StatusBadge></div>
                <div className="mt-0.5 text-[0.8rem] text-ink-soft">{pr.partner}</div>
                <dl className="tabular mt-2 grid grid-cols-3 gap-x-2 text-[0.86rem]">
                  <div><dt className="text-[0.74rem] text-ink-soft">수량</dt><dd>{pr.quantity.toLocaleString()}개</dd></div>
                  <div><dt className="text-[0.74rem] text-ink-soft">최근 생산</dt><dd>{formatDateKR(pr.lastProducedAt)}</dd></div>
                  <div><dt className="text-[0.74rem] text-ink-soft">입고 예정</dt><dd>{formatDateKR(pr.expectedArrival)}</dd></div>
                </dl>
                {mm && <div className="mt-2"><StatusBadge tone={stockStatusTone(mm.stockStatus)}>재고 {mm.stockStatus}</StatusBadge></div>}
              </li>
            );
          })}
        </ul>
      ) : (
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
    </>
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
        <div className="h-32 w-24 shrink-0 rounded-2xl bg-surface-muted p-3"><ProductVisual category={product.category} variant={product.id.length} productId={product.id} className="h-full" /></div>
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
          ["현재 재고", `${mm.currentStock.toLocaleString()}개`, `추천 ${mm.recommendedOrder.toLocaleString()}개 (${mm.planBasis})`],
          ["OEM 생산기간", product.leadTimeDays ? `${product.leadTimeDays}일` : "미입력", product.moq ? `최소 생산 ${product.moq.toLocaleString()}개` : ""],
          ["생산 착수 마감", mm.orderDeadline ? (mm.daysToDeadline! <= 0 ? "마감 지남" : `D-${mm.daysToDeadline}`) : "-", mm.orderDeadline ? formatDateKR(mm.orderDeadline) : product.leadTimeDays ? "판매·재고 부족" : "생산기간 입력 필요"],
          ["고객 관심 (7일)", interest ? `${interest.recentScore}점` : "-", interest?.growth != null ? formatPct(interest.growth) : ""],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[0.8rem] text-ink-soft">{l}</div>
            <div className="tabular mt-0.5 text-[1.2rem] font-bold">{v}</div>
            <div className="text-[0.8rem] text-ink-soft">{s}</div>
          </div>
        ))}
      </div>
      {product.leadTimeDays != null && (
        <div className="mt-5 rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }} data-testid="drawer-production">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><h3 className="text-[1rem] font-bold">생산 판단</h3><ScenarioButton product={product} /></div>
          <CoverBarFor product={product} />
        </div>
      )}
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
