"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import type { SkinConcern } from "@/lib/types";

const SORTS = ["추천순", "신제품순", "낮은 가격순", "높은 가격순"] as const;

/* 제품 목록 — 커머스형 (PASS 26, D-082): 위에 붙는 검색·필터(고민·종류 칩은 옆으로 넘김) → 개수·정렬 → 2열(모바일)·4열(PC) 격자.
   ?concern= · ?category= · ?focus=search(검색칸에 바로 커서) */
function ProductsInner() {
  const searchParams = useSearchParams();
  const initialConcern = searchParams.get("concern") as SkinConcern | null;
  const initialCategory = searchParams.get("category");
  const focusSearch = searchParams.get("focus") === "search";

  const [concern, setConcern] = useState<SkinConcern | "전체">(initialConcern ?? "전체");
  const [category, setCategory] = useState(initialCategory ?? "전체");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("추천순");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusSearch) searchRef.current?.focus(); }, [focusSearch]);

  const { products } = useBeautyData();
  const [q, setQ] = useState("");
  const categories = ["전체", ...Array.from(new Set(products.map((p) => p.category)))];

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let result = products.filter(
      (p) =>
        (concern === "전체" || p.concerns.includes(concern)) &&
        (category === "전체" || p.category === category) &&
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
  }, [products, concern, category, sort, q]);
  const filtered = concern !== "전체" || category !== "전체" || q.trim() !== "";

  return (
    <div className="pt-4 @3xl:pt-8">
      <div className="flex items-end justify-between gap-3">
        <h1 className="b-display text-[1.5rem] @3xl:text-[2rem]">MIRYEO 제품</h1>
        <Link href="/beauty/finder" className="inline-flex min-h-[40px] items-center gap-1 text-[0.86rem] font-bold" style={{ color: "var(--b-rose-ink)" }}><Sparkles size={15} aria-hidden /> 1분 상담으로 추천받기</Link>
      </div>

      {/* 위에 붙는 검색·필터 */}
      <div className="sticky top-[58px] z-20 -mx-4 mt-3 bg-white/95 px-4 pb-2 pt-2 backdrop-blur md:top-[72px] md:-mx-6 md:px-6" data-testid="product-filters">
        <label className="relative flex items-center">
          <Search size={18} className="absolute left-4" style={{ color: "var(--b-text)" }} aria-hidden />
          <input ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제품명, 고민(수분·진정…), 종류로 검색" aria-label="제품 검색"
            className="h-[48px] w-full rounded-2xl pl-11 pr-4 text-[0.95rem] outline-none focus:ring-2" style={{ background: "var(--b-soft)", ["--tw-ring-color" as string]: "color-mix(in srgb, var(--b-rose-ink) 35%, transparent)" }} />
        </label>
        {/* 피부 고민 */}
        <div className="b-rail mt-2.5 !gap-2 !pb-1" role="group" aria-label="피부 고민 필터">
          <FilterChip label="전체 고민" on={concern === "전체"} onClick={() => setConcern("전체")} />
          {CONCERNS.map((c) => (
            <FilterChip key={c.id} label={c.label} on={concern === c.id} onClick={() => setConcern(c.id)} icon={<c.icon size={15} aria-hidden />} />
          ))}
        </div>
        {/* 제품 종류 */}
        <div className="b-rail mt-1 !gap-2 !pb-1" role="group" aria-label="제품 종류 필터">
          {categories.map((c) => (
            <FilterChip key={c} label={c === "전체" ? "전체 종류" : c} small on={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[0.9rem] font-bold">
          총 <span className="tabular" style={{ color: "var(--b-rose-ink)" }}>{list.length}</span>개
          {filtered && <button onClick={() => { setConcern("전체"); setCategory("전체"); setQ(""); }} className="ml-2 inline-flex min-h-[36px] items-center gap-0.5 text-[0.8rem] font-semibold" style={{ color: "var(--b-text-soft)" }}><X size={14} aria-hidden /> 필터 해제</button>}
        </p>
        <label className="flex items-center gap-2 text-[0.84rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
          <span className="sr-only">정렬</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])} className="h-10 rounded-full border bg-white px-3 text-[0.86rem] font-bold" style={{ borderColor: "var(--b-line-strong)", color: "var(--b-text)" }}>
            {SORTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 @xl:grid-cols-3 @3xl:grid-cols-4 @3xl:gap-x-5 @3xl:gap-y-9">
        {list.map((p) => <BeautyProductCard key={p.id} product={p} aiBadge={p.isBest ? "AI 추천" : undefined} />)}
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
