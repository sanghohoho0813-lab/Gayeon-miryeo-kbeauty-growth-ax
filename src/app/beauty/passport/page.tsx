"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, History, RefreshCcw, Sparkles } from "lucide-react";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import { ProductVisual } from "@/components/shared/ProductVisual";
import {
  getLastResult,
  getRecentlyViewed,
  getSavedConcerns,
  getWishlist,
} from "@/lib/beauty-store";
import type { BeautyRecommendation, SkinConcern } from "@/lib/types";
import { useCustomerSession } from "@/components/beauty/CustomerSession";

/** 비회원 Passport는 이 브라우저에만 저장 — 회원 전환 안내 */
function MemberBanner() {
  const { session } = useCustomerSession();
  const member = !!session?.account && !session.operator;
  return (
    <div data-testid="member-banner" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-3.5 text-[0.92rem]" style={{ borderColor: "var(--b-border)" }}>
      {member ? (
        <><span>회원 계정에 추천·구매 기록이 보관되고 있습니다.</span><Link href="/beauty/me" className="font-bold underline" style={{ color: "var(--b-navy)" }}>마이페이지 →</Link></>
      ) : (
        <><span>지금 기록은 이 브라우저에만 저장됩니다. 회원이 되면 기기와 상관없이 보관하고 재구매 시점을 알려드려요.</span><Link href="/beauty/login?mode=signup" className="font-bold underline" style={{ color: "var(--b-navy)" }}>회원가입</Link></>
      )}
    </div>
  );
}

export default function PassportPage() {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<SkinConcern[]>([]);
  const [result, setResult] = useState<BeautyRecommendation | null>(null);
  const [viewed, setViewed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setWishlist(getWishlist());
    setConcerns(getSavedConcerns());
    setResult(getLastResult());
    setViewed(getRecentlyViewed());
    setLoaded(true);
  }, []);

  const { products } = useBeautyData();
  const wishedProducts = products.filter((p) => wishlist.includes(p.id));
  const viewedProducts = viewed
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const routineProducts = result
    ? result.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : [];

  const hasData = concerns.length > 0 || wishlist.length > 0 || result || viewed.length > 0;

  return (
    <div className="pt-8">
      <MemberBanner />
      {/* Passport 카드 */}
      <section className="overflow-hidden rounded-[28px]" style={{ background: "var(--b-navy)" }}>
        <div className="flex flex-col gap-6 p-8 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:p-10">
          <div>
            <p className="text-[0.8rem] font-bold tracking-[0.25em]" style={{ color: "var(--b-gold)" }}>
              MY BEAUTY PASSPORT
            </p>
            <h1 className="font-display mt-2 text-[1.7rem] font-bold text-white @3xl:text-[2rem]">
              나의 피부 데이터
            </h1>
            <p className="mt-2 text-[0.92rem] text-white/65">
              {result
                ? `최근 분석일 ${new Date(result.createdAt).toLocaleDateString("ko-KR")}`
                : "아직 AI 분석 기록이 없습니다. AI Beauty Finder로 시작해보세요."}
            </p>
            {concerns.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {concerns.map((c) => {
                  const meta = CONCERNS.find((x) => x.id === c);
                  return (
                    <span key={c} className="rounded-full border border-white/25 px-3.5 py-1.5 text-[0.85rem] font-semibold text-white">
                      {meta?.label ?? c}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <Link
            href="/beauty/finder"
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-[0.98rem] font-bold"
            style={{ color: "var(--b-navy)" }}
          >
            <Sparkles size={17} aria-hidden />
            {result ? "다시 분석하기" : "AI 분석 시작"}
          </Link>
        </div>
      </section>

      {loaded && !hasData && (
        <div className="mt-10 rounded-[28px] border bg-white p-10 text-center" style={{ borderColor: "var(--b-border)" }}>
          <p className="text-[1.05rem] font-bold">뷰티 패스포트가 비어 있어요</p>
          <p className="mt-2 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
            AI Beauty Finder로 피부를 분석하거나, 마음에 드는 제품을 찜하면 이곳에 기록됩니다.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/beauty/finder"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-2xl px-5 font-bold text-white"
              style={{ background: "var(--b-navy)" }}
            >
              AI 분석 시작 <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/beauty/products"
              className="inline-flex min-h-[48px] items-center rounded-2xl border-2 px-5 font-bold"
              style={{ borderColor: "var(--b-navy)", color: "var(--b-navy)" }}
            >
              제품 둘러보기
            </Link>
          </div>
        </div>
      )}

      {/* 내 추천 루틴 */}
      {routineProducts.length > 0 && (
        <section className="mt-10">
          <SectionTitle icon={<Sparkles size={19} aria-hidden />} title="내 추천 루틴" sub="최근 AI Beauty 분석 결과" />
          <div className="grid gap-4 @3xl:grid-cols-3">
            {routineProducts.map((p, i) => (
              <Link
                key={p.id}
                href={`/beauty/products/${p.id}`}
                className="group rounded-[24px] border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: "var(--b-border)" }}
              >
                <div className="text-[0.78rem] font-bold" style={{ color: "var(--b-gold)" }}>
                  STEP {i + 1}
                </div>
                <div className="mx-auto mt-2 h-[110px] w-fit transition-transform group-hover:scale-105">
                  <ProductVisual category={p.category} variant={p.id.length} className="h-full" />
                </div>
                <div className="mt-2 text-center">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-[0.85rem]" style={{ color: "var(--b-text-soft)" }}>
                    ₩{p.price.toLocaleString()}
                  </div>
                </div>
                {result?.reasons[p.id] && (
                  <p className="mt-2.5 line-clamp-3 text-[0.83rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
                    {result.reasons[p.id]}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 다시 구매할 제품 (루틴 기반 제안) */}
      {routineProducts.length > 0 && (
        <section className="mt-10">
          <SectionTitle
            icon={<RefreshCcw size={19} aria-hidden />}
            title="다시 구매할 제품"
            sub="추천 루틴에 담긴 제품을 다시 찾기 쉽게 모아두었어요"
          />
          <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
            {routineProducts.slice(0, 4).map((p) => (
              <BeautyProductCard key={p.id} product={p} aiBadge="재구매 추천" />
            ))}
          </div>
        </section>
      )}

      {/* 저장한 제품 */}
      {wishedProducts.length > 0 && (
        <section className="mt-10" id="saved">
          <SectionTitle icon={<Heart size={19} aria-hidden />} title="저장한 제품" sub={`찜한 제품 ${wishedProducts.length}개`} />
          <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
            {wishedProducts.map((p) => (
              <BeautyProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 최근 본 제품 */}
      {viewedProducts.length > 0 && (
        <section className="mt-10">
          <SectionTitle icon={<History size={19} aria-hidden />} title="최근 본 제품" sub="최근 조회한 순서" />
          <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
            {viewedProducts.slice(0, 4).map((p) => (
              <BeautyProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-center text-[0.8rem]" style={{ color: "var(--b-text-soft)" }}>
        뷰티 패스포트 데이터는 현재 이 브라우저에만 저장됩니다. 회원 연동 시 계정에 안전하게 보관됩니다.
      </p>
    </div>
  );
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-[1.3rem] font-bold" style={{ color: "var(--b-navy)" }}>
        <span style={{ color: "var(--b-gold)" }}>{icon}</span>
        {title}
      </h2>
      {sub && (
        <p className="mt-0.5 text-[0.88rem]" style={{ color: "var(--b-text-soft)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
