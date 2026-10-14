"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { Search } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import type { SkinConcern } from "@/lib/types";

const SORTS = ["추천순", "신제품순", "낮은 가격순", "높은 가격순"] as const;

function ProductsInner() {
  const searchParams = useSearchParams();
  const initialConcern = searchParams.get("concern") as SkinConcern | null;

  const [concern, setConcern] = useState<SkinConcern | "전체">(initialConcern ?? "전체");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("추천순");

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

  return (
    <div className="pt-8 @3xl:pt-12">
      <p className="b-eyebrow">MIRYEO COLLECTION</p>
      <h1 className="b-display mt-3 text-[2rem] @3xl:text-[2.6rem]">MIRYEO 제품</h1>
      <p className="b-body mt-2">
        피부 고민과 제품 유형으로 나에게 맞는 제품을 찾아보세요.{" "}
        <Link href="/beauty/finder" className="b-link">1분 상담으로 루틴 추천받기</Link>
      </p>

      <label className="relative mt-6 flex items-center">
        <Search size={18} className="absolute left-1" style={{ color: "var(--b-text-soft)" }} aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제품명, 고민(수분·진정…), 유형으로 검색" aria-label="제품 검색" className="h-[52px] w-full border-b bg-transparent pl-8 pr-2 text-[0.97rem] outline-none focus:border-[var(--b-ink)]" style={{ borderColor: "var(--b-line-strong)" }} />
      </label>

      {/* 피부 고민 필터 */}
      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip label="전체" on={concern === "전체"} onClick={() => setConcern("전체")} />
        {CONCERNS.map((c) => (
          <FilterChip key={c.id} label={c.label} on={concern === c.id} onClick={() => setConcern(c.id)} />
        ))}
      </div>

      {/* 유형 + 정렬 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <FilterChip key={c} label={c} small on={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <label className="flex items-center gap-2 text-[0.88rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
          정렬
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
            className="h-11 rounded-full border bg-transparent px-3 text-[0.88rem] font-semibold"
            style={{ borderColor: "var(--b-line-strong)", color: "var(--b-text)" }}
          >
            {SORTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 @3xl:grid-cols-4 @3xl:gap-x-6">
        {list.map((p) => (
          <BeautyProductCard key={p.id} product={p} aiBadge={p.isBest ? "AI 추천" : undefined} />
        ))}
      </div>
      {list.length === 0 && (
        <p className="py-16 text-center" style={{ color: "var(--b-text-soft)" }}>
          조건에 맞는 제품이 없습니다. 필터를 조정해보세요.
        </p>
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

function FilterChip({
  label,
  on,
  onClick,
  small = false,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[40px] rounded-full border font-semibold transition-colors ${small ? "px-3.5 text-[0.8rem]" : "px-4 text-[0.88rem]"}`}
      style={
        on
          ? { background: "var(--b-ink)", borderColor: "var(--b-ink)", color: "#fff" }
          : { borderColor: "var(--b-line-strong)", color: "var(--b-text-soft)", background: "transparent" }
      }
    >
      {label}
    </button>
  );
}
