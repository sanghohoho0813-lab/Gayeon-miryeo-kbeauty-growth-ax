"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import type { SkinConcern } from "@/lib/types";

const SORTS = ["추천순", "신제품순", "낮은 가격순", "높은 가격순"] as const;
type Sort = (typeof SORTS)[number];
const SORT_PARAM: Record<Sort, string | null> = { 추천순: null, 신제품순: "new", "낮은 가격순": "price_asc", "높은 가격순": "price_desc" };

/* 제품 목록 — 커머스형 (PASS 26, D-082): 검색 → 고민·종류 칩(옆으로 넘김) → 개수·정렬 → 2열(모바일)·4열(PC) 격자.
   ?concern= · ?category= · ?best=1 · ?sort= · ?q= · ?focus=search(검색칸에 바로 커서)
   PASS 35 (D-131): 고른 조건을 주소에 적어 둔다 — 제품을 보고 '뒤로' 오면 조건이 그대로. 위에 붙는 것은 검색 줄만(필터 줄은 함께 내려감),
   필터 줄이 화면 밖이면 검색 줄 옆 '필터' 버튼(적용 개수)으로 바로 돌아간다 */
function ProductsInner() {
  const searchParams = useSearchParams();
  const initialConcern = searchParams.get("concern") as SkinConcern | null;
  const initialCategory = searchParams.get("category");
  const focusSearch = searchParams.get("focus") === "search";
  const initialSort = (Object.keys(SORT_PARAM) as Sort[]).find((k) => SORT_PARAM[k] && SORT_PARAM[k] === searchParams.get("sort")) ?? "추천순";
  const [bestOnly, setBestOnly] = useState(searchParams.get("best") === "1");

  const [concern, setConcern] = useState<SkinConcern | "전체">(initialConcern ?? "전체");
  const [category, setCategory] = useState(initialCategory ?? "전체");
  const [sort, setSort] = useState<Sort>(initialSort);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusSearch) searchRef.current?.focus(); }, [focusSearch]);

  const { products } = useBeautyData();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  // 조건 → 주소 (기록을 새로 쌓지 않고 바꿈 — '뒤로'는 이전 화면으로)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (concern !== "전체") sp.set("concern", concern);
    if (category !== "전체") sp.set("category", category);
    if (bestOnly) sp.set("best", "1");
    const sv = SORT_PARAM[sort]; if (sv) sp.set("sort", sv);
    if (q.trim()) sp.set("q", q.trim());
    const next = `${window.location.pathname}${sp.size ? `?${sp.toString()}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [concern, category, bestOnly, sort, q]);

  // 필터 줄이 화면 밖인지 (위에 붙은 검색 줄 아래로 지나가면 '필터' 버튼을 보임)
  const railsRef = useRef<HTMLDivElement>(null);
  const [railsAway, setRailsAway] = useState(false);
  useEffect(() => {
    const el = railsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setRailsAway(!e.isIntersecting && e.boundingClientRect.top < 140), { rootMargin: "-140px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const activeCount = Number(concern !== "전체") + Number(category !== "전체") + Number(bestOnly);
  const backToFilters = () => {
    const el = railsRef.current; if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 150), behavior: reduce ? "auto" : "smooth" });
    el.querySelector<HTMLElement>("button[aria-pressed='true']")?.focus({ preventScroll: true });
  };
  const categories = ["전체", ...Array.from(new Set(products.map((p) => p.category)))];

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let result = products.filter(
      (p) =>
        (concern === "전체" || p.concerns.includes(concern)) &&
        (category === "전체" || p.category === category) &&
        (!bestOnly || !!p.isBest) &&
        (!query || `${p.name} ${p.category} ${p.line ?? ""} ${p.concerns.join(" ")}`.toLowerCase().includes(query))
    );
    switch (sort) {
      case "높은 가격순":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "신제품순":
        result = [...result].sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
        break;
      case "낮은 가격순":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      default:
        result = [...result].sort(
          (a, b) => Number(b.isBest ?? false) - Number(a.isBest ?? false) || Number(b.isNew ?? false) - Number(a.isNew ?? false)
        );
    }
    return result;
  }, [products, concern, category, sort, q, bestOnly]);
  const filtered = concern !== "전체" || category !== "전체" || q.trim() !== "" || bestOnly;

  return (
    <div className="pt-4 @3xl:pt-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="b-display text-[1.5rem] @3xl:text-[2rem]">MIRYEO 제품</h1>
        <Link href="/beauty/finder" className="inline-flex min-h-[40px] items-center gap-1 text-[0.86rem] font-bold" style={{ color: "var(--b-rose-ink)" }}><Sparkles size={15} aria-hidden /> 1분 상담으로 추천받기</Link>
      </div>

      {/* 위에 붙는 검색 줄 (필터 줄이 지나가면 '필터' 버튼) */}
      <div className="sticky top-[58px] z-20 -mx-4 mt-3 flex items-center gap-2 bg-white/95 px-4 pb-2 pt-2 backdrop-blur md:top-[72px] md:-mx-6 md:px-6" data-testid="product-search-bar">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search size={18} className="absolute left-4" style={{ color: "var(--b-text)" }} aria-hidden />
          <input ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제품명, 고민(수분·진정…), 종류로 검색" aria-label="제품 검색"
            className="h-[48px] w-full rounded-2xl pl-11 pr-4 text-[0.95rem] outline-none focus:ring-2" style={{ background: "var(--b-soft)", ["--tw-ring-color" as string]: "color-mix(in srgb, var(--b-rose-ink) 35%, transparent)" }} />
        </label>
        {railsAway && (
          <button type="button" onClick={backToFilters} className="relative flex h-[48px] shrink-0 items-center gap-1.5 rounded-2xl border bg-white px-3.5 text-[0.88rem] font-bold" style={{ borderColor: "var(--b-line-strong)" }} aria-label={`고민·종류 필터로 이동${activeCount ? ` (${activeCount}개 적용)` : ""}`} data-testid="filter-jump">
            <SlidersHorizontal size={17} aria-hidden /> 필터
            {activeCount > 0 && <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.72rem] text-white" style={{ background: "var(--b-rose-ink)" }} aria-hidden>{activeCount}</span>}
          </button>
        )}
      </div>
      <div ref={railsRef} data-testid="product-filters">
        {/* 피부 고민 */}
        <div className="b-rail mt-2.5 !gap-2 !pb-1" role="group" aria-label="피부 고민 필터">
          <FilterChip label="전체 고민" on={concern === "전체"} onClick={() => setConcern("전체")} />
          {CONCERNS.map((c) => (
            <FilterChip key={c.id} label={c.label} on={concern === c.id} onClick={() => setConcern(c.id)} icon={<c.icon size={15} aria-hidden />} />
          ))}
        </div>
        {/* 제품 종류 */}
        <div className="b-rail mt-1 !gap-2 !pb-1" role="group" aria-label="제품 종류 필터">
          <FilterChip label="BEST만" small on={bestOnly} onClick={() => setBestOnly((v) => !v)} />
          {categories.map((c) => (
            <FilterChip key={c} label={c === "전체" ? "전체 종류" : c} small on={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[0.9rem] font-bold">
          총 <span className="tabular" style={{ color: "var(--b-rose-ink)" }}>{list.length}</span>개
          {filtered && <button onClick={() => { setConcern("전체"); setCategory("전체"); setQ(""); setBestOnly(false); }} className="ml-2 inline-flex min-h-[36px] items-center gap-0.5 text-[0.8rem] font-semibold" style={{ color: "var(--b-text-soft)" }}><X size={14} aria-hidden /> 필터 해제</button>}
        </p>
        <label className="flex items-center gap-2 text-[0.84rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
          <span className="sr-only">정렬</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-full border bg-white px-3 text-[0.86rem] font-bold" style={{ borderColor: "var(--b-line-strong)", color: "var(--b-text)" }}>
            {SORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 @xl:grid-cols-3 @3xl:grid-cols-4 @3xl:gap-x-5 @3xl:gap-y-9">
        {list.map((p) => <BeautyProductCard key={p.id} product={p} />)}
      </div>
      {list.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-bold">조건에 맞는 제품이 없습니다</p>
          <p className="b-caption mt-1">필터를 조정하거나 1분 상담으로 추천을 받아보세요.</p>
        </div>
      )}
    </div>
  );
}

export default function BeautyProductsPage() {
  return (
    <Suspense>
      <ProductsInner />
    </Suspense>
  );
}

function FilterChip({ label, on, onClick, small = false, icon }: { label: string; on: boolean; onClick: () => void; small?: boolean; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`b-chip ${small ? "!min-h-[36px] !px-3.5 !text-[0.82rem]" : ""}`} style={on ? undefined : small ? { background: "#fff", border: "1px solid var(--b-line-strong)" } : undefined}>
      {icon}{label}
    </button>
  );
}
