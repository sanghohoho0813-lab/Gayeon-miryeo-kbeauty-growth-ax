"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getWishlist, toggleWishlist } from "@/lib/beauty-store";
import { track } from "@/lib/customer-events";
import { STEP_LABEL } from "./useBeautyMemory";

/* 제품 카드 (D-073) — 쇼핑몰 카드 느낌을 줄여 사진 타일 + 글자만.
   우선순위: 사진 → 이름 → 맞는 고민(또는 추천 이유) → 사용 단계 → 가격(작게). 배지는 1개만. */
export function BeautyProductCard({ product, aiBadge, reason }: { product: Product; aiBadge?: string; reason?: string }) {
  const [wished, setWished] = useState(false);
  useEffect(() => setWished(getWishlist().includes(product.id)), [product.id]);
  const badge = aiBadge ?? (product.isNew ? "신제품" : undefined);
  const match = reason ?? (product.concerns.length ? `${product.concerns.slice(0, 2).join(" · ")} 고민에 맞아요` : product.category);

  return (
    <div className="group relative flex h-full flex-col">
      <Link href={`/beauty/products/${product.id}`} className="block" tabIndex={-1} aria-hidden>
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[22px]" style={{ background: "var(--b-surface-warm)" }}>
          <div className="h-[74%] transition-transform duration-500 ease-out group-hover:scale-[1.03]">
            <ProductVisual category={product.category} variant={product.id.length} productId={product.id} className="h-full" />
          </div>
          {badge && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-wide" style={{ background: "rgba(255,255,255,0.86)", color: "var(--b-ink)" }}>{badge}</span>}
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
        className="pressable absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full"
      >
        <Heart size={19} fill={wished ? "var(--b-ink)" : "none"} style={{ color: "var(--b-ink)" }} aria-hidden />
      </button>
      <Link href={`/beauty/products/${product.id}`} className="flex flex-1 flex-col pt-3.5">
        <h3 className="text-[1rem] font-bold leading-snug" style={{ color: "var(--b-text)" }}>{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-[0.84rem] leading-snug" style={{ color: "var(--b-text-soft)" }}>{match}</p>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 pt-2.5">
          <span className="b-caption">{product.routineStep ? `STEP ${product.routineStep} · ${STEP_LABEL[product.routineStep] ?? product.category}` : product.category}</span>
          <span className="tabular whitespace-nowrap text-[0.86rem] font-semibold" style={{ color: "var(--b-text)" }}>₩{product.price.toLocaleString()}</span>
        </div>
        {product.isDemo && <span className="mt-0.5 text-[0.68rem]" style={{ color: "var(--b-text-soft)" }}>Demo 제품</span>}
      </Link>
    </div>
  );
}
