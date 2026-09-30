"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getWishlist, toggleWishlist } from "@/lib/beauty-store";
import { track } from "@/lib/customer-events";

export function BeautyProductCard({ product, aiBadge }: { product: Product; aiBadge?: string }) {
  const [wished, setWished] = useState(false);
  useEffect(() => setWished(getWishlist().includes(product.id)), [product.id]);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[var(--b-radius)] border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(22,35,63,0.12)]" style={{ borderColor: "var(--b-border)" }}>
      <Link href={`/beauty/products/${product.id}`} className="block">
        <div className="relative flex h-[200px] items-center justify-center overflow-hidden" style={{ background: "linear-gradient(160deg, var(--b-surface-warm), #ece5d8)" }}>
          <div className="h-[150px] transition-transform duration-300 group-hover:scale-[1.04]">
            <ProductVisual category={product.category} variant={product.id.length} className="h-full" />
          </div>
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isBest && <span className="rounded-full px-2.5 py-1 text-[0.7rem] font-bold text-white" style={{ background: "var(--b-navy)" }}>베스트</span>}
            {product.isNew && <span className="rounded-full px-2.5 py-1 text-[0.7rem] font-bold text-white" style={{ background: "var(--b-gold)" }}>신제품</span>}
            {aiBadge && <span className="rounded-full border bg-white/90 px-2.5 py-1 text-[0.7rem] font-bold" style={{ borderColor: "var(--b-gold)", color: "var(--b-navy)" }}>{aiBadge}</span>}
          </div>
        </div>
      </Link>
      <button
        aria-label={wished ? "찜 해제" : "찜하기"}
        aria-pressed={wished}
        onClick={() => {
          const next = toggleWishlist(product.id).includes(product.id);
          setWished(next);
          track(next ? "wishlist_add" : "wishlist_remove", product.id);
        }}
        className="pressable absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-sm"
      >
        <Heart size={19} fill={wished ? "var(--b-navy)" : "none"} style={{ color: "var(--b-navy)" }} />
      </button>
      <Link href={`/beauty/products/${product.id}`} className="flex flex-1 flex-col p-4">
        {product.line && <div className="text-[0.76rem] font-semibold tracking-wide" style={{ color: "var(--b-gold)" }}>{product.line}</div>}
        <h3 className="mt-0.5 text-[1rem] font-bold leading-snug" style={{ color: "var(--b-text)" }}>{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {product.concerns.slice(0, 2).map((c) => <span key={c} className="rounded-full px-2 py-0.5 text-[0.72rem] font-semibold" style={{ background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }}>#{c}</span>)}
        </div>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="tabular text-[1.05rem] font-bold">₩{product.price.toLocaleString()}</div>
          {product.isDemo && <span className="text-[0.7rem]" style={{ color: "var(--b-text-soft)" }}>Demo 제품</span>}
        </div>
      </Link>
    </div>
  );
}
