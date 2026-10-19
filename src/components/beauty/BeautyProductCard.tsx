"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getWishlist, toggleWishlist } from "@/lib/beauty-store";
import { track } from "@/lib/customer-events";
import { STEP_LABEL } from "./useBeautyMemory";

/* 제품 카드 — 커머스형 (PASS 26, D-082): 사진 타일(배지 1개 · 찜 동그라미) → 브랜드·종류 → 이름 2줄 → 맞는 고민 태그 → 가격.
   배지는 실제 값만(베스트·신제품·AI 추천·주목). 할인·별점·후기 표시는 없음(실제 데이터 없음). */
const BADGE_STYLE: Record<string, React.CSSProperties> = {
  default: { background: "var(--b-text)", color: "#fff" },
  신제품: { background: "var(--b-rose-ink)", color: "#fff" },
  NEW: { background: "var(--b-rose-ink)", color: "#fff" },
};

export function BeautyProductCard({ product, aiBadge, reason, compact = false }: { product: Product; aiBadge?: string; reason?: string; compact?: boolean }) {
  const [wished, setWished] = useState(false);
  useEffect(() => setWished(getWishlist().includes(product.id)), [product.id]);
  const badge = aiBadge ?? (product.isNew ? "신제품" : product.isBest ? "BEST" : undefined);
  const tags = reason ? [reason] : product.concerns.slice(0, 2).map((c) => `#${c}`);

  return (
    <div className={`group relative flex h-full flex-col ${compact ? "w-[148px] @3xl:w-[200px]" : ""}`}>
      <Link href={`/beauty/products/${product.id}`} className="block" tabIndex={-1} aria-hidden>
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[18px]" style={{ background: "var(--b-surface-warm)" }}>
          <div className="h-[80%] transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductVisual category={product.category} variant={product.id.length} productId={product.id} className="h-full" />
          </div>
          {badge && <span className="b-pill absolute left-2.5 top-2.5" style={BADGE_STYLE[badge] ?? BADGE_STYLE.default}>{badge}</span>}
        </div>
      </Link>
      <button
        aria-label={wished ? `${product.name} 찜 해제` : `${product.name} 찜하기`}
        aria-pressed={wished}
        onClick={() => {
          const next = toggleWishlist(product.id).includes(product.id);
          setWished(next);
          track(next ? "wishlist_add" : "wishlist_remove", product.id);
        }}
        className="pressable absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,.18)]">
          <Heart size={17} fill={wished ? "var(--b-rose)" : "none"} style={{ color: wished ? "var(--b-rose)" : "var(--b-text)" }} aria-hidden />
        </span>
      </button>
      <Link href={`/beauty/products/${product.id}`} className="flex flex-1 flex-col pt-2.5">
        <span className="truncate text-[0.72rem] font-semibold" style={{ color: "var(--b-text-soft)" }} title={product.routineStep ? `STEP ${product.routineStep} · ${STEP_LABEL[product.routineStep] ?? product.category}` : undefined}>MIRYEO · {product.category}</span>
        <h3 className="mt-0.5 line-clamp-2 text-[0.94rem] font-semibold leading-snug" style={{ color: "var(--b-text)" }}>{product.name}</h3>
        <p className="mt-1 line-clamp-1 text-[0.76rem] font-semibold" style={{ color: "var(--b-rose-ink)" }}>{tags.join(" ")}</p>
        <div className="mt-auto flex items-baseline gap-1.5 pt-1.5">
          <span className="tabular text-[1rem] font-extrabold" style={{ color: "var(--b-text)" }}>{product.price.toLocaleString()}<span className="ml-0.5 text-[0.82rem] font-bold">원</span></span>
          {product.isDemo && <span className="text-[0.68rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>Demo</span>}
        </div>
      </Link>
    </div>
  );
}
