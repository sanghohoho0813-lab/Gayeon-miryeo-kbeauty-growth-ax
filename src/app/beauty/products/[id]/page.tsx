"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Check, ChevronLeft, ExternalLink, Heart, Sparkles, Star } from "lucide-react";
import { demoRepository } from "@/lib/repository";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getWishlist, pushRecentlyViewed, toggleWishlist } from "@/lib/beauty-store";

const ROUTINE_ORDER = ["클렌저/토너로 피부 결 정돈", "에센스/앰플로 집중 케어", "크림으로 마무리 보습", "낮에는 선케어로 마무리"];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = demoRepository.products.find((p) => p.id === id);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    if (product) {
      pushRecentlyViewed(product.id);
      setWished(getWishlist().includes(product.id));
    }
  }, [product]);

  if (!product) {
    return (
      <div className="py-24 text-center">
        <p className="text-[1.1rem] font-bold">제품을 찾을 수 없습니다.</p>
        <Link href="/beauty/products" className="mt-3 inline-block font-semibold underline" style={{ color: "var(--b-navy)" }}>
          제품 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const related = demoRepository.products
    .filter((p) => p.id !== product.id && p.concerns.some((c) => product.concerns.includes(c)))
    .slice(0, 4);

  const buyChannels = product.mainChannels
    .map((cid) => demoRepository.channels.find((c) => c.id === cid))
    .filter((c) => c && c.type !== "B2B" && c.type !== "수출");

  return (
    <div className="pt-6">
      <Link
        href="/beauty/products"
        className="inline-flex items-center gap-1 text-[0.9rem] font-semibold"
        style={{ color: "var(--b-text-soft)" }}
      >
        <ChevronLeft size={17} aria-hidden />
        제품 목록
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* 이미지 */}
        <div
          className="flex min-h-[380px] items-center justify-center rounded-[28px] border"
          style={{ borderColor: "var(--b-border)", background: "linear-gradient(160deg, #fff, var(--b-surface-warm))" }}
        >
          <div className="h-[300px]">
            <ProductVisual category={product.category} variant={product.id.length} className="h-full" />
          </div>
        </div>

        {/* 정보 */}
        <div>
          <div className="flex items-center gap-2">
            {product.isBest && (
              <span className="rounded-full px-3 py-1 text-[0.78rem] font-bold text-white" style={{ background: "var(--b-navy)" }}>
                베스트
              </span>
            )}
            {product.isNew && (
              <span className="rounded-full px-3 py-1 text-[0.78rem] font-bold text-white" style={{ background: "var(--b-gold)" }}>
                신제품
              </span>
            )}
            <span className="text-[0.85rem] font-semibold" style={{ color: "var(--b-gold)" }}>
              {product.line} · {product.category}
            </span>
          </div>
          <h1 className="font-display mt-2.5 text-[1.8rem] font-bold leading-tight" style={{ color: "var(--b-navy)" }}>
            {product.name}
          </h1>
          <p className="mt-0.5 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>
            {product.nameEn}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
            <Star size={16} fill="var(--b-gold)" style={{ color: "var(--b-gold)" }} aria-hidden />
            <strong style={{ color: "var(--b-text)" }}>{product.rating}</strong>
            리뷰 {product.reviewCount.toLocaleString()}개
          </div>
          <div className="mt-4 text-[1.7rem] font-bold">₩{product.price.toLocaleString()}</div>
          <p className="mt-3 text-[1rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
            {product.description}
          </p>

          {/* 추천 대상 */}
          <div className="mt-5 rounded-2xl p-5" style={{ background: "var(--b-surface-warm)" }}>
            <div className="text-[0.9rem] font-bold">이런 분께 추천해요</div>
            <ul className="mt-2 space-y-1.5 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
              {product.concerns.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <Check size={16} style={{ color: "var(--b-navy)" }} aria-hidden />
                  {c} 케어가 필요한 피부
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Check size={16} style={{ color: "var(--b-navy)" }} aria-hidden />
                {product.texture === "가벼움" ? "가벼운 사용감을 선호하는 분" : product.texture === "리치" ? "촉촉하고 리치한 사용감을 선호하는 분" : "부담 없는 중간 사용감을 선호하는 분"}
              </li>
            </ul>
          </div>

          {/* AI 추천 이유 */}
          <div className="mt-4 rounded-2xl border-2 p-5" style={{ borderColor: "var(--b-gold)" }}>
            <div className="flex items-center gap-1.5 text-[0.9rem] font-bold" style={{ color: "var(--b-navy)" }}>
              <Sparkles size={16} aria-hidden />
              AI 추천 이유 (Demo)
            </div>
            <p className="mt-1.5 text-[0.92rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
              {product.concerns.join(" · ")} 고민을 선택한 고객에게 추천되는 {product.category} 제품으로,
              루틴 STEP {product.routineStep} 단계에서 사용합니다. AI Beauty Finder를 완료하면 나에게 더
              정확한 추천 이유를 확인할 수 있습니다.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-5 flex gap-2.5">
            <a
              href="#channels"
              className="inline-flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl text-[1rem] font-bold text-white transition-transform hover:scale-[1.01]"
              style={{ background: "var(--b-navy)" }}
            >
              구매 채널 보기
            </a>
            <button
              onClick={() => setWished(toggleWishlist(product.id).includes(product.id))}
              aria-pressed={wished}
              className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl border-2 transition-colors"
              style={{ borderColor: wished ? "var(--b-navy)" : "var(--b-border)" }}
              aria-label={wished ? "찜 해제" : "찜하기"}
            >
              <Heart size={22} fill={wished ? "var(--b-navy)" : "none"} style={{ color: "var(--b-navy)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* 사용 순서 */}
      <section className="mt-12 rounded-[28px] border bg-white p-7 md:p-8" style={{ borderColor: "var(--b-border)" }}>
        <h2 className="font-display text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>
          사용 순서
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {ROUTINE_ORDER.map((r, i) => (
            <li
              key={r}
              className="rounded-2xl p-4 text-[0.9rem] leading-relaxed"
              style={
                i + 1 === product.routineStep
                  ? { background: "var(--b-navy)", color: "#fff", fontWeight: 700 }
                  : { background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }
              }
            >
              <div className="text-[0.78rem] font-bold" style={{ color: i + 1 === product.routineStep ? "var(--b-gold)" : "var(--b-gold)" }}>
                STEP {i + 1} {i + 1 === product.routineStep && "· 이 제품"}
              </div>
              {r}
            </li>
          ))}
        </ol>
      </section>

      {/* 구매 채널 */}
      <section id="channels" className="mt-8 rounded-[28px] border bg-white p-7 md:p-8" style={{ borderColor: "var(--b-border)" }}>
        <h2 className="font-display text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>
          구매 채널
        </h2>
        <p className="mt-1 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>
          현재는 Demo 상태로, 실제 판매처 링크 연결 시 외부 구매처로 이동합니다.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {buyChannels.map((c) => (
            <div
              key={c!.id}
              className="flex items-center justify-between rounded-2xl border p-4"
              style={{ borderColor: "var(--b-border)" }}
            >
              <div>
                <div className="font-bold">{c!.name}</div>
                <div className="text-[0.82rem]" style={{ color: "var(--b-text-soft)" }}>
                  {c!.type} · Demo
                </div>
              </div>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--b-surface-warm)", color: "var(--b-navy)" }}
                aria-label="외부 구매처 (Demo)"
              >
                <ExternalLink size={17} aria-hidden />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 리뷰 자리 */}
      <section className="mt-8 rounded-[28px] border bg-white p-7 md:p-8" style={{ borderColor: "var(--b-border)" }}>
        <h2 className="font-display text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>
          사용자 리뷰
        </h2>
        <div className="mt-4 rounded-2xl p-6 text-center text-[0.92rem]" style={{ background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }}>
          리뷰 기능은 준비 중입니다. 실제 서비스 오픈 시 고객 리뷰가 이 영역에 표시됩니다.
        </div>
      </section>

      {/* 관련 제품 */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display mb-5 text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>
            함께 보면 좋은 제품
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <BeautyProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
