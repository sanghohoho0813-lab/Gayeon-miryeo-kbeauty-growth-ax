"use client";

import { isLive } from "@/lib/config";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ExternalLink, Heart, Sparkles } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getLastResult, getWishlist, pushRecentlyViewed, toggleWishlist } from "@/lib/beauty-store";
import { track } from "@/lib/customer-events";
import type { PurchaseLink } from "@/lib/types";

const ROUTINE_ORDER = ["클렌저·토너로 결 정돈", "에센스·앰플 집중 케어", "크림으로 마무리 보습", "낮에는 선케어로 마무리"];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { products } = useBeautyData();
  const product = products.find((p) => p.id === id);
  const [wished, setWished] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [myReason, setMyReason] = useState<string | null>(null);
  const viewed = useRef("");

  useEffect(() => {
    if (!product || viewed.current === product.id) return;
    viewed.current = product.id;
    pushRecentlyViewed(product.id);
    setWished(getWishlist().includes(product.id));
    setMyReason(getLastResult()?.reasons[product.id] ?? null);
    track("view_product", product.id);
  }, [product]);

  if (!product) {
    return (
      <div className="py-24 text-center">
        <p className="text-[1.1rem] font-bold">제품을 찾을 수 없습니다.</p>
        <Link href="/beauty/products" className="mt-3 inline-block font-semibold underline" style={{ color: "var(--b-navy)" }}>제품 목록으로</Link>
      </div>
    );
  }

  const related = products.filter((p) => p.id !== product.id && p.concerns.some((c) => product.concerns.includes(c))).slice(0, 4);

  const goPurchase = (l: PurchaseLink) => {
    track("outbound_purchase_click", product.id, { channel: l.label, hasUrl: !!l.url });
    if (l.url) window.open(l.url, "_blank", "noopener,noreferrer");
    else setNotice(`${l.label} 구매 링크는 연결 예정입니다.${isLive ? "" : " (Demo)"} 관심은 기록되었습니다.`);
  };

  return (
    <div className="pt-6">
      <Link href="/beauty/products" className="inline-flex items-center gap-1 text-[0.9rem] font-semibold hover:underline" style={{ color: "var(--b-text-soft)" }}>
        <ChevronLeft size={17} aria-hidden /> 제품 목록
      </Link>

      <div className="mt-4 grid gap-8 @3xl:grid-cols-2">
        <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border" style={{ borderColor: "var(--b-border)", background: "linear-gradient(160deg, #fff, var(--b-surface-warm))" }}>
          <div className="h-[280px]"><ProductVisual category={product.category} variant={product.id.length} className="h-full" /></div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.isBest && <span className="rounded-full px-3 py-1 text-[0.76rem] font-bold text-white" style={{ background: "var(--b-navy)" }}>베스트</span>}
            {product.isNew && <span className="rounded-full px-3 py-1 text-[0.76rem] font-bold text-white" style={{ background: "var(--b-gold-ink)" }}>신제품</span>}
            <span className="text-[0.85rem] font-semibold" style={{ color: "var(--b-gold-ink)" }}>{[product.line, product.category].filter(Boolean).join(" · ")}</span>
          </div>
          <h1 className="font-display mt-2.5 text-[1.8rem] font-bold leading-tight" style={{ color: "var(--b-navy)" }}>{product.name}</h1>
          {product.nameEn && <p className="mt-0.5 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>{product.nameEn}</p>}
          <div className="tabular mt-4 text-[1.7rem] font-bold">₩{product.price.toLocaleString()}</div>
          {product.description && <p className="mt-3 text-[1rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>{product.description}</p>}

          <div className="mt-5 rounded-2xl p-5" style={{ background: "var(--b-surface-warm)" }}>
            <div className="text-[0.9rem] font-bold">이런 분께 추천해요</div>
            <ul className="mt-2 space-y-1.5 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
              {product.concerns.map((c) => <li key={c} className="flex items-center gap-2"><Check size={16} style={{ color: "var(--b-navy)" }} aria-hidden /> {c} 고민을 선택한 분</li>)}
              {product.texture && <li className="flex items-center gap-2"><Check size={16} style={{ color: "var(--b-navy)" }} aria-hidden /> {product.texture === "가벼움" ? "가벼운 사용감을 좋아하는 분" : product.texture === "리치" ? "촉촉하고 리치한 사용감을 좋아하는 분" : "부담 없는 중간 사용감을 좋아하는 분"}</li>}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border-2 p-5" style={{ borderColor: "var(--b-gold)" }}>
            <div className="flex items-center gap-1.5 text-[0.9rem] font-bold" style={{ color: "var(--b-navy)" }}><Sparkles size={16} aria-hidden /> 추천 이유</div>
            <p className="mt-1.5 text-[0.92rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
              {myReason ?? `${product.concerns.join(" · ")} 고민을 선택한 분께 추천되는 ${product.category} 제품입니다. AI 뷰티 파인더를 완료하면 나에게 맞춘 추천 이유를 볼 수 있어요.`}
            </p>
            {!myReason && <Link href="/beauty/finder" className="mt-2 inline-block text-[0.88rem] font-bold underline" style={{ color: "var(--b-navy)" }}>나에게 맞는지 확인하기 →</Link>}
          </div>

          <div className="mt-5 hidden gap-2.5 @3xl:flex">
            <a href="#channels" className="pressable inline-flex min-h-[54px] flex-1 items-center justify-center rounded-2xl text-[1rem] font-bold text-white" style={{ background: "var(--b-navy)" }}>구매 채널 보기</a>
            <WishButton wished={wished} onToggle={() => { const next = toggleWishlist(product.id).includes(product.id); setWished(next); track(next ? "wishlist_add" : "wishlist_remove", product.id); }} />
          </div>
        </div>
      </div>

      <section className="mt-12 rounded-[28px] border bg-white p-7 @3xl:p-8" style={{ borderColor: "var(--b-border)" }}>
        <h2 className="font-display text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>사용 순서</h2>
        <ol className="mt-4 grid gap-3 @3xl:grid-cols-4">
          {ROUTINE_ORDER.map((r, i) => {
            const mine = i + 1 === product.routineStep;
            return (
              <li key={r} className="rounded-2xl p-4 text-[0.9rem] leading-relaxed" style={mine ? { background: "var(--b-navy)", color: "#fff", fontWeight: 700 } : { background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }}>
                <div className="text-[0.76rem] font-bold" style={{ color: mine ? "#fff" : "var(--b-gold-ink)" }}>STEP {i + 1}{mine ? " · 이 제품" : ""}</div>
                {r}
              </li>
            );
          })}
        </ol>
      </section>

      <section id="channels" className="mt-8 scroll-mt-24 rounded-[28px] border bg-white p-7 @3xl:p-8" style={{ borderColor: "var(--b-border)" }}>
        <h2 className="font-display text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>구매 채널</h2>
        {product.purchaseLinks.length === 0 ? (
          <p className="mt-2 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>구매처 정보를 준비 중입니다.</p>
        ) : (
          <div className="mt-4 grid gap-3 @3xl:grid-cols-3">
            {product.purchaseLinks.map((l) => (
              <button key={l.label} onClick={() => goPurchase(l)} className="pressable flex items-center justify-between rounded-2xl border p-4 text-left transition-colors hover:bg-[var(--b-surface-warm)]" style={{ borderColor: "var(--b-border)" }}>
                <span><span className="block font-bold">{l.label}</span><span className="text-[0.82rem]" style={{ color: "var(--b-text-soft)" }}>{l.url ? "외부 구매처로 이동" : "연결 예정"}</span></span>
                <ExternalLink size={18} style={{ color: "var(--b-navy)" }} aria-hidden />
              </button>
            ))}
          </div>
        )}
        {notice && <p className="route-fade mt-3 rounded-xl p-3 text-[0.9rem]" style={{ background: "var(--b-surface-warm)" }} role="status">{notice}</p>}
        <p className="mt-3 text-[0.8rem]" style={{ color: "var(--b-text-soft)" }}>MIRYEO AI Beauty는 결제를 직접 처리하지 않습니다.</p>
      </section>

      <section className="mt-8 rounded-[28px] border bg-white p-7 @3xl:p-8" style={{ borderColor: "var(--b-border)" }}>
        <h2 className="font-display text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>사용자 리뷰</h2>
        <div className="mt-4 rounded-2xl p-6 text-center text-[0.92rem]" style={{ background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }}>리뷰는 준비 중입니다. 실제 구매 고객의 리뷰만 표시할 예정입니다.</div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display mb-5 text-[1.35rem] font-bold" style={{ color: "var(--b-navy)" }}>함께 보면 좋은 제품</h2>
          <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">{related.map((p) => <BeautyProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* Mobile Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur @3xl:hidden" style={{ borderColor: "var(--b-border)" }}>
        <WishButton wished={wished} onToggle={() => { const next = toggleWishlist(product.id).includes(product.id); setWished(next); track(next ? "wishlist_add" : "wishlist_remove", product.id); }} />
        <a href="#channels" className="pressable inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl font-bold text-white" style={{ background: "var(--b-navy)" }}>구매 채널 보기</a>
      </div>
    </div>
  );
}

function WishButton({ wished, onToggle }: { wished: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={wished} aria-label={wished ? "찜 해제" : "찜하기"} className="pressable flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border-2 bg-white" style={{ borderColor: wished ? "var(--b-navy)" : "var(--b-border)" }}>
      <Heart size={22} fill={wished ? "var(--b-navy)" : "none"} style={{ color: "var(--b-navy)" }} />
    </button>
  );
}
