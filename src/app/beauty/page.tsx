"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical, Leaf, Recycle, Sparkles, TrendingUp } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import { isFeatured, useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { ProductVisual } from "@/components/shared/ProductVisual";

export default function BeautyHome() {
  const { products } = useBeautyData();
  const featured = products.filter((p) => isFeatured(p));
  const recommended = [...products].sort((a, b) => Number(!!b.isBest) - Number(!!a.isBest) || Number(!!b.isNew) - Number(!!a.isNew)).slice(0, 4);
  const routine = [1, 2, 3, 4].map((step) => products.find((p) => p.routineStep === step)).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div>
      {/* Hero — Front Reference: 아이보리 + 네이비/골드 보틀 구성 */}
      <section className="mt-5 overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--b-border)", background: "linear-gradient(135deg, #ffffff 0%, #f4efe6 55%, #e9e1d0 100%)" }}>
        <div className="grid items-center gap-6 p-7 @3xl:grid-cols-2 @3xl:p-12">
          <div>
            <p className="text-[0.82rem] font-bold tracking-[0.2em]" style={{ color: "var(--b-gold-ink)" }}>MIRYEO AI BEAUTY</p>
            <h1 className="font-display mt-3 text-[2rem] font-bold leading-[1.25] @3xl:text-[2.7rem]" style={{ color: "var(--b-navy)" }}>
              오늘의 피부에 맞는<br />MIRYEO를 찾아보세요
            </h1>
            <p className="mt-4 max-w-md text-[1rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>피부 고민과 원하는 사용감을 고르면, MIRYEO 제품으로 데일리 루틴을 구성해 드립니다. 결과는 뷰티 패스포트에 저장할 수 있어요.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/beauty/finder" className="pressable inline-flex min-h-[54px] items-center gap-2 rounded-2xl px-6 text-[1.02rem] font-bold text-white transition-transform hover:-translate-y-0.5" style={{ background: "var(--b-navy)" }}>
                <Sparkles size={18} aria-hidden /> 1분 피부 추천 시작
              </Link>
              <Link href="/beauty/products" className="pressable inline-flex min-h-[54px] items-center gap-1.5 rounded-2xl border-2 bg-white/70 px-6 text-[1rem] font-bold hover:bg-white" style={{ borderColor: "var(--b-navy)", color: "var(--b-navy)" }}>
                제품 둘러보기 <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          </div>
          <div className="hidden items-end justify-center gap-4 @3xl:flex" aria-hidden>
            <div className="h-[150px] opacity-90"><ProductVisual category="토너/미스트" className="h-full" /></div>
            <div className="h-[210px]"><ProductVisual category="에센스/앰플" className="h-full" /></div>
            <div className="h-[130px]"><ProductVisual category="크림" className="h-full" /></div>
            <div className="h-[170px] opacity-90"><ProductVisual category="에센스/앰플" variant={1} className="h-full" /></div>
          </div>
        </div>
      </section>

      {/* 피부 고민 */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>피부 고민별 추천</h2>
            <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>지금 필요한 케어를 골라보세요</p>
          </div>
          <Link href="/beauty/products" className="text-[0.9rem] font-semibold hover:underline" style={{ color: "var(--b-text-soft)" }}>전체 보기 →</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 @3xl:grid-cols-6">
          {CONCERNS.map((c) => (
            <Link key={c.id} href={`/beauty/products?concern=${encodeURIComponent(c.id)}`} className="pressable flex flex-col items-center gap-2.5 rounded-2xl border bg-white p-4 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "var(--b-border)" }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--b-surface-warm)", color: "var(--b-navy)" }}><c.icon size={22} aria-hidden /></span>
              <span className="text-[0.86rem] font-bold leading-tight">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* AX Action → 고객 화면 반영 (Closed Loop) */}
      {featured.length > 0 && (
        <section className="mt-12 rounded-[28px] border p-6 @3xl:p-8" style={{ borderColor: "var(--b-gold)", background: "linear-gradient(150deg, #fff, var(--b-surface-warm))" }}>
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp size={20} style={{ color: "var(--b-gold-ink)" }} aria-hidden />
            <h2 className="font-display text-[1.45rem] font-bold" style={{ color: "var(--b-navy)" }}>지금 주목받는 제품</h2>
          </div>
          <p className="-mt-3 mb-5 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>최근 많은 분들이 피부 추천에서 저장한 제품이에요.</p>
          <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
            {featured.slice(0, 4).map((p) => <BeautyProductCard key={p.id} product={p} aiBadge="주목" />)}
          </div>
        </section>
      )}

      {/* Finder CTA — Primary Conversion */}
      <section className="mt-12 grid items-center gap-6 rounded-[28px] p-8 @3xl:grid-cols-[1fr_auto] @3xl:p-10" style={{ background: "var(--b-navy)" }}>
        <div>
          <h2 className="font-display text-[1.6rem] font-bold text-white @3xl:text-[1.85rem]">나만을 위한 AI 뷰티 파인더</h2>
          <p className="mt-2.5 max-w-xl text-[0.98rem] leading-relaxed text-white/75">5가지 질문에 답하면 루틴을 추천하고, 결과를 뷰티 패스포트에 저장해 다음 방문 때도 이어볼 수 있어요.</p>
        </div>
        <Link href="/beauty/finder" className="pressable inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-white px-7 text-[1rem] font-bold transition-transform hover:-translate-y-0.5" style={{ color: "var(--b-navy)" }}>
          지금 시작하기 <ArrowRight size={18} aria-hidden />
        </Link>
      </section>

      {/* 추천 제품 */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>MIRYEO 추천 제품</h2>
            <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>베스트·신제품을 먼저 보여드려요</p>
          </div>
          <Link href="/beauty/products" className="text-[0.9rem] font-semibold hover:underline" style={{ color: "var(--b-text-soft)" }}>전체 보기 →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
          {recommended.map((p) => <BeautyProductCard key={p.id} product={p} aiBadge={p.isBest ? "추천" : undefined} />)}
        </div>
      </section>

      {/* 루틴 예시 */}
      {routine.length > 0 && (
        <section className="mt-12 rounded-[28px] border bg-white p-7 @3xl:p-9" style={{ borderColor: "var(--b-border)" }}>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>데일리 루틴 예시</h2>
              <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>AI 뷰티 파인더를 완료하면 나만의 루틴으로 바뀝니다</p>
            </div>
            <Link href="/beauty/finder" className="hidden text-[0.9rem] font-semibold hover:underline @md:block" style={{ color: "var(--b-navy)" }}>내 루틴 만들기 →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
            {routine.map((p, i) => (
              <Link key={p.id} href={`/beauty/products/${p.id}`} className="group pressable rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "var(--b-border)" }}>
                <div className="text-[0.76rem] font-bold" style={{ color: "var(--b-gold-ink)" }}>STEP {i + 1}</div>
                <div className="mx-auto mt-2 h-[110px] w-fit transition-transform duration-300 group-hover:scale-[1.04]"><ProductVisual category={p.category} variant={p.id.length} className="h-full" /></div>
                <div className="mt-2 text-[0.9rem] font-bold leading-snug">{p.name}</div>
                <div className="text-[0.78rem]" style={{ color: "var(--b-text-soft)" }}>{p.category}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 브랜드 약속 — 사실 확인 전 효능·인증 주장 없음 */}
      <section className="mt-12">
        <h2 className="font-display mb-5 text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>MIRYEO가 추천하는 방식</h2>
        <div className="grid gap-4 @3xl:grid-cols-3">
          {[
            { icon: FlaskConical, title: "고민에서 시작하는 추천", desc: "선택한 피부 고민과 사용감, 루틴 단계를 기준으로 제품을 조합합니다." },
            { icon: Leaf, title: "근거를 함께 보여드려요", desc: "추천 결과마다 왜 이 제품인지 이유를 함께 안내합니다." },
            { icon: Recycle, title: "기록이 이어지는 패스포트", desc: "추천 결과와 찜한 제품을 저장해 다음 방문 때 이어볼 수 있어요." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--b-border)" }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--b-surface-warm)", color: "var(--b-navy)" }}><s.icon size={22} aria-hidden /></span>
              <h3 className="mt-4 text-[1.05rem] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 flex flex-col items-center gap-4 rounded-[28px] border p-9 text-center" style={{ borderColor: "var(--b-gold)", background: "linear-gradient(150deg, #fff, var(--b-surface-warm))" }}>
        <p className="text-[0.8rem] font-bold tracking-[0.2em]" style={{ color: "var(--b-gold-ink)" }}>MY BEAUTY PASSPORT</p>
        <h2 className="font-display text-[1.45rem] font-bold @3xl:text-[1.7rem]" style={{ color: "var(--b-navy)" }}>나의 추천 기록을 모아보세요</h2>
        <Link href="/beauty/passport" className="pressable mt-1 inline-flex min-h-[52px] items-center gap-2 rounded-2xl px-7 font-bold text-white" style={{ background: "var(--b-navy)" }}>뷰티 패스포트 열기 <ArrowRight size={17} aria-hidden /></Link>
      </section>
    </div>
  );
}
