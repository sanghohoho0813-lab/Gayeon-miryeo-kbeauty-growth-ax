"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import { isFeatured, useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { formatDay, STEP_LABEL, useBeautyMemory } from "@/components/beauty/useBeautyMemory";
import { RepurchaseNotice } from "@/components/beauty/Repurchase";

/* 고객 홈 — "오늘의 나를 위한 개인화 뷰티 홈" (D-073)
   ① 오늘의 메시지 ② 1분 피부 상담(Finder) ③ 최근 추천 루틴 ④ 나의 피부 고민 ⑤ 추천 제품 ⑥ 뷰티 패스포트
   카드 대신 여백·구분선·타이포그래피. 개인화 문구는 저장된 실제 기록이 있을 때만. */
export default function BeautyHome() {
  const { products } = useBeautyData();
  const mem = useBeautyMemory();
  const featured = products.filter((p) => isFeatured(p));
  const recommended = [...products].sort((a, b) => Number(!!b.isBest) - Number(!!a.isBest) || Number(!!b.isNew) - Number(!!a.isNew)).slice(0, 4);
  const example = [1, 2, 3, 4].map((step) => products.find((p) => p.routineStep === step)).filter((p): p is NonNullable<typeof p> => !!p);
  const myRoutine = mem.result ? mem.result.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p) : [];
  const greeting = mem.name ? `안녕하세요, ${mem.name}님` : "안녕하세요";

  return (
    <div>
      {/* 회원 재구매 시점 (D-081) — 본인 구매 기록이 있고 시점이 가까울 때만 */}
      <RepurchaseNotice />
      {/* ① 오늘의 메시지 — 큰 제목 · 짧은 설명 · CTA 2개 · 큰 사진 */}
      <section className="grid items-center gap-8 pt-8 @3xl:grid-cols-[1.05fr_1fr] @3xl:gap-12 @3xl:pt-14">
        <div className="order-2 @3xl:order-1">
          <p className="b-eyebrow">MIRYEO AI BEAUTY</p>
          <p className="mt-5 text-[1rem] font-semibold" style={{ color: "var(--b-text-soft)" }} data-testid="home-greeting">
            {greeting} · {mem.loaded && mem.result ? "오늘 피부 컨디션은 어떠세요?" : "오늘의 피부를 위한 시간"}
          </p>
          <h1 className="b-display mt-3 text-[2.15rem] @3xl:text-[3.2rem]">
            오늘의 피부에 맞는<br />MIRYEO를 찾아보세요
          </h1>
          <p className="b-body mt-5 max-w-[30rem]">피부 고민과 원하는 사용감을 알려 주시면 MIRYEO 제품으로 나만의 데일리 루틴을 구성해 드려요. 결과는 뷰티 패스포트에 차곡차곡 쌓입니다.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/beauty/finder" className="b-btn pressable"><Sparkles size={17} aria-hidden /> 1분 피부 추천 시작</Link>
            <Link href="/beauty/products" className="b-link">제품 둘러보기 <ArrowRight size={16} aria-hidden /></Link>
          </div>
        </div>
        <div className="relative order-1 @3xl:order-2" aria-hidden data-testid="hero-photos">
          {/* 아치형 배경 위 실사 제품 (같은 축척) */}
          <div className="absolute inset-x-[6%] bottom-0 top-[6%] rounded-t-[999px]" style={{ background: "linear-gradient(180deg, var(--b-surface-warm), #efe8dc)" }} />
          {/* 폭 기준(%) 배치 — 4병이 겹쳐도 화면 폭을 넘지 않음 (34% × 4 − 12% × 3 = 100%) */}
          <div className="relative mx-auto flex max-w-[560px] items-end justify-center pb-6 pt-10">
            {["toner-e", "ampoule-b", "cream-i", "essence-a"].map((n, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일
              <img key={n} src={`/images/products/${n}.webp`} alt="" width={600} height={824} decoding="async"
                className={`relative h-auto w-[34%] drop-shadow-[0_18px_22px_rgba(40,30,15,0.16)] ${i ? "-ml-[12%]" : ""} ${i === 2 ? "z-10" : ""}`} />
            ))}
          </div>
          <p className="relative pb-1 text-center text-[0.72rem] tracking-[0.18em]" style={{ color: "var(--b-text-soft)" }}>TONER · AMPOULE · CREAM · ESSENCE</p>
        </div>
      </section>

      {/* ② 1분 피부 상담 — 3단계 + 추천 방식 (평면) */}
      <section className="mt-20 border-t pt-12 @3xl:mt-28" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-consult">
        <div className="grid gap-10 @3xl:grid-cols-[0.9fr_1.6fr] @3xl:gap-16">
          <div>
            <p className="b-eyebrow">AI BEAUTY FINDER</p>
            <h2 id="h-consult" className="b-section mt-3 text-[1.7rem] @3xl:text-[2.1rem]">나를 위한<br />1분 피부 상담</h2>
            <p className="b-body mt-4">다섯 가지 질문에 답하면 고민에 맞는 루틴을 단계별로 구성하고, 왜 추천했는지 함께 알려 드려요.</p>
            <ol className="mt-6 space-y-0">
              {["오늘의 피부 고민", "원하는 케어와 사용감", "나의 루틴 스타일"].map((t, i) => (
                <li key={t} className="flex items-baseline gap-4 border-t py-3 last:border-b" style={{ borderColor: "var(--b-line)" }}>
                  <span className="b-serif text-[0.95rem] tabular" style={{ color: "var(--b-gold-ink)" }}>0{i + 1}</span>
                  <span className="text-[0.95rem] font-semibold">{t}</span>
                </li>
              ))}
            </ol>
            <Link href="/beauty/finder" className="b-btn pressable mt-7">상담 시작하기 <ArrowRight size={17} aria-hidden /></Link>
          </div>
          <div className="grid gap-8 @xl:grid-cols-3 @xl:gap-6">
            {[
              { img: "card-recommendation", title: "고민에서 시작하는 추천", desc: "선택한 피부 고민과 사용감, 루틴 단계를 기준으로 제품을 조합합니다." },
              { img: "card-evidence", title: "근거를 함께 보여드려요", desc: "추천 결과마다 왜 이 제품인지 이유를 함께 안내합니다." },
              { img: "card-passport", title: "기록이 이어지는 패스포트", desc: "추천 결과와 찜한 제품을 저장해 다음 방문 때 이어볼 수 있어요." },
            ].map((s) => (
              <div key={s.title} className="flex gap-5 @xl:block">
                {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
                <img src={`/images/beauty/${s.img}.webp`} alt="" width={512} height={512} loading="lazy" decoding="async" className="h-[104px] w-auto shrink-0 @xl:h-[170px]" />
                <div>
                  <h3 className="text-[1rem] font-bold @xl:mt-3">{s.title}</h3>
                  <p className="b-body mt-1.5 text-[0.88rem]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 최근 추천 루틴 (저장된 결과가 있을 때) / 루틴 예시 */}
      <section className="mt-20 border-t pt-12" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-routine" data-testid="home-routine">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="b-eyebrow">{myRoutine.length ? `MY ROUTINE · ${formatDay(mem.result!.createdAt)}` : "DAILY ROUTINE"}</p>
            <h2 id="h-routine" className="b-section mt-3 text-[1.6rem] @3xl:text-[1.9rem]">{myRoutine.length ? (mem.name ? `${mem.name}님의 최근 추천 루틴` : "최근 추천 루틴") : "데일리 루틴 예시"}</h2>
            <p className="b-body mt-1.5">{myRoutine.length ? `${mem.result!.profile.concerns.join(" · ")} 고민으로 구성한 루틴이에요` : "AI 뷰티 파인더를 완료하면 나만의 루틴으로 바뀝니다"}</p>
          </div>
          <Link href={myRoutine.length ? "/beauty/passport" : "/beauty/finder"} className="b-link">{myRoutine.length ? "패스포트에서 보기" : "내 루틴 만들기"} <ArrowRight size={16} aria-hidden /></Link>
        </div>
        <ol className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 @3xl:grid-cols-4 @3xl:gap-0">
          {(myRoutine.length ? myRoutine : example).map((p, i) => (
            <li key={p.id} className="@3xl:border-l @3xl:px-6 @3xl:first:border-l-0 @3xl:first:pl-0" style={{ borderColor: "var(--b-line)" }}>
              <Link href={`/beauty/products/${p.id}`} className="group block">
                <div className="flex items-baseline gap-2">
                  <span className="b-serif text-[1.5rem]" style={{ color: "var(--b-gold-ink)" }}>0{i + 1}</span>
                  <span className="b-caption font-semibold">{STEP_LABEL[p.routineStep ?? 0] ?? p.category}</span>
                </div>
                <div className="mt-3 flex h-[120px] items-end transition-transform duration-500 group-hover:-translate-y-0.5">
                  <ProductVisual category={p.category} variant={p.id.length} productId={p.id} className="h-full" />
                </div>
                <div className="mt-3 text-[0.95rem] font-bold leading-snug">{p.name}</div>
                {myRoutine.length > 0 && mem.result?.reasons[p.id] && <p className="mt-1 line-clamp-2 text-[0.82rem] leading-snug" style={{ color: "var(--b-text-soft)" }}>{mem.result.reasons[p.id]}</p>}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ④ 나의 피부 고민 — 아이콘 + 글자 (가벼운 선택) */}
      <section className="mt-20 border-t pt-12" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-concern">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="b-eyebrow">SKIN CONCERNS</p>
            <h2 id="h-concern" className="b-section mt-3 text-[1.6rem] @3xl:text-[1.9rem]">{mem.concerns.length ? "나의 주요 피부 고민" : "피부 고민별 추천"}</h2>
            <p className="b-body mt-1.5">{mem.concerns.length ? "표시된 고민은 최근 상담에서 선택하신 것이에요" : "지금 필요한 케어를 골라보세요"}</p>
          </div>
          <Link href="/beauty/products" className="b-link">전체 보기 →</Link>
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-y-2 @3xl:grid-cols-6">
          {CONCERNS.map((c) => {
            const mine = mem.concerns.includes(c.id);
            return (
              <li key={c.id}>
                <Link href={`/beauty/products?concern=${encodeURIComponent(c.id)}`} className="group flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl px-1 text-center transition-colors hover:bg-white/70">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full border transition-colors" style={mine ? { background: "var(--b-ink)", borderColor: "var(--b-ink)", color: "#fff" } : { borderColor: "var(--b-line-strong)", color: "var(--b-ink)" }}>
                    <c.icon size={20} strokeWidth={1.7} aria-hidden />
                  </span>
                  <span className="text-[0.84rem] font-semibold leading-tight">{c.label}</span>
                  {mine && <span className="text-[0.66rem] font-bold tracking-wide" style={{ color: "var(--b-gold-ink)" }}>나의 고민</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ⑤ 추천 제품 — AX Action 반영 시 '지금 주목받는 제품' 먼저 (Closed Loop) */}
      {featured.length > 0 && (
        <section className="mt-20 border-t pt-12" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-featured">
          <p className="b-eyebrow">NOW TRENDING</p>
          <h2 id="h-featured" className="b-section mt-3 text-[1.6rem] @3xl:text-[1.9rem]">지금 주목받는 제품</h2>
          <p className="b-body mt-1.5">최근 많은 분들이 피부 추천에서 저장한 제품이에요.</p>
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 @3xl:grid-cols-4 @3xl:gap-x-6">
            {featured.slice(0, 4).map((p) => <BeautyProductCard key={p.id} product={p} aiBadge="주목" />)}
          </div>
        </section>
      )}
      <section className="mt-20 border-t pt-12" style={{ borderColor: "var(--b-line)" }} aria-labelledby="h-recommended">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="b-eyebrow">FOR YOU</p>
            <h2 id="h-recommended" className="b-section mt-3 text-[1.6rem] @3xl:text-[1.9rem]">MIRYEO 추천 제품</h2>
            <p className="b-body mt-1.5">{mem.concerns.length ? `${mem.concerns.slice(0, 2).join(" · ")} 고민과 함께 보면 좋은 제품이에요` : "베스트·신제품을 먼저 보여드려요"}</p>
          </div>
          <Link href="/beauty/products" className="b-link">전체 보기 →</Link>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 @3xl:grid-cols-4 @3xl:gap-x-6">
          {recommended.map((p) => <BeautyProductCard key={p.id} product={p} aiBadge={p.isBest ? "추천" : undefined} />)}
        </div>
      </section>

      {/* ⑥ 뷰티 패스포트 — 기록이 쌓이는 곳 */}
      <section className="mt-20 overflow-hidden rounded-[32px] px-7 py-10 @3xl:px-14 @3xl:py-14" style={{ background: "var(--b-ink)" }} aria-labelledby="h-passport" data-testid="home-passport">
        <div className="grid items-center gap-8 @3xl:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="b-eyebrow" style={{ color: "var(--theme-highlight)" }}>MY BEAUTY PASSPORT</p>
            <h2 id="h-passport" className="b-serif mt-3 text-[1.7rem] font-semibold leading-snug text-white @3xl:text-[2.1rem]">{mem.result ? "나의 뷰티 기록이 쌓이고 있어요" : "나의 추천 기록을 모아보세요"}</h2>
            <dl className="mt-6 grid max-w-[28rem] grid-cols-3 border-t border-white/15 pt-5 text-white">
              <div><dt className="text-[0.74rem] text-white/60">최근 분석</dt><dd className="mt-1 text-[1.05rem] font-bold">{mem.result ? formatDay(mem.result.createdAt) : "—"}</dd></div>
              <div><dt className="text-[0.74rem] text-white/60">관심 제품</dt><dd className="mt-1 text-[1.05rem] font-bold tabular">{mem.wishlist.length}개</dd></div>
              <div><dt className="text-[0.74rem] text-white/60">최근 본 제품</dt><dd className="mt-1 text-[1.05rem] font-bold tabular">{mem.viewed.length}개</dd></div>
            </dl>
            <Link href="/beauty/passport" className="pressable mt-8 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-6 font-bold" style={{ color: "var(--b-ink)" }}>뷰티 패스포트 열기 <ArrowRight size={17} aria-hidden /></Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
          <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} loading="lazy" decoding="async" className="mx-auto hidden h-[220px] w-auto @3xl:block" />
        </div>
      </section>
    </div>
  );
}
