"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { BeautyProductCard } from "@/components/beauty/BeautyProductCard";
import { CONCERNS } from "@/components/beauty/concerns";
import { formatDay, STEP_LABEL, useBeautyMemory } from "@/components/beauty/useBeautyMemory";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { useCustomerSession } from "@/components/beauty/CustomerSession";
import { customerApi } from "@/lib/customer-account";
import type { SavedRecommendation } from "@/lib/types";
import { RepurchaseList, useMyRepurchase } from "@/components/beauty/Repurchase";
import { CONCERN_TINT } from "@/components/beauty/ui";

/** 비회원 Passport는 이 브라우저에만 저장 — 회원 전환 안내 (한 줄, 상자 없이) */
function MemberBanner() {
  const { session } = useCustomerSession();
  const member = !!session?.account && !session.operator;
  return (
    <p data-testid="member-banner" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[16px] px-4 py-2.5 text-[0.86rem]" style={{ background: "var(--b-canvas)", color: "var(--b-text-soft)" }}>
      {member ? (
        <><span>회원 계정에 추천·구매 기록이 보관되고 있습니다.</span><Link href="/beauty/me" className="b-link">마이페이지 →</Link></>
      ) : (
        <><span>지금 기록은 이 브라우저에만 저장됩니다. 회원이 되면 기기와 상관없이 보관하고 재구매 시점을 알려드려요.</span><Link href="/beauty/login?mode=signup" className="b-link">회원가입</Link></>
      )}
    </p>
  );
}

