"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getWishlist, toggleWishlist } from "@/lib/beauty-store";

export function BeautyProductCard({
  product,
  aiBadge,
}: {
  product: Product;
  aiBadge?: string;
}) {
  const [wished, setWished] = useState(false);

  useEffect(() => {
    setWished(getWishlist().includes(product.id));
  }, [product.id]);

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--b-radius)] border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(22,35,63,0.12)]"
      style={{ borderColor: "var(--b-border)" }}
    >
      <Link href={`/beauty/products/${product.id}`} className="block">
        <div
          className="relative flex h-[210px] items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(160deg, var(--b-surface-warm), #ece5d8)" }}
        >
          <div className="h-[160px] transition-transform duration-300 group-hover:scale-[1.05]">
            <ProductVisual category={product.category} variant={product.id.length} className="h-full" />
          </div>
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isBest && (
              <span className="rounded-full px-2.5 py-1 text-[0.72rem] font-bold text-white" style={{ background: "var(--b-navy)" }}>
                베스트
              </span>
            )}
            {product.isNew && (
              <span className="rounded-full px-2.5 py-1 text-[0.72rem] font-bold" style={{ background: "var(--b-gold)", color: "#fff" }}>
                신제품
              </span>
            )}
            {aiBadge && (
              <span className="rounded-full border bg-white/90 px-2.5 py-1 text-[0.72rem] font-bold" style={{ borderColor: "var(--b-gold)", color: "var(--b-navy)" }}>
                {aiBadge}
              </span>
            )}
          </div>
        </div>
      </Link>

      <button
        aria-label={wished ? "찜 해제" : "찜하기"}
        aria-pressed={wished}
        onClick={() => setWished(toggleWishlist(product.id).includes(product.id))}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-sm transition-transform hover:scale-105"
      >
        <Heart
          size={19}
          fill={wished ? "var(--b-navy)" : "none"}
          style={{ color: "var(--b-navy)" }}
        />
      </button>

      <Link href={`/beauty/products/${product.id}`} className="flex flex-1 flex-col p-4">
        <div className="text-[0.78rem] font-semibold tracking-wide" style={{ color: "var(--b-gold)" }}>
          {product.line}
        </div>
        <h3 className="mt-0.5 text-[1.02rem] font-bold leading-snug" style={{ color: "var(--b-text)" }}>
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[0.85rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
          {product.description}
        </p>
        <div className="mt-auto pt-3">
          <div className="text-[1.08rem] font-bold">₩{product.price.toLocaleString()}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[0.82rem]" style={{ color: "var(--b-text-soft)" }}>
            <Star size={14} fill="var(--b-gold)" style={{ color: "var(--b-gold)" }} aria-hidden />
            {product.rating} ({product.reviewCount.toLocaleString()})
          </div>
        </div>
      </Link>
    </div>
  );
}
