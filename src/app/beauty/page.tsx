"use client";

import Link from "next/link";
import { ArrowRight, BookHeart, Sparkles } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { isFeatured, useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { formatDay, STEP_LABEL, useBeautyMemory } from "@/components/beauty/useBeautyMemory";
import { RepurchaseNotice } from "@/components/beauty/Repurchase";
import { CategoryRail, ConcernTiles, PromoCarousel, QuickMenu, SearchLink, SectionHead, type Banner } from "@/components/beauty/ui";

/* 고객 홈 — 커머스형 (PASS 26, D-082): 인사 · 검색 → 배너 → 피부 고민 타일 → 제품 종류 → 주목·추천 상품 줄 → 1분 상담 → 내 루틴 → 추천 방식 → 패스포트
   개인화 문구는 저장된 실제 기록이 있을 때만 (D-073 원칙 유지). 배너·문구는 실제 기능만 — 할인·별점·배송 문구 없음 */
const photo = (n: string, cls: string) => (
  // eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일
  <img src={`/images/products/${n}.webp`} alt="" width={600} height={824} decoding="async" className={`h-auto drop-shadow-[0_14px_16px_rgba(40,25,15,0.22)] ${cls}`} />
);

export default function BeautyHome() {
  const { products } = useBeautyData();
  const mem = useBeautyMemory();
  const featured = products.filter((p) => isFeatured(p));
  const recommended = [...products].sort((a, b) => Number(!!b.isBest) - Number(!!a.isBest) || Number(!!b.isNew) - Number(!!a.isNew));
  const example = [1, 2, 3, 4].map((step) => products.find((p) => p.routineStep === step)).filter((p): p is NonNullable<typeof p> => !!p);
  const myRoutine = mem.result ? mem.result.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p) : [];
  const routine = myRoutine.length ? myRoutine : example;
  // 최근 본 제품 (PASS 34, D-120) — 이 기기에서 실제로 본 제품만, 본 순서대로. 없으면 줄 자체를 보이지 않음
  const viewed = mem.viewed.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 8);

  const banners: Banner[] = [
    {
      key: "finder", href: "/beauty/finder", tag: "AI 뷰티 상담", title: "1분 피부 상담으로\n나만의 루틴 찾기", sub: "고민과 사용감을 고르면 단계별로 추천해요", cta: "상담 시작",
      bg: "linear-gradient(135deg, #FDE6EC 0%, #F6C9D6 100%)", testId: "hero-photos",
      art: <div className="relative mb-3 flex w-full items-end justify-center pr-1">{["toner-e", "ampoule-b", "cream-i", "essence-a"].map((n, i) => <span key={n} className={`relative w-[34%] ${i ? "-ml-[13%]" : ""} ${i === 2 ? "z-10" : ""}`}>{photo(n, "w-full")}</span>)}</div>,
    },
    {
      key: "best", href: "/beauty/products", tag: "MIRYEO 베스트", title: "MIRYEO 베스트·신제품\n한눈에 모아보기", sub: "피부 고민별로 골라 보세요", cta: "제품 보기",
      bg: "linear-gradient(135deg, #1C1D24 0%, #3B302B 100%)", dark: true,
      art: <div className="relative mb-2 flex w-full items-end justify-center"><span className="absolute bottom-6 h-[120px] w-[120px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(226,184,110,.45), transparent)" }} />{photo("ampoule-b", "relative w-[58%]")}</div>,
    },
    mem.member
      ? { key: "me", href: "/beauty/me", tag: "MY BEAUTY", title: "내 뷰티 기록\n한곳에서 보기", sub: "추천·구매 기록과 다시 살 시점", cta: "마이페이지", bg: "linear-gradient(135deg, #FFF3E6 0%, #F9DCC0 100%)",
          // eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일
          art: <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} decoding="async" className="mb-3 w-[86%]" /> }
      : { key: "join", href: "/beauty/login?mode=signup", tag: "회원 혜택", title: "회원이 되면\n다시 살 때를 알려드려요", sub: "추천·구매 기록을 계정에 보관해요", cta: "회원가입", bg: "linear-gradient(135deg, #FFF3E6 0%, #F9DCC0 100%)",
          // eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일
          art: <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} decoding="async" className="mb-3 w-[86%]" /> },
  ];

  return (
    <div className="pt-4 @3xl:pt-8">
      {/* 인사 · 검색 */}
      <p className="text-[0.86rem] font-semibold" style={{ color: "var(--b-text-soft)" }} data-testid="home-greeting">
        {mem.name ? `안녕하세요, ${mem.name}님` : "안녕하세요"} · {mem.loaded && mem.result ? "오늘 피부 컨디션은 어떠세요?" : "오늘의 피부를 위한 시간"}
      </p>
      <h1 className="b-display mt-1 text-[1.42rem] @3xl:text-[1.9rem]">오늘 피부에 맞는 MIRYEO를 찾아보세요</h1>
      <div className="mt-4 @3xl:max-w-[560px]"><SearchLink /></div>

      {/* 회원 재구매 시점 (D-081) — 본인 구매 기록이 있고 시점이 가까울 때만 */}
      <RepurchaseNotice />

      <div className="mt-6"><PromoCarousel banners={banners} /></div>
      <div className="mt-6 @3xl:mt-8"><QuickMenu member={mem.member} /></div>

      {viewed.length > 0 && (
        <section className="mt-9 @3xl:mt-12" aria-labelledby="h-viewed" data-testid="home-recent">
          <SectionHead id="h-viewed" title="최근 본 제품" sub="이 기기에서 본 순서예요" href="/beauty/passport#recent" linkLabel="패스포트에서 보기 →" />
          <div className="b-rail mt-4">{viewed.map((p) => <BeautyProductCard key={p.id} product={p} compact />)}</div>
        </section>
      )}

      <section className="mt-9 @3xl:mt-12" aria-labelledby="h-concern">
        <SectionHead id="h-concern" title={mem.concerns.length ? "나의 피부 고민으로 찾기" : "피부 고민으로 찾기"} sub={mem.concerns.length ? "최근 상담에서 고른 고민에 표시했어요" : "지금 필요한 케어를 골라보세요"} href="/beauty/products" />
        <div className="mt-4"><ConcernTiles mine={mem.concerns} /></div>
      </section>

      <section className="mt-9 @3xl:mt-12" aria-labelledby="h-category">
        <SectionHead id="h-category" title="제품 종류" />
        <div className="mt-3"><CategoryRail products={products} /></div>
      </section>

      {/* AX Action 반영 시 '지금 주목받는 제품' (Closed Loop) */}
      {featured.length > 0 && (
        <section className="mt-9 @3xl:mt-12" aria-labelledby="h-featured">
          <SectionHead id="h-featured" title="지금 주목받는 제품" sub="최근 많은 분들이 피부 추천에서 저장한 제품이에요" href="/beauty/products" />
          <div className="b-rail mt-4">{featured.map((p) => <BeautyProductCard key={p.id} product={p} aiBadge="주목" compact />)}</div>
        </section>
      )}

      {/* 1분 상담 */}
      <section className="mt-9 overflow-hidden rounded-[24px] @3xl:mt-12" style={{ background: "var(--b-ink)" }} aria-labelledby="h-consult">
        <div className="grid items-center gap-4 p-6 @3xl:grid-cols-[1.3fr_1fr] @3xl:p-10">
          <div>
            <span className="b-pill" style={{ background: "var(--b-rose-ink)", color: "#fff" }}><Sparkles size={12} aria-hidden /> AI BEAUTY FINDER</span>
            <h2 id="h-consult" className="mt-3 text-[1.3rem] font-extrabold leading-snug tracking-[-0.03em] text-white @3xl:text-[1.7rem]">나를 위한 1분 피부 상담</h2>
            <p className="mt-1.5 text-[0.88rem] text-white/70">다섯 가지 질문에 답하면 루틴을 단계별로 구성하고, 왜 추천했는지 알려 드려요.</p>
            <ol className="mt-4 flex flex-wrap gap-1.5">
              {["피부 고민", "케어·사용감", "루틴 스타일"].map((t, i) => (
                <li key={t} className="rounded-full border border-white/20 px-3 py-1.5 text-[0.78rem] font-bold text-white"><span style={{ color: "#F7A9BE" }}>0{i + 1}</span> {t}</li>
              ))}
            </ol>
            <Link href="/beauty/finder" className="b-btn pressable mt-5 w-full @md:w-auto">상담 시작하기 <ArrowRight size={17} aria-hidden /></Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
          <img src="/images/beauty/card-recommendation.webp" alt="" width={512} height={512} loading="lazy" decoding="async" className="mx-auto hidden h-[190px] w-auto @3xl:block" />
        </div>
      </section>

      <section className="mt-9 @3xl:mt-12" aria-labelledby="h-recommended">
        <SectionHead id="h-recommended" title="MIRYEO 추천 제품" sub={mem.concerns.length ? `${mem.concerns.slice(0, 2).join(" · ")} 고민과 함께 보면 좋은 제품` : "베스트·신제품을 먼저 보여드려요"} href="/beauty/products" />
        <div className="b-rail mt-4">{recommended.map((p) => <BeautyProductCard key={p.id} product={p} compact />)}</div>
      </section>

      {/* 최근 추천 루틴 (저장된 결과가 있을 때) / 루틴 예시 */}
      <section className="mt-9 @3xl:mt-12" aria-labelledby="h-routine" data-testid="home-routine">
        <SectionHead id="h-routine"
          title={myRoutine.length ? (mem.name ? `${mem.name}님의 최근 추천 루틴` : "최근 추천 루틴") : "데일리 루틴 예시"}
          sub={myRoutine.length ? `${formatDay(mem.result!.createdAt)} · ${mem.result!.profile.concerns.join(" · ")} 고민으로 구성` : "AI 뷰티 파인더를 완료하면 나만의 루틴으로 바뀝니다"}
          href={myRoutine.length ? "/beauty/passport" : "/beauty/finder"} linkLabel={myRoutine.length ? "패스포트 →" : "내 루틴 만들기 →"} />
        <ol className="b-rail mt-4">
          {routine.map((p, i) => (
            <li key={p.id} className="w-[200px] @3xl:w-[23%]">
              <Link href={`/beauty/products/${p.id}`} className="b-card flex h-full items-center gap-3 p-3">
                <span className="flex h-[72px] w-[56px] shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--b-surface-warm)" }}>
                  <span className="h-[82%]"><ProductVisual category={p.category} variant={p.id.length} productId={p.id} className="h-full" /></span>
                </span>
                <span className="min-w-0">
                  <span className="b-pill" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}>STEP {i + 1}</span>
                  <span className="mt-1 block truncate text-[0.9rem] font-bold">{p.name}</span>
                  <span className="b-caption block truncate">{STEP_LABEL[p.routineStep ?? 0] ?? p.category}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* 추천 방식 */}
      <section className="mt-9 @3xl:mt-12" aria-labelledby="h-how">
        <SectionHead id="h-how" title="MIRYEO AI 뷰티는 이렇게 추천해요" />
        {/* 모바일은 옆으로 넘김(키보드로도 넘길 수 있게 초점 받음), PC는 3칸 격자 */}
        <div className="b-rail mt-4 @3xl:!mx-0 @3xl:!grid @3xl:grid-cols-3 @3xl:!overflow-visible @3xl:!px-0" tabIndex={0} role="region" aria-label="추천 방식 소개">
          {[
            { img: "card-recommendation", tint: "var(--t-blush)", title: "고민에서 시작하는 추천", desc: "선택한 피부 고민·사용감·루틴 단계로 제품을 조합해요." },
            { img: "card-evidence", tint: "var(--t-lilac)", title: "근거를 함께 보여드려요", desc: "추천 결과마다 왜 이 제품인지 이유를 알려 드려요." },
            { img: "card-passport", tint: "var(--t-peach)", title: "기록이 이어지는 패스포트", desc: "추천 결과와 찜한 제품을 다음 방문 때 이어볼 수 있어요." },
          ].map((s) => (
            <div key={s.title} className="flex w-[260px] items-center gap-3 rounded-[20px] p-4 @3xl:w-auto" style={{ background: s.tint }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
              <img src={`/images/beauty/${s.img}.webp`} alt="" width={512} height={512} loading="lazy" decoding="async" className="h-[84px] w-auto shrink-0" />
              <div>
                <h3 className="text-[0.95rem] font-bold">{s.title}</h3>
                <p className="mt-1 text-[0.8rem] leading-snug" style={{ color: "var(--b-text-soft)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 뷰티 패스포트 */}
      <section className="b-card mt-9 flex flex-wrap items-center gap-4 p-5 @3xl:mt-12 @3xl:p-7" aria-labelledby="h-passport" data-testid="home-passport">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}><BookHeart size={24} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 id="h-passport" className="text-[1.05rem] font-extrabold">{mem.result ? "나의 뷰티 기록이 쌓이고 있어요" : "나의 추천 기록을 모아보세요"}</h2>
          <p className="b-caption mt-0.5 text-[0.84rem]">최근 분석 {mem.result ? formatDay(mem.result.createdAt) : "—"} · 관심 제품 {mem.wishlist.length}개 · 최근 본 제품 {mem.viewed.length}개</p>
        </div>
        <Link href="/beauty/passport" className="b-btn-line pressable w-full @md:w-auto">뷰티 패스포트 열기 <ArrowRight size={16} aria-hidden /></Link>
      </section>
    </div>
  );
}
