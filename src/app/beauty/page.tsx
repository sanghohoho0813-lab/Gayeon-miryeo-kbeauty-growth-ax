"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical, Leaf, Recycle, Sparkles } from "lucide-react";
import { demoRepository } from "@/lib/repository";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import { ProductVisual } from "@/components/shared/ProductVisual";

export default function BeautyHome() {
  const products = demoRepository.products;
  const best = products.filter((p) => p.isBest);
  const news = products.filter((p) => p.isNew);
  const recommended = [...best, ...news, ...products].filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  ).slice(0, 4);
  const routineSet = products
    .filter((p) => ["p-ton-01", "p-ess-01", "p-crm-01", "p-sun-01"].includes(p.id))
    .sort((a, b) => a.routineStep - b.routineStep);

  return (
    <div>
      {/* Hero */}
      <section
        className="mt-5 overflow-hidden rounded-[28px] border"
        style={{ borderColor: "var(--b-border)", background: "linear-gradient(135deg, #ffffff 0%, #f4efe6 55%, #e9e1d0 100%)" }}
      >
        <div className="grid items-center gap-6 p-7 md:grid-cols-2 md:p-12">
          <div>
            <p className="text-[0.85rem] font-bold tracking-[0.2em]" style={{ color: "var(--b-gold)" }}>
              MIRYEO AI BEAUTY
            </p>
            <h1
              className="font-display mt-3 text-[2rem] font-bold leading-[1.25] md:text-[2.7rem]"
              style={{ color: "var(--b-navy)" }}
            >
              오늘의 피부에 맞는
              <br />
              MIRYEO를 찾아보세요
            </h1>
            <p className="mt-4 max-w-md text-[1rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
              피부 고민과 원하는 사용감을 선택하면 MIRYEO 제품과 데일리 루틴을 추천해드립니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/beauty/finder"
                className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl px-6 text-[1rem] font-bold text-white transition-transform hover:scale-[1.02]"
                style={{ background: "var(--b-navy)" }}
              >
                <Sparkles size={18} aria-hidden />
                AI Beauty Finder 시작
              </Link>
              <Link
                href="/beauty/products"
                className="inline-flex min-h-[52px] items-center gap-1.5 rounded-2xl border-2 bg-white/70 px-6 text-[1rem] font-bold transition-colors hover:bg-white"
                style={{ borderColor: "var(--b-navy)", color: "var(--b-navy)" }}
              >
                제품 둘러보기
                <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          </div>
          <div className="hidden items-end justify-center gap-4 md:flex" aria-hidden>
            <div className="h-[150px] opacity-90"><ProductVisual category="토너/미스트" className="h-full" /></div>
            <div className="h-[210px]"><ProductVisual category="에센스/앰플" className="h-full" /></div>
            <div className="h-[130px]"><ProductVisual category="크림" className="h-full" /></div>
            <div className="h-[170px] opacity-90"><ProductVisual category="에센스/앰플" variant={1} className="h-full" /></div>
          </div>
        </div>
      </section>

      {/* 피부 고민 바로가기 */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>
              피부 고민별 추천
            </h2>
            <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
              지금 나에게 필요한 케어를 선택해보세요
            </p>
          </div>
          <Link href="/beauty/products" className="text-[0.9rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {CONCERNS.map((c) => (
            <Link
              key={c.id}
              href={`/beauty/products?concern=${encodeURIComponent(c.id)}`}
              className="flex flex-col items-center gap-2.5 rounded-2xl border bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: "var(--b-border)" }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "var(--b-surface-warm)", color: "var(--b-navy)" }}
              >
                <c.icon size={22} aria-hidden />
              </span>
              <span className="text-[0.88rem] font-bold leading-tight">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* AI Finder CTA */}
      <section
        className="mt-12 grid items-center gap-6 rounded-[28px] p-8 md:grid-cols-[1fr_auto] md:p-10"
        style={{ background: "var(--b-navy)" }}
      >
        <div>
          <h2 className="font-display text-[1.6rem] font-bold text-white md:text-[1.85rem]">
            나만을 위한 AI 뷰티 파인더
          </h2>
          <p className="mt-2.5 max-w-xl text-[0.98rem] leading-relaxed text-white/70">
            6단계 질문으로 나의 피부를 분석하고 맞춤 제품과 루틴을 추천받아보세요.
            피부 분석 · 맞춤 추천 · 루틴 제안 · 성과 추적까지.
          </p>
        </div>
        <Link
          href="/beauty/finder"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-7 text-[1rem] font-bold transition-transform hover:scale-[1.02]"
          style={{ color: "var(--b-navy)" }}
        >
          지금 시작하기
          <ArrowRight size={18} aria-hidden />
        </Link>
      </section>

      {/* 추천 제품 */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>
              MIRYEO 추천 제품
            </h2>
            <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
              AI가 선택한 지금 가장 사랑받는 제품
            </p>
          </div>
          <Link href="/beauty/products" className="text-[0.9rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {recommended.map((p) => (
            <BeautyProductCard key={p.id} product={p} aiBadge={p.isBest ? "AI 추천" : undefined} />
          ))}
        </div>
      </section>

      {/* Routine Set */}
      <section className="mt-12 rounded-[28px] border bg-white p-7 md:p-9" style={{ borderColor: "var(--b-border)" }}>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>
              나의 맞춤 루틴 — 아침 루틴 예시
            </h2>
            <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>
              AI Beauty Finder를 완료하면 나만의 루틴으로 바뀝니다
            </p>
          </div>
          <Link href="/beauty/finder" className="hidden text-[0.9rem] font-semibold sm:block" style={{ color: "var(--b-navy)" }}>
            내 루틴 만들기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {routineSet.map((p, i) => (
            <Link
              key={p.id}
              href={`/beauty/products/${p.id}`}
              className="group rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: "var(--b-border)" }}
            >
              <div className="text-[0.78rem] font-bold" style={{ color: "var(--b-gold)" }}>
                STEP {i + 1}
              </div>
              <div className="mx-auto mt-2 h-[110px] w-fit transition-transform group-hover:scale-105">
                <ProductVisual category={p.category} variant={p.id.length} className="h-full" />
              </div>
              <div className="mt-2 text-[0.92rem] font-bold leading-snug">{p.name}</div>
              <div className="text-[0.8rem]" style={{ color: "var(--b-text-soft)" }}>
                {p.category}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MIRYEO Story + 신뢰 요소 */}
      <section className="mt-12">
        <h2 className="font-display mb-5 text-[1.5rem] font-bold" style={{ color: "var(--b-navy)" }}>
          MIRYEO 스토리
        </h2>
        <p className="mb-6 max-w-2xl text-[0.98rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
          과학과 자연의 균형으로, 당신의 아름다움을 완성합니다. MIRYEO는 피부 데이터를 이해하는
          K-Beauty 브랜드를 지향합니다.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FlaskConical,
              title: "AI 기반 피부 연구",
              desc: "고객의 피부 고민 데이터를 분석해 제품과 루틴 제안을 계속 발전시킵니다.",
            },
            {
              icon: Leaf,
              title: "클린 & 안전한 성분 기준",
              desc: "엄격한 기준으로 성분을 선별합니다. 상세 성분 정보는 제품별로 제공됩니다.",
            },
            {
              icon: Recycle,
              title: "지속 가능한 아름다움",
              desc: "환경을 생각하는 패키지와 지속 가능한 뷰티 가치를 실천하려 노력합니다.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--b-border)" }}>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "var(--b-surface-warm)", color: "var(--b-navy)" }}
              >
                <s.icon size={22} aria-hidden />
              </span>
              <h3 className="mt-4 text-[1.05rem] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Beauty Passport CTA */}
      <section
        className="mt-12 flex flex-col items-center gap-4 rounded-[28px] border p-9 text-center"
        style={{ borderColor: "var(--b-gold)", background: "linear-gradient(150deg, #fff, var(--b-surface-warm))" }}
      >
        <p className="text-[0.82rem] font-bold tracking-[0.2em]" style={{ color: "var(--b-gold)" }}>
          MY BEAUTY PASSPORT
        </p>
        <h2 className="font-display text-[1.5rem] font-bold md:text-[1.7rem]" style={{ color: "var(--b-navy)" }}>
          나의 피부 데이터를 기록하고, 더 정확한 추천을 받아보세요
        </h2>
        <Link
          href="/beauty/passport"
          className="mt-1 inline-flex min-h-[52px] items-center gap-2 rounded-2xl px-7 text-[1rem] font-bold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "var(--b-navy)" }}
        >
          뷰티 패스포트 열기
          <ArrowRight size={17} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
