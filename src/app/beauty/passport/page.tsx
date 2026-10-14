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

/** 비회원 Passport는 이 브라우저에만 저장 — 회원 전환 안내 (한 줄, 상자 없이) */
function MemberBanner() {
  const { session } = useCustomerSession();
  const member = !!session?.account && !session.operator;
  return (
    <p data-testid="member-banner" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b pb-4 text-[0.88rem]" style={{ borderColor: "var(--b-line)", color: "var(--b-text-soft)" }}>
      {member ? (
        <><span>회원 계정에 추천·구매 기록이 보관되고 있습니다.</span><Link href="/beauty/me" className="b-link">마이페이지 →</Link></>
      ) : (
        <><span>지금 기록은 이 브라우저에만 저장됩니다. 회원이 되면 기기와 상관없이 보관하고 재구매 시점을 알려드려요.</span><Link href="/beauty/login?mode=signup" className="b-link">회원가입</Link></>
      )}
    </p>
  );
}

/* Beauty Passport — 서비스의 핵심 Retention (D-073). 현재 저장되는 데이터 범위 안에서 '나의 뷰티 기록이 쌓이고 있다'를 보여 준다. */
export default function PassportPage() {
  const mem = useBeautyMemory();
  const { products } = useBeautyData();
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
  const hasData = mem.concerns.length > 0 || mem.wishlist.length > 0 || !!result || mem.viewed.length > 0;
  const count = history?.length ?? (result ? 1 : 0);

  return (
    <div className="pt-6 @3xl:pt-10">
      <MemberBanner />

      {/* 신분증형 머리 — 이름 · 최근 분석일 · 고민 · 기록 수 · 다시 분석 */}
      <section className="mt-6 overflow-hidden rounded-[32px] px-7 py-9 @3xl:px-12 @3xl:py-12" style={{ background: "var(--b-ink)" }} aria-labelledby="h-pass">
        <div className="grid items-center gap-8 @3xl:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="b-eyebrow" style={{ color: "var(--theme-highlight)" }}>MY BEAUTY PASSPORT</p>
            <h1 id="h-pass" className="b-serif mt-3 text-[1.9rem] font-semibold leading-tight text-white @3xl:text-[2.4rem]">{mem.name ? `${mem.name}님의 피부 기록` : "나의 피부 데이터"}</h1>
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
            <Link href="/beauty/finder" className="pressable mt-8 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[0.98rem] font-bold @md:w-auto" style={{ color: "var(--b-ink)" }}>
              <Sparkles size={17} aria-hidden />
              {result ? "다시 분석하기" : "AI 분석 시작"}
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
          <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} decoding="async" className="mx-auto hidden h-[220px] w-auto @3xl:block" />
        </div>
      </section>

      {mem.loaded && !hasData && (
        <section className="mt-14 border-t pt-10 text-center" style={{ borderColor: "var(--b-line)" }}>
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
          <ol className="border-t" style={{ borderColor: "var(--b-line)" }}>
            {routineProducts.map((p, i) => (
              <li key={p.id}>
                <Link href={`/beauty/products/${p.id}`} className="group flex items-center gap-4 border-b py-4 @xl:gap-6" style={{ borderColor: "var(--b-line)" }}>
                  <span className="b-serif w-7 shrink-0 text-[1.3rem] tabular" style={{ color: "var(--b-gold-ink)" }}>0{i + 1}</span>
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
                    <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: "var(--b-ink)" }}>{meta ? <meta.icon size={18} strokeWidth={1.7} aria-hidden /> : null}</span>
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
        <Section eyebrow="RECENTLY VIEWED" title="최근 본 제품" sub="최근 조회한 순서">
          <Grid>{viewedProducts.slice(0, 4).map((p) => <BeautyProductCard key={p.id} product={p} />)}</Grid>
        </Section>
      )}

      {/* 다시 구매할 제품 (루틴 기반 제안) */}
      {routineProducts.length > 0 && (
        <Section eyebrow="REPURCHASE" title="다시 구매할 제품" sub="추천 루틴에 담긴 제품을 다시 찾기 쉽게 모아두었어요">
          <Grid>{routineProducts.slice(0, 4).map((p) => <BeautyProductCard key={p.id} product={p} aiBadge="재구매 추천" />)}</Grid>
        </Section>
      )}

      {/* 이전 분석 결과 — 회원은 계정 기록, 비회원은 안내 */}
      {hasData && (
        <Section eyebrow="HISTORY" title="이전 분석 결과" sub={mem.member ? "계정에 쌓인 AI 추천 기록" : "회원이 되면 분석할 때마다 기록이 쌓여요"}>
          {mem.member && history && history.length > 0 ? (
            <ol className="border-t" style={{ borderColor: "var(--b-line)" }}>
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b py-3.5" style={{ borderColor: "var(--b-line)" }}>
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
    <section id={id} className="mt-14 scroll-mt-24 border-t pt-10" style={{ borderColor: "var(--b-line)" }}>
      <p className="b-eyebrow">{eyebrow}</p>
      <h2 className="b-section mt-2 text-[1.5rem] @3xl:text-[1.75rem]">{title}</h2>
      {sub && <p className="b-body mt-1">{sub}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-8 @3xl:grid-cols-4 @3xl:gap-x-6">{children}</div>;
}
