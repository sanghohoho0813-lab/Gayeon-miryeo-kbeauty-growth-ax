"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { demoRepository } from "@/lib/repository";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import type { SkinConcern } from "@/lib/types";

const SORTS = ["추천순", "인기순", "신제품순", "낮은 가격순"] as const;

function ProductsInner() {
  const searchParams = useSearchParams();
  const initialConcern = searchParams.get("concern") as SkinConcern | null;

  const [concern, setConcern] = useState<SkinConcern | "전체">(initialConcern ?? "전체");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("추천순");

  const products = demoRepository.products;
  const categories = ["전체", ...Array.from(new Set(products.map((p) => p.category)))];

  const list = useMemo(() => {
    let result = products.filter(
      (p) =>
        (concern === "전체" || p.concerns.includes(concern)) &&
        (category === "전체" || p.category === category)
    );
    switch (sort) {
      case "인기순":
        result = [...result].sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "신제품순":
        result = [...result].sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
        break;
      case "낮은 가격순":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      default:
        result = [...result].sort(
          (a, b) => Number(b.isBest ?? false) - Number(a.isBest ?? false) || b.rating - a.rating
        );
    }
    return result;
  }, [products, concern, category, sort]);

  return (
    <div className="pt-8">
      <h1 className="font-display text-[1.7rem] font-bold md:text-[2rem]" style={{ color: "var(--b-navy)" }}>
        MIRYEO 제품
      </h1>
      <p className="mt-1.5 text-[0.95rem]" style={{ color: "var(--b-text-soft)" }}>
        피부 고민과 제품 유형으로 나에게 맞는 제품을 찾아보세요.
      </p>

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
            className="h-11 rounded-xl border bg-white px-3 text-[0.9rem] font-semibold"
            style={{ borderColor: "var(--b-border)", color: "var(--b-text)" }}
          >
            {SORTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      className={`rounded-full border-2 font-bold transition-colors ${small ? "px-3.5 py-2 text-[0.82rem]" : "px-4 py-2.5 text-[0.9rem]"}`}
      style={
        on
          ? { background: "var(--b-navy)", borderColor: "var(--b-navy)", color: "#fff" }
          : { borderColor: "var(--b-border)", color: "var(--b-text-soft)", background: "#fff" }
      }
    >
      {label}
    </button>
  );
}