/* Beauty Passport — 서비스의 핵심 Retention (D-073 → PASS 26 D-082: 회원카드형 머리 · 카드 목록 · 굵은 고딕 제목). 현재 저장되는 데이터 범위 안에서 '나의 뷰티 기록이 쌓이고 있다'를 보여 준다. */
export default function PassportPage() {
  const mem = useBeautyMemory();
  const { products } = useBeautyData();
  const rep = useMyRepurchase();
  const [history, setHistory] = useState<SavedRecommendation[] | null>(null);
  useEffect(() => {
    if (!mem.member) return;
    customerApi().listMyRecommendations().then(setHistory).catch(() => setHistory(null));
  }, [mem.member]);

  const find = (id: string) => products.find((p) => p.id === id);
  const wishedProducts = products.filter((p) => mem.wishlist.includes(p.id));
  const viewedProducts = mem.viewed.map(find).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const routineProducts = mem.result ? mem.result.productIds.map(find).filter((p): p is NonNullable<typeof p> => Boolean(p)) : [];
  const result = mem.result;
  const hasData = mem.concerns.length > 0 || mem.wishlist.length > 0 || !!result || mem.viewed.length > 0 || rep.items.length > 0;
  const count = history?.length ?? (result ? 1 : 0);
  // 홈 '최근 본 제품 → 패스포트에서 보기'(#recent): 이 칸은 기기 기록을 읽은 뒤에 그려지므로, 그려진 때 한 번 맞춰 내려 준다 (PASS 34)
  const hasViewed = viewedProducts.length > 0;
  useEffect(() => {
    if (hasViewed && window.location.hash === "#recent") document.getElementById("recent")?.scrollIntoView({ block: "start" });
  }, [hasViewed]);

  return (
    <div className="pt-4 @3xl:pt-8">
      {/* 신분증형 머리 — 이름 · 최근 분석일 · 고민 · 기록 수 · 다시 분석. 첫 화면은 '내 기록'부터 (PASS 31: 회원 안내는 카드 아래로) */}
      <section className="overflow-hidden rounded-[28px] px-6 py-8 @3xl:px-12 @3xl:py-11" style={{ background: "linear-gradient(135deg, #1C1D24 0%, #3A2631 100%)" }} aria-labelledby="h-pass">
        <div className="grid items-center gap-8 @3xl:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="b-pill" style={{ background: "rgba(255,255,255,.14)", color: "#F7B6C8" }}>MY BEAUTY PASSPORT</span>
            <h1 id="h-pass" className="mt-3 text-[1.7rem] font-extrabold leading-tight tracking-[-0.03em] text-white @3xl:text-[2.3rem]">{mem.name ? `${mem.name}님의 피부 기록` : "나의 피부 데이터"}</h1>
            <p className="mt-2 text-[0.92rem] text-white/65">
              {result ? `최근 분석일 ${new Date(result.createdAt).toLocaleDateString("ko-KR")}` : "아직 AI 분석 기록이 없습니다. AI Beauty Finder로 시작해보세요."}
            </p>
            {mem.concerns.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {mem.concerns.map((c) => (
                  <span key={c} className="rounded-full border border-white/25 px-3.5 py-1.5 text-[0.84rem] font-semibold text-white">{CONCERNS.find((x) => x.id === c)?.label ?? c}</span>
                ))}
              </div>
            )}
            <dl className="mt-7 grid max-w-[30rem] grid-cols-3 border-t border-white/15 pt-5 text-white">
              <div><dt className="text-[0.74rem] text-white/60">분석 기록</dt><dd className="mt-1 text-[1.15rem] font-bold tabular">{count}회</dd></div>
              <div><dt className="text-[0.74rem] text-white/60">관심 제품</dt><dd className="mt-1 text-[1.15rem] font-bold tabular">{mem.wishlist.length}개</dd></div>
              <div><dt className="text-[0.74rem] text-white/60">최근 본 제품</dt><dd className="mt-1 text-[1.15rem] font-bold tabular">{mem.viewed.length}개</dd></div>
            </dl>
            <Link href="/beauty/finder" className="pressable mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 text-[0.98rem] font-extrabold @md:w-auto" style={{ color: "var(--b-rose-ink)" }}>
              <Sparkles size={17} aria-hidden />
              {result ? "다시 분석하기" : "AI 분석 시작"}
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
          <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} decoding="async" className="mx-auto hidden h-[220px] w-auto @3xl:block" />
        </div>
      </section>
      <div className="mt-4"><MemberBanner /></div>

      {mem.loaded && !hasData && (
        <section className="b-card mt-8 px-6 py-10 text-center">
          <p className="b-section text-[1.4rem]">뷰티 패스포트가 비어 있어요</p>
          <p className="b-body mx-auto mt-2 max-w-[30rem]">AI Beauty Finder로 피부를 분석하거나, 마음에 드는 제품을 찜하면 이곳에 기록됩니다.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3">
            <Link href="/beauty/finder" className="b-btn pressable">AI 분석 시작 <ArrowRight size={16} aria-hidden /></Link>
            <Link href="/beauty/products" className="b-link">제품 둘러보기</Link>
          </div>
        </section>
      )}

      {/* 최근 추천 루틴 */}
      {routineProducts.length > 0 && result && (
        <Section eyebrow={`MY ROUTINE · ${formatDay(result.createdAt)}`} title="내 추천 루틴" sub={`${result.profile.concerns.join(" · ")} 고민 · 최근 AI Beauty 분석 결과`}>
          <ol className="b-card b-list px-4 @3xl:px-6">
            {routineProducts.map((p, i) => (
              <li key={p.id} style={{ borderColor: "var(--b-line)" }}>
                <Link href={`/beauty/products/${p.id}`} className="group flex items-center gap-4 py-4 @xl:gap-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-extrabold tabular text-white" style={{ background: "var(--b-rose-ink)" }}>{i + 1}</span>
                  <div className="flex h-[84px] w-[64px] shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--b-surface-warm)" }}>
                    <div className="h-[82%]"><ProductVisual category={p.category} variant={p.id.length} productId={p.id} className="h-full" /></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="b-caption font-semibold">STEP {i + 1} · {STEP_LABEL[p.routineStep ?? 0] ?? p.category}</div>
                    <div className="mt-0.5 font-bold">{p.name}</div>
                    {result.reasons[p.id] && <p className="mt-0.5 line-clamp-1 text-[0.84rem]" style={{ color: "var(--b-text-soft)" }}>{result.reasons[p.id]}</p>}
                  </div>
                  <ArrowRight size={17} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--b-text-soft)" }} aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 나의 피부 고민 */}
      {mem.concerns.length > 0 && (
        <Section eyebrow="SKIN CONCERNS" title="나의 피부 고민" sub="최근 상담에서 선택하신 고민이에요">
          <ul className="flex flex-wrap gap-x-7 gap-y-4">
            {mem.concerns.map((c) => {
              const meta = CONCERNS.find((x) => x.id === c);
              return (
                <li key={c}>
                  <Link href={`/beauty/products?concern=${encodeURIComponent(c)}`} className="flex min-h-[44px] items-center gap-2.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: CONCERN_TINT[c]?.bg, color: CONCERN_TINT[c]?.fg }}>{meta ? <meta.icon size={19} strokeWidth={2} aria-hidden /> : null}</span>
                    <span><span className="block text-[0.95rem] font-bold">{meta?.label ?? c}</span><span className="b-caption">{meta?.desc}</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* 관심 제품 */}
      {wishedProducts.length > 0 && (
        <Section id="saved" eyebrow="SAVED" title="관심 제품" sub={`찜한 제품 ${wishedProducts.length}개`}>
          <Grid>{wishedProducts.map((p) => <BeautyProductCard key={p.id} product={p} />)}</Grid>
        </Section>
      )}

      {/* 최근 본 제품 */}
      {viewedProducts.length > 0 && (
        <Section id="recent" eyebrow="RECENTLY VIEWED" title="최근 본 제품" sub="최근 조회한 순서">
          <Grid>{viewedProducts.slice(0, 4).map((p) => <BeautyProductCard key={p.id} product={p} />)}</Grid>
        </Section>
      )}

      {/* 다시 구매할 시점 — 회원 구매 기록이 있으면 실제 기록 기준(D-081), 없으면 아래 루틴 기반 제안 */}
      {rep.items.length > 0 && (
        <Section id="repurchase" eyebrow="REPURCHASE" title="다시 구매할 시점" sub="구매일과 제품 사용기간으로 계산한 예상 시점이에요">
          <div data-testid="passport-repurchase"><RepurchaseList items={rep.items} limit={4} /></div>
          <Link href="/beauty/me" className="b-link mt-3">마이페이지에서 구매 기록 관리 <ArrowRight size={15} aria-hidden /></Link>
        </Section>
      )}

      {/* 다시 구매할 제품 (루틴 기반 제안) */}
      {rep.items.length === 0 && routineProducts.length > 0 && (
        <Section eyebrow="REPURCHASE" title="다시 구매할 제품" sub="추천 루틴에 담긴 제품을 다시 찾기 쉽게 모아두었어요">
          <Grid>{routineProducts.slice(0, 4).map((p) => <BeautyProductCard key={p.id} product={p} aiBadge="재구매 추천" />)}</Grid>
        </Section>
      )}

      {/* 이전 분석 결과 — 회원은 계정 기록, 비회원은 안내 */}
      {hasData && (
        <Section eyebrow="HISTORY" title="이전 분석 결과" sub={mem.member ? "계정에 쌓인 AI 추천 기록" : "회원이 되면 분석할 때마다 기록이 쌓여요"}>
          {mem.member && history && history.length > 0 ? (
            <ol className="b-card b-list px-4 @3xl:px-6">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3.5" style={{ borderColor: "var(--b-line)" }}>
                  <span className="tabular w-24 shrink-0 text-[0.86rem] font-semibold">{formatDay(r.createdAt)}</span>
                  <span className="text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>{r.productIds.map((id) => find(id)?.name ?? "비공개 제품").join(" → ")}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="b-body">
              {result ? `${formatDay(result.createdAt)} 분석 결과가 이 브라우저에 저장되어 있어요.` : "아직 저장된 분석 결과가 없어요."}{" "}
              {!mem.member && <Link href="/beauty/login?mode=signup" className="b-link">회원가입하고 기록 이어가기</Link>}
            </p>
          )}
        </Section>
      )}

      <p className="b-caption mt-14 text-center">
        뷰티 패스포트 데이터는 현재 이 브라우저에만 저장됩니다. 회원 연동 시 계정에 안전하게 보관됩니다.
      </p>
    </div>
  );
}

function Section({ id, eyebrow, title, sub, children }: { id?: string; eyebrow: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24 @3xl:mt-12" data-eyebrow={eyebrow}>
      <h2 className="b-section text-[1.18rem] @3xl:text-[1.4rem]">{title}</h2>
      {sub && <p className="b-caption mt-0.5 text-[0.84rem]">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-7 @3xl:grid-cols-4 @3xl:gap-x-5">{children}</div>;
}
