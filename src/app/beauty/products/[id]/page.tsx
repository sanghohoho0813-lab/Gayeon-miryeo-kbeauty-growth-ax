"use client";

import { isLive } from "@/lib/config";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ExternalLink, Heart, Sparkles } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { CONCERNS } from "@/components/beauty/concerns";
import { formatDay, useBeautyMemory } from "@/components/beauty/useBeautyMemory";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { getLastResult, getWishlist, pushRecentlyViewed, toggleWishlist } from "@/lib/beauty-store";
import { track } from "@/lib/customer-events";
import type { PurchaseLink } from "@/lib/types";

const ROUTINE_ORDER = [
  { k: "클렌징 · 토너", d: "결 정돈" },
  { k: "에센스 · 앰플", d: "집중 케어" },
  { k: "크림", d: "마무리 보습" },
  { k: "선케어", d: "낮 루틴 마무리" },
];

/* 제품 상세 (D-073) — 핵심을 '구매'가 아니라 '추천 이유'로.
   사진 → 이름·종류·가격 → 왜 나에게 추천됐나요? → 이런 피부 고민에 맞아요 → 내 루틴에서 언제 → 설명 → 구매 채널.
   개인화 문구는 저장된 Finder 결과가 있을 때만 (가짜 개인화 없음). */
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { products } = useBeautyData();
  const mem = useBeautyMemory();
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
        <Link href="/beauty/products" className="b-link mt-3">제품 목록으로</Link>
      </div>
    );
  }

  const related = products.filter((p) => p.id !== product.id && p.concerns.some((c) => product.concerns.includes(c))).slice(0, 4);
  const matched = mem.result ? mem.result.profile.concerns.filter((c) => product.concerns.includes(c)) : [];
  const who = mem.name ? `${mem.name}님이` : "최근 상담에서";
  const toggleWish = () => { const next = toggleWishlist(product.id).includes(product.id); setWished(next); track(next ? "wishlist_add" : "wishlist_remove", product.id); };

  const goPurchase = (l: PurchaseLink) => {
    track("outbound_purchase_click", product.id, { channel: l.label, hasUrl: !!l.url });
    if (l.url) window.open(l.url, "_blank", "noopener,noreferrer");
    else setNotice(`${l.label} 구매 링크는 연결 예정입니다.${isLive ? "" : " (Demo)"} 관심은 기록되었습니다.`);
  };

  return (
    <div className="pb-24 pt-4 @3xl:pb-0">
      <Link href="/beauty/products" className="inline-flex min-h-[44px] items-center gap-1 text-[0.88rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
        <ChevronLeft size={17} aria-hidden /> 제품 목록
      </Link>

      <div className="mt-2 grid gap-8 @3xl:grid-cols-[1.1fr_1fr] @3xl:gap-14">
        <div>
          <div className="flex aspect-[4/5] max-h-[620px] w-full items-center justify-center rounded-[32px] @3xl:sticky @3xl:top-28" style={{ background: "var(--b-surface-warm)" }}>
            <div className="h-[76%]"><ProductVisual category={product.category} variant={product.id.length} productId={product.id} alt={`${product.name} 제품 사진`} className="h-full" /></div>
          </div>
        </div>

        <div>
          <p className="b-eyebrow">{[product.line, product.category].filter(Boolean).join(" · ")}</p>
          <h1 className="b-display mt-3 text-[2rem] @3xl:text-[2.5rem]">{product.name}</h1>
          {product.nameEn && <p className="b-caption mt-1">{product.nameEn}</p>}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular text-[1.2rem] font-semibold">₩{product.price.toLocaleString()}</span>
            {(product.isBest || product.isNew) && <span className="b-caption">{[product.isBest && "베스트", product.isNew && "신제품"].filter(Boolean).join(" · ")}</span>}
          </div>

          {/* 왜 나에게 추천됐나요? */}
          <section className="mt-8 border-t pt-6" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-why" data-testid="why-me">
            <h2 id="h-why" className="flex items-center gap-2 text-[1.05rem] font-bold"><Sparkles size={17} style={{ color: "var(--b-gold-ink)" }} aria-hidden /> 왜 나에게 추천됐나요?</h2>
            {myReason || matched.length > 0 ? (
              <>
                <p className="b-section mt-3 text-[1.2rem] leading-snug">{who} 선택한 {(matched.length ? matched : product.concerns).join(" + ")} 고민과 잘 맞는 제품입니다.</p>
                {myReason && <p className="b-body mt-2">{myReason}</p>}
                {mem.result && <p className="b-caption mt-2">{formatDay(mem.result.createdAt)} 상담 결과 기준</p>}
              </>
            ) : (
              <>
                <p className="b-body mt-2">{product.concerns.join(" · ")} 고민을 선택한 분께 추천되는 {product.category} 제품입니다. AI 뷰티 파인더를 완료하면 나에게 맞춘 추천 이유를 볼 수 있어요.</p>
                <Link href="/beauty/finder" className="b-link mt-1 text-[0.9rem]">나에게 맞는지 확인하기 →</Link>
              </>
            )}
          </section>

          {/* 이런 피부 고민에 맞아요 */}
          <section className="mt-8 border-t pt-6" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-fit">
            <h2 id="h-fit" className="text-[1.05rem] font-bold">이런 피부 고민에 맞아요</h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-4">
              {product.concerns.map((c) => {
                const meta = CONCERNS.find((x) => x.id === c);
                const mine = mem.concerns.includes(c);
                return (
                  <li key={c} className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border" style={mine ? { background: "var(--b-ink)", borderColor: "var(--b-ink)", color: "#fff" } : { borderColor: "var(--b-line-strong)", color: "var(--b-ink)" }}>
                      {meta ? <meta.icon size={18} strokeWidth={1.7} aria-hidden /> : <Check size={16} aria-hidden />}
                    </span>
                    <span className="text-[0.92rem] font-semibold">{meta?.label ?? c}{mine && <span className="ml-1.5 text-[0.7rem] font-bold" style={{ color: "var(--b-gold-ink)" }}>나의 고민</span>}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[0.88rem] font-bold">이런 분께 추천해요</p>
            <ul className="mt-1.5 space-y-1 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>
              {product.concerns.map((c) => <li key={c} className="flex items-center gap-2"><Check size={15} style={{ color: "var(--b-ink)" }} aria-hidden /> {c} 고민을 선택한 분</li>)}
              {product.texture && <li className="flex items-center gap-2"><Check size={15} style={{ color: "var(--b-ink)" }} aria-hidden /> {product.texture === "가벼움" ? "가벼운 사용감을 좋아하는 분" : product.texture === "리치" ? "촉촉하고 리치한 사용감을 좋아하는 분" : "부담 없는 중간 사용감을 좋아하는 분"}</li>}
            </ul>
          </section>

          {/* 내 루틴에서는 언제? */}
          <section className="mt-8 border-t pt-6" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-when">
            <h2 id="h-when" className="text-[1.05rem] font-bold">내 루틴에서는 언제 사용하나요?</h2>
            <ol className="mt-5 grid grid-cols-4" aria-label="사용 순서">
              {ROUTINE_ORDER.map((r, i) => {
                const mine = i + 1 === product.routineStep;
                return (
                  <li key={r.k} className="relative pr-2" aria-current={mine ? "step" : undefined}>
                    <span className="absolute left-0 right-0 top-[7px] h-px" style={{ background: "var(--b-line-strong)" }} aria-hidden />
                    <span className="relative block h-[15px] w-[15px] rounded-full border-2" style={mine ? { background: "var(--b-ink)", borderColor: "var(--b-ink)" } : { background: "var(--b-bg)", borderColor: "var(--b-line-strong)" }} aria-hidden />
                    <span className="mt-2 block text-[0.72rem] font-bold" style={{ color: mine ? "var(--b-gold-ink)" : "var(--b-text-soft)" }}>STEP {i + 1}</span>
                    <span className="block text-[0.84rem] font-semibold leading-snug" style={{ color: mine ? "var(--b-ink)" : "var(--b-text-soft)" }}>{r.k}</span>
                    <span className="b-caption block">{r.d}</span>
                    {mine && <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[0.68rem] font-bold text-white" style={{ background: "var(--b-ink)" }}>이 제품</span>}
                  </li>
                );
              })}
            </ol>
          </section>

          {product.description && (
            <section className="mt-8 border-t pt-6" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-desc">
              <h2 id="h-desc" className="text-[1.05rem] font-bold">제품 설명</h2>
              <p className="b-body mt-2">{product.description}</p>
            </section>
          )}

          <div className="mt-8 hidden gap-2.5 @3xl:flex">
            <a href="#channels" className="b-btn pressable flex-1">구매 채널 보기</a>
            <WishButton wished={wished} onToggle={toggleWish} />
          </div>
        </div>
      </div>

      <section id="channels" className="mt-16 scroll-mt-24 border-t pt-8" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-channels">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="h-channels" className="b-section text-[1.5rem]">구매 채널</h2>
          <p className="b-caption">MIRYEO AI Beauty는 결제를 직접 처리하지 않습니다.</p>
        </div>
        {product.purchaseLinks.length === 0 ? (
          <p className="b-body mt-3">구매처 정보를 준비 중입니다.</p>
        ) : (
          <ul className="mt-4 border-t" style={{ borderColor: "var(--b-line)" }}>
            {product.purchaseLinks.map((l) => (
              <li key={l.label}>
                <button onClick={() => goPurchase(l)} className="flex min-h-[64px] w-full items-center justify-between gap-3 border-b px-1 text-left transition-colors hover:bg-white/60" style={{ borderColor: "var(--b-line)" }}>
                  <span><span className="block font-bold">{l.label}</span><span className="b-caption">{l.url ? "외부 구매처로 이동" : "연결 예정"}</span></span>
                  <ExternalLink size={18} style={{ color: "var(--b-ink)" }} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {notice && <p className="route-fade mt-3 rounded-xl p-3 text-[0.9rem]" style={{ background: "var(--b-surface-warm)" }} role="status">{notice}</p>}
        <p className="b-caption mt-6">사용자 리뷰는 준비 중입니다 · 실제 구매 고객의 리뷰만 표시할 예정입니다.</p>
      </section>

      {related.length > 0 && (
        <section className="mt-16 border-t pt-8" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-related">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="h-related" className="b-section text-[1.5rem]">함께 보면 좋은 제품</h2>
            <Link href="/beauty/finder" className="b-link text-[0.9rem]">내 루틴으로 확인하기 <ArrowRight size={15} aria-hidden /></Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 @3xl:grid-cols-4 @3xl:gap-x-6">{related.map((p) => <BeautyProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* 모바일 하단 고정 — 찜 + 구매 채널 (하단 탭 대신) */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur @3xl:hidden" style={{ borderColor: "var(--b-line)", background: "rgba(250,248,244,0.96)" }}>
        <WishButton wished={wished} onToggle={toggleWish} />
        <a href="#channels" className="b-btn pressable flex-1">구매 채널 보기</a>
      </div>
    </div>
  );
}

function WishButton({ wished, onToggle }: { wished: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={wished} aria-label={wished ? "찜 해제" : "찜하기"} className="pressable flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border" style={{ borderColor: wished ? "var(--b-ink)" : "var(--b-line-strong)", background: "#fff" }}>
      <Heart size={21} fill={wished ? "var(--b-ink)" : "none"} style={{ color: "var(--b-ink)" }} aria-hidden />
    </button>
  );
}
