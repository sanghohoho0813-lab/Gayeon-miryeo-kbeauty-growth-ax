"use client";

import { isLive } from "@/lib/config";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ExternalLink, Heart, ShoppingBag, Sparkles } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { CONCERNS } from "@/components/beauty/concerns";
import { formatDay, useBeautyMemory } from "@/components/beauty/useBeautyMemory";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { CONCERN_TINT, SectionHead } from "@/components/beauty/ui";
import { snack } from "@/components/beauty/Snackbar";
import { getLastResult, getWishlist, pushRecentlyViewed, toggleWishlist } from "@/lib/beauty-store";
import { track } from "@/lib/customer-events";
import type { PurchaseLink } from "@/lib/types";

const ROUTINE_ORDER = [
  { k: "클렌징 · 토너", d: "결 정돈" },
  { k: "에센스 · 앰플", d: "집중 케어" },
  { k: "크림", d: "마무리 보습" },
  { k: "선케어", d: "낮 루틴 마무리" },
];

/* 제품 상세 (D-073 → PASS 26 커머스형 D-082: 사진 타일 · 가격 크게 · 고민 칩 · 추천 이유 카드 · 사용 순서 칸 · 구매처 카드 · 하단 고정 '찜 + 구매 채널 · 가격')
   핵심은 여전히 '추천 이유'.
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
  const toggleWish = () => {
    const next = toggleWishlist(product.id).includes(product.id);
    setWished(next);
    track(next ? "wishlist_add" : "wishlist_remove", product.id);
    snack(next ? { text: "찜 목록에 담았어요", href: "/beauty/passport#saved", cta: "찜 목록" } : { text: "찜을 해제했어요" });
  };

  const goPurchase = (l: PurchaseLink) => {
    track("outbound_purchase_click", product.id, { channel: l.label, hasUrl: !!l.url });
    if (l.url) window.open(l.url, "_blank", "noopener,noreferrer");
    else setNotice(`${l.label} 구매 링크는 연결 예정입니다.${isLive ? "" : " (Demo)"} 관심은 기록되었습니다.`);
  };

  return (
    <div className="pb-28 pt-3 @3xl:pb-0 @3xl:pt-6">
      <Link href="/beauty/products" className="inline-flex min-h-[44px] items-center gap-1 text-[0.88rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
        <ChevronLeft size={17} aria-hidden /> 제품 목록
      </Link>

      <div className="mt-1 grid gap-6 @3xl:grid-cols-[1.05fr_1fr] @3xl:gap-12">
        {/* 사진 */}
        <div>
          <div className="relative flex aspect-square max-h-[600px] w-full items-center justify-center overflow-hidden rounded-[28px] @3xl:sticky @3xl:top-28" style={{ background: "linear-gradient(160deg, #F8F2EC 0%, #F1E6DA 100%)" }}>
            <div className="h-[80%]"><ProductVisual category={product.category} variant={product.id.length} productId={product.id} alt={`${product.name} 제품 사진`} className="h-full" /></div>
            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
              {product.isBest && <span className="b-pill" style={{ background: "var(--b-text)", color: "#fff" }}>BEST</span>}
              {product.isNew && <span className="b-pill" style={{ background: "var(--b-rose-ink)", color: "#fff" }}>신제품</span>}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[0.8rem] font-bold" style={{ color: "var(--b-text-soft)" }}>MIRYEO · {[product.line, product.category].filter(Boolean).join(" · ")}</p>
          <h1 className="b-display mt-1.5 text-[1.6rem] @3xl:text-[2.2rem]">{product.name}</h1>
          {product.nameEn && <p className="b-caption mt-0.5">{product.nameEn}</p>}
          <p className="mt-3 tabular text-[1.6rem] font-extrabold tracking-[-0.02em]">{product.price.toLocaleString()}<span className="ml-0.5 text-[1.05rem] font-bold">원</span></p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.concerns.map((c) => {
              const meta = CONCERNS.find((x) => x.id === c);
              const t = CONCERN_TINT[c];
              const mine = mem.concerns.includes(c);
              return (
                <span key={c} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 text-[0.82rem] font-bold" style={{ background: t?.bg ?? "var(--b-soft)", color: t?.fg ?? "var(--b-text)" }}>
                  {meta ? <meta.icon size={15} aria-hidden /> : <Check size={14} aria-hidden />}{meta?.label ?? c}{mine && <span className="text-[0.68rem]" style={{ color: "var(--b-rose-ink)" }}>· 나의 고민</span>}
                </span>
              );
            })}
          </div>

          {/* 왜 나에게 추천됐나요? */}
          <section className="mt-6 rounded-[20px] p-5" style={{ background: "var(--b-rose-soft)" }} aria-labelledby="h-why" data-testid="why-me">
            <h2 id="h-why" className="flex items-center gap-1.5 text-[0.98rem] font-extrabold" style={{ color: "var(--b-rose-ink)" }}><Sparkles size={17} aria-hidden /> 왜 나에게 추천됐나요?</h2>
            {myReason || matched.length > 0 ? (
              <>
                <p className="mt-2 text-[1.02rem] font-bold leading-snug">{who} 선택한 {(matched.length ? matched : product.concerns).join(" + ")} 고민과 잘 맞는 제품입니다.</p>
                {myReason && <p className="b-body mt-1.5 text-[0.9rem]">{myReason}</p>}
                {mem.result && <p className="b-caption mt-1.5">{formatDay(mem.result.createdAt)} 상담 결과 기준</p>}
              </>
            ) : (
              <>
                <p className="b-body mt-1.5 text-[0.9rem]">{product.concerns.join(" · ")} 고민을 선택한 분께 추천되는 {product.category} 제품입니다. AI 뷰티 파인더를 완료하면 나에게 맞춘 추천 이유를 볼 수 있어요.</p>
                <Link href="/beauty/finder" className="b-link text-[0.9rem]">나에게 맞는지 확인하기 →</Link>
              </>
            )}
          </section>

          {/* 이런 분께 추천해요 */}
          <section className="b-card mt-4 p-5" aria-labelledby="h-fit">
            <h2 id="h-fit" className="text-[0.98rem] font-extrabold">이런 분께 추천해요</h2>
            <ul className="mt-2.5 space-y-1.5 text-[0.9rem]">
              {product.concerns.map((c) => <li key={c} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}><Check size={12} strokeWidth={3} aria-hidden /></span> {c} 고민을 선택한 분</li>)}
              {product.texture && <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}><Check size={12} strokeWidth={3} aria-hidden /></span> {product.texture === "가벼움" ? "가벼운 사용감을 좋아하는 분" : product.texture === "리치" ? "촉촉하고 리치한 사용감을 좋아하는 분" : "부담 없는 중간 사용감을 좋아하는 분"}</li>}
            </ul>
          </section>

          {/* 내 루틴에서는 언제? */}
          <section className="b-card mt-4 p-5" aria-labelledby="h-when">
            <h2 id="h-when" className="text-[0.98rem] font-extrabold">내 루틴에서는 언제 사용하나요?</h2>
            <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="사용 순서">
              {ROUTINE_ORDER.map((r, i) => {
                const mine = i + 1 === product.routineStep;
                return (
                  <li key={r.k} className="rounded-2xl px-2 py-2.5 text-center" aria-current={mine ? "step" : undefined} style={mine ? { background: "var(--b-rose-ink)", color: "#fff" } : { background: "var(--b-canvas)", color: "var(--b-text-soft)" }}>
                    <span className="block text-[0.7rem] font-extrabold">STEP {i + 1}</span>
                    <span className="mt-0.5 block text-[0.78rem] font-bold leading-tight [word-break:keep-all]" style={mine ? undefined : { color: "var(--b-text)" }}>{r.k}</span>
                    {mine && <span className="mt-1 block text-[0.66rem] font-bold">이 제품</span>}
                  </li>
                );
              })}
            </ol>
          </section>

          {product.description && (
            <section className="mt-6" aria-labelledby="h-desc">
              <h2 id="h-desc" className="text-[0.98rem] font-extrabold">제품 설명</h2>
              <p className="b-body mt-1.5">{product.description}</p>
            </section>
          )}

          <div className="mt-7 hidden gap-2.5 @3xl:flex">
            <WishButton wished={wished} onToggle={toggleWish} />
            <a href="#channels" className="b-btn pressable flex-1">구매 채널 보기</a>
          </div>
        </div>
      </div>

      <section id="channels" className="mt-12 scroll-mt-24" aria-labelledby="h-channels">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="h-channels" className="b-section text-[1.25rem] @3xl:text-[1.4rem]">구매 채널</h2>
          <p className="b-caption">MIRYEO AI Beauty는 결제를 직접 처리하지 않습니다.</p>
        </div>
        {product.purchaseLinks.length === 0 ? (
          <p className="b-body mt-3">구매처 정보를 준비 중입니다.</p>
        ) : (
          <ul className="mt-3 grid gap-2 @xl:grid-cols-2">
            {product.purchaseLinks.map((l) => (
              <li key={l.label}>
                <button onClick={() => goPurchase(l)} className="b-card pressable flex min-h-[68px] w-full items-center justify-between gap-3 px-4 text-left !shadow-none hover:!shadow-md">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}><ShoppingBag size={18} aria-hidden /></span>
                    <span><span className="block font-bold">{l.label}</span><span className="b-caption">{l.url ? "외부 구매처로 이동" : "연결 예정"}</span></span>
                  </span>
                  <ExternalLink size={18} style={{ color: "var(--b-text-soft)" }} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {notice && <p className="route-fade mt-3 rounded-xl p-3 text-[0.9rem]" style={{ background: "var(--b-canvas)" }} role="status">{notice}</p>}
        <p className="b-caption mt-4">사용자 리뷰는 준비 중입니다 · 실제 구매 고객의 리뷰만 표시할 예정입니다.</p>
      </section>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="h-related">
          <SectionHead id="h-related" title="함께 보면 좋은 제품" href="/beauty/finder" linkLabel="내 루틴으로 확인 →" />
          <div className="b-rail mt-4">{related.map((p) => <BeautyProductCard key={p.id} product={p} compact />)}</div>
        </section>
      )}

      {/* 모바일 하단 고정 — 찜 + 가격 + 구매 채널 (하단 탭 대신) */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2.5 border-t bg-white/97 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur @3xl:hidden" style={{ borderColor: "var(--b-border)", boxShadow: "0 -8px 24px -16px rgba(0,0,0,.25)" }}>
        <WishButton wished={wished} onToggle={toggleWish} />
        <a href="#channels" className="b-btn pressable flex-1">구매 채널 보기 · <span className="tabular">{product.price.toLocaleString()}원</span></a>
      </div>
    </div>
  );
}

function WishButton({ wished, onToggle }: { wished: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={wished} aria-label={wished ? "찜 해제" : "찜하기"} className="pressable flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border" style={{ borderColor: wished ? "var(--b-rose)" : "var(--b-line-strong)", background: "#fff" }}>
      <Heart size={22} fill={wished ? "var(--b-rose)" : "none"} style={{ color: wished ? "var(--b-rose)" : "var(--b-text)" }} aria-hidden />
    </button>
  );
}
