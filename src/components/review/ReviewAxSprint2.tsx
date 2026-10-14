"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Check, CircleDot, Database, Eye, Factory, Globe2, Heart, LineChart, MousePointerClick, PackageCheck, RotateCcw, Search, ShieldCheck, ShoppingBag, Sparkles, Store, Truck, UserCheck, Video } from "lucide-react";
import { formatDateKR, addDaysISO } from "@/lib/date";
import { analyzeReviewProduct, REVIEW_DEMO_NOTICE, REVIEW_PRODUCTS, reviewSignalActions, reviewSignals, SCENARIOS, SIGNAL_STEPS, type ScenarioId } from "@/lib/review/ax-sprint2-demo";

/* AX Sprint II 심사위원 전용 페이지 (PASS 16, D-068)
   읽기 전용 · 공개 시연 데이터만 · 내부 서비스 링크 없음 · 저장/전송 없음.
   숫자는 실제 Business AX와 같은 계산 함수의 결과다 (src/lib/review/ax-sprint2-demo.ts). */

const THEME: CSSProperties = {
  ["--rv-navy" as string]: "#0E1A33",
  ["--rv-navy2" as string]: "#1A2C52",
  ["--rv-ink" as string]: "#101828",
  ["--rv-soft" as string]: "#475467",
  ["--rv-line" as string]: "#E4E7EC",
  ["--rv-bg" as string]: "#F6F7F9",
  ["--rv-blue" as string]: "#1D4ED8",
  ["--rv-blue-soft" as string]: "#EAF0FD",
  ["--rv-teal" as string]: "#0E7490",
  ["--rv-teal-soft" as string]: "#E6F4F7",
  ["--rv-gold" as string]: "#8A6A2B",
  ["--rv-gold-light" as string]: "#D8B970",
  ["--rv-ok" as string]: "#067647",
  ["--rv-ok-soft" as string]: "#E7F6EE",
  ["--rv-warn" as string]: "#A15C07",
  ["--rv-warn-soft" as string]: "#FEF4E6",
  ["--rv-risk" as string]: "#B42318",
  ["--rv-risk-soft" as string]: "#FDECEA",
  background: "#FFFFFF",
  color: "#101828",
};

const NAV = [
  { id: "why", label: "왜 AX인가" },
  { id: "demo", label: "작동 방식" },
  { id: "signal", label: "고객 신호" },
  { id: "loop", label: "실행 구조" },
  { id: "status", label: "개발 현황" },
  { id: "roadmap", label: "확장 방향" },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

function NoticeBadge({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span data-testid="demo-notice" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[0.8rem] font-bold" style={tone === "dark" ? { background: "rgba(216,185,112,.16)", color: "#F2DDA9", border: "1px solid rgba(216,185,112,.45)" } : { background: "var(--rv-warn-soft)", color: "var(--rv-warn)", border: "1px solid #F5D9B0" }}>
      <ShieldCheck size={14} aria-hidden /> {REVIEW_DEMO_NOTICE}
    </span>
  );
}

function SectionHead({ no, eyebrow, title, lead, id }: { no: string; eyebrow: string; title: ReactNode; lead?: ReactNode; id: string }) {
  return (
    <header className="max-w-[54rem] [word-break:keep-all]">
      <p className="text-[0.84rem] font-bold tracking-wide" style={{ color: "var(--rv-teal)" }}><span className="tabular">{no}</span> · {eyebrow}</p>
      <h2 id={`${id}-title`} className="mt-2 text-[clamp(1.45rem,3.2vw,2.15rem)] font-bold leading-[1.3] tracking-tight" style={{ color: "var(--rv-navy)" }}>{title}</h2>
      {lead && <p className="mt-3 text-[1.02rem] leading-relaxed" style={{ color: "var(--rv-soft)" }}>{lead}</p>}
    </header>
  );
}

type Tone = "ok" | "warn" | "risk" | "blue" | "neutral";
const TONE: Record<Tone, { fg: string; bg: string }> = {
  ok: { fg: "var(--rv-ok)", bg: "var(--rv-ok-soft)" },
  warn: { fg: "var(--rv-warn)", bg: "var(--rv-warn-soft)" },
  risk: { fg: "var(--rv-risk)", bg: "var(--rv-risk-soft)" },
  blue: { fg: "var(--rv-blue)", bg: "var(--rv-blue-soft)" },
  neutral: { fg: "var(--rv-soft)", bg: "var(--rv-bg)" },
};
function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold" style={{ color: TONE[tone].fg, background: TONE[tone].bg }}>{children}</span>;
}

/** now: 서버가 요청 시점에 넘기는 기준 시각 — 서버·브라우저가 같은 날짜로 계산해 화면이 어긋나지 않게 한다 */
export function ReviewAxSprint2({ now }: { now: string }) {
  return (
    <div style={THEME} className="min-h-screen" data-testid="review-page">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">본문으로 건너뛰기</a>
      <TopBar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Why />
        <Demo now={now} />
        <Signal now={now} />
        <Loop />
        <Status />
        <Roadmap />
        <Closing />
      </main>
    </div>
  );
}

/* ---------------- 상단 고정 막대 — 시연 데이터 표시가 항상 보이게 ---------------- */
function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: "var(--rv-line)" }}>
      <div className="mx-auto flex min-h-[56px] w-full max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 md:px-6">
        <span className="hidden items-baseline gap-2 whitespace-nowrap sm:flex">
          <span className="font-display text-[1.05rem] font-bold tracking-wide" style={{ color: "var(--rv-navy)" }}>MIRYEO</span>
          <span className="hidden text-[0.82rem] font-semibold sm:inline" style={{ color: "var(--rv-soft)" }}>K-Beauty Growth AX · 심사용</span>
        </span>
        <nav aria-label="페이지 안 이동" className="hidden flex-1 justify-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={(e) => { e.preventDefault(); scrollToId(n.id); }} className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[0.84rem] font-semibold hover:bg-[var(--rv-bg)] focus-visible:outline focus-visible:outline-2" style={{ color: "var(--rv-soft)" }}>{n.label}</a>
          ))}
        </nav>
        <span className="mx-auto sm:ml-auto sm:mr-0 lg:ml-0"><NoticeBadge /></span>
      </div>
    </header>
  );
}

/* ---------------- 01 HERO ---------------- */
function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative" style={{ background: "var(--rv-navy)", color: "#fff" }}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-12 md:px-6 md:pb-20 md:pt-16">
        <p className="text-[0.9rem] font-bold tracking-wide" style={{ color: "var(--rv-gold-light)" }}>AX Sprint II · AI 분석 및 예측 솔루션</p>
        <h1 id="hero-title" className="mt-4 max-w-[52rem] text-[clamp(1.75rem,4.4vw,3rem)] font-bold leading-[1.28] tracking-tight [word-break:keep-all]">
          판매가 일어난 뒤 보는 관리가 아니라,<br className="hidden sm:block" /> 수요가 움직일 때 다음 행동을 알려주는<br className="hidden sm:block" /> K-Beauty Growth AX
        </h1>
        <p className="mt-5 max-w-[44rem] text-[clamp(1rem,1.6vw,1.15rem)] leading-relaxed text-white/85 [word-break:keep-all]">
          국내외 판매·재고·OEM 생산·고객행동 데이터를 연결해 재고위험과 생산 필요시점을 분석하고, 대표와 실무자가 다음 Action을 결정할 수 있도록 지원합니다.
        </p>
        <p className="mt-7 text-[0.86rem] font-semibold text-white/75" data-testid="applicant">주식회사 가연인터내셔널 · AX Sprint II 심사용</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.82rem] font-bold"><CircleDot size={14} aria-hidden /> MIRYEO K-Beauty Growth AX · PILOT</span>
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[0.82rem] font-semibold">현재 개발·실증 진행 중</span>
          <NoticeBadge tone="dark" />
        </div>
        <button onClick={() => scrollToId("why")} className="mt-9 inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-white px-6 text-[1rem] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ color: "var(--rv-navy)" }} data-testid="hero-cta">
          핵심 작동방식 보기 <ArrowDown size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}

/* ---------------- 02 WHY AX ---------------- */
function Why() {
  const channels = [
    { icon: Store, label: "국내 백화점" },
    { icon: ShoppingBag, label: "온라인" },
    { icon: Truck, label: "B2B" },
    { icon: Video, label: "라이브·인플루언서" },
    { icon: Globe2, label: "중국·해외 판매채널" },
  ];
  const ops = [
    { icon: PackageCheck, label: "재고" },
    { icon: Factory, label: "OEM 생산" },
    { icon: Heart, label: "고객 관심" },
  ];
  const scattered = ["채널별로 따로 보는 판매 현황", "엑셀로 모으는 재고·생산 자료", "경험에 기대는 생산 시점 판단"];
  return (
    <section id="why" tabIndex={-1} aria-labelledby="why-title" className="scroll-mt-20 outline-none" style={{ background: "var(--rv-bg)" }}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <SectionHead id="why" no="01" eyebrow="왜 AX인가" title={<>채널이 늘어날수록<br className="hidden sm:block" /> 매출만 봐서는 다음 생산을 결정하기 어렵습니다.</>}
          lead="같은 제품도 채널·시장마다 판매속도와 고객반응이 다릅니다. 가연인터내셔널은 이를 하나의 운영데이터로 연결하는 AX를 구축하고 있습니다." />
        <div className="mt-9 grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]" data-testid="why-flow">
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "var(--rv-line)" }}>
            <p className="text-[0.86rem] font-bold" style={{ color: "var(--rv-soft)" }}>판매채널</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {channels.map((c) => <li key={c.label} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.9rem] font-semibold" style={{ background: "var(--rv-blue-soft)", color: "var(--rv-navy)" }}><c.icon size={15} aria-hidden style={{ color: "var(--rv-blue)" }} />{c.label}</li>)}
            </ul>
            <p className="mt-4 text-[0.86rem] font-bold" style={{ color: "var(--rv-soft)" }}>+ 운영 데이터</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {ops.map((c) => <li key={c.label} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.9rem] font-semibold" style={{ background: "var(--rv-teal-soft)", color: "var(--rv-navy)" }}><c.icon size={15} aria-hidden style={{ color: "var(--rv-teal)" }} />{c.label}</li>)}
            </ul>
          </div>
          <FlowArrow />
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "var(--rv-line)" }}>
            <p className="text-[0.86rem] font-bold" style={{ color: "var(--rv-warn)" }}>지금: 분산된 판단</p>
            <ul className="mt-3 space-y-2">
              {scattered.map((s) => <li key={s} className="rounded-lg border border-dashed px-3 py-2 text-[0.92rem]" style={{ borderColor: "#D0D5DD", color: "var(--rv-soft)" }}>{s}</li>)}
            </ul>
          </div>
          <FlowArrow />
          <div className="flex flex-col rounded-2xl p-5 text-white" style={{ background: "var(--rv-navy)" }}>
            <p className="text-[0.86rem] font-bold" style={{ color: "var(--rv-gold-light)" }}>MIRYEO Growth AX</p>
            <ol className="mt-3 space-y-2 text-[0.95rem] font-semibold">
              <li className="flex items-center gap-2"><Database size={16} aria-hidden /> 하나의 운영데이터로 연결</li>
              <li className="flex items-center gap-2"><LineChart size={16} aria-hidden /> 재고 소진·생산 시점 분석</li>
              <li className="flex items-center gap-2"><UserCheck size={16} aria-hidden /> 다음 Action을 사람이 결정</li>
            </ol>
            <p className="mt-auto pt-5 text-[0.86rem] leading-relaxed text-white/75 [word-break:keep-all]">생산 · 재고배분 · 판매 Action까지 근거와 함께 제안하고, 실행 여부는 대표·담당자가 정합니다.</p>
          </div>
        </div>

        <div className="mt-10" data-testid="why-compare">
          <h3 className="text-[1.15rem] font-bold [word-break:keep-all]" style={{ color: "var(--rv-navy)" }}>기록하는 관리에서, 다음 행동을 계산하는 AX로</h3>
          <div className="mt-3 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--rv-line)" }}>
            <table className="w-full text-left text-[0.95rem] [word-break:keep-all]">
              <caption className="sr-only">기록·조회 중심 관리와 MIRYEO Growth AX 비교</caption>
              <thead>
                <tr style={{ background: "var(--rv-bg)" }}>
                  <th scope="col" className="w-[22%] px-3 py-2.5 text-[0.82rem] font-semibold md:px-5" style={{ color: "var(--rv-soft)" }}><span className="sr-only">구분</span></th>
                  <th scope="col" className="px-3 py-2.5 text-[0.86rem] font-bold md:px-5" style={{ color: "var(--rv-soft)" }}>기록·조회 중심 관리</th>
                  <th scope="col" className="px-3 py-2.5 text-[0.86rem] font-bold md:px-5" style={{ color: "var(--rv-blue)" }}>MIRYEO Growth AX</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["보는 것", "지금까지 팔린 수량 · 남은 재고", "앞으로의 판매 예측 · 재고 소진 예상일 · 생산 착수 마감"],
                  ["쓰는 데이터", "판매 · 재고 기록", "+ OEM 생산기간 · 채널별 판매속도 · 고객 관심신호"],
                  ["결과", "숫자를 보고 사람이 해석", "근거가 있는 다음 Action 제안 → 사람 승인 → 결과 기록"],
                ].map(([k, a, b]) => (
                  <tr key={k} className="border-t align-top" style={{ borderColor: "var(--rv-line)" }}>
                    <th scope="row" className="px-3 py-3 text-[0.86rem] font-bold md:px-5" style={{ color: "var(--rv-navy)" }}>{k}</th>
                    <td className="px-3 py-3 md:px-5" style={{ color: "var(--rv-soft)" }}>{a}</td>
                    <td className="px-3 py-3 font-semibold md:px-5" style={{ color: "var(--rv-navy)" }}>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1 lg:px-1" aria-hidden>
      <ArrowDown size={22} className="lg:hidden" style={{ color: "var(--rv-soft)" }} />
      <ArrowRight size={22} className="hidden lg:block" style={{ color: "var(--rv-soft)" }} />
    </div>
  );
}

/* ---------------- 03 핵심 인터랙티브 데모 ---------------- */
function Demo({ now }: { now: string }) {
  const [pid, setPid] = useState("rv-ampoule-c");
  const [sc, setSc] = useState<ScenarioId>("base");
  const r = useMemo(() => analyzeReviewProduct(pid, sc, new Date(now)), [pid, sc, now]);
  const m = r.metrics;
  const L = m.leadTimeDays ?? 0, S = r.plan.safetyDays;
  const dl = m.daysToDeadline;
  const cover = r.coverDays ?? 0;
  const decision: { tone: Tone; head: string; body: string } =
    dl == null ? { tone: "neutral", head: "생산기간 정보가 필요합니다", body: "" }
    : dl < 0 ? { tone: "risk", head: `생산 착수 마감이 ${-dl}일 지났습니다`, body: "지금 착수해도 입고 전에 재고가 부족할 수 있어 긴급 대응 검토가 필요합니다." }
    : dl <= 14 ? { tone: "warn", head: `${dl}일 안에 생산을 시작해야 합니다`, body: `착수 마감 ${formatDateKR(m.orderDeadline)} — 생산 ${L}일과 안전 재고 ${S}일을 감안한 날짜입니다.` }
    : { tone: "ok", head: "지금은 생산 착수가 급하지 않습니다", body: `착수 마감까지 약 ${dl}일 여유가 있습니다 (${formatDateKR(m.orderDeadline)}).` };
  const hiddenRisk = m.stockStatus === "안정" && dl != null && dl <= 14;
  const weekEnds = m.weekly.map((_, i) => addDaysISO(r.asOf, -7 * (m.weekly.length - 1 - i)));
  const maxW = Math.max(1, ...m.weekly);


  return (
    <section id="demo" tabIndex={-1} aria-labelledby="demo-title" className="scroll-mt-20 outline-none">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <SectionHead id="demo" no="02" eyebrow="핵심 작동 방식 · 직접 눌러 보기" title="이 제품, 언제 다시 생산해야 할까요?"
          lead="샘플 제품과 상황을 고르면, 실제 Business AX와 같은 계산 규칙으로 재고 소진·생산 착수 마감·추천 생산량을 다시 계산합니다." />
        <div className="mt-5 grid max-w-[56rem] gap-px overflow-hidden rounded-xl border md:grid-cols-2 [word-break:keep-all]" style={{ borderColor: "var(--rv-line)", background: "var(--rv-line)" }} role="note" aria-label="분석 방식: 현재 PILOT과 향후 고도화" data-testid="demo-method">
          <p className="px-4 py-3 text-[0.95rem] leading-relaxed" style={{ background: "var(--rv-teal-soft)", color: "var(--rv-ink)" }}>
            <span className="mb-0.5 flex items-center gap-1.5 text-[0.8rem] font-bold" style={{ color: "var(--rv-teal)" }}><Check size={14} aria-hidden /> 현재 PILOT</span>
            규칙·통계 기반의 설명 가능한 분석·예측을 중심으로 구현되어 있습니다.
          </p>
          <p className="bg-white px-4 py-3 text-[0.95rem] leading-relaxed" style={{ color: "var(--rv-ink)" }}>
            <span className="mb-0.5 flex items-center gap-1.5 text-[0.8rem] font-bold" style={{ color: "var(--rv-soft)" }}><ArrowRight size={14} aria-hidden /> 향후 고도화</span>
            실제 운영데이터 축적 후 시계열·머신러닝 기반 수요예측으로 단계적으로 고도화합니다.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {/* 선택 */}
          <div className="space-y-5">
            <fieldset>
              <legend className="text-[0.92rem] font-bold" style={{ color: "var(--rv-navy)" }}>① 샘플 제품</legend>
              <div className="mt-2 grid gap-2">
                {REVIEW_PRODUCTS.map((p) => {
                  const on = p.product.id === pid;
                  return (
                    <label key={p.product.id} className="relative flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2" style={{ borderColor: on ? "var(--rv-blue)" : "var(--rv-line)", outlineColor: "var(--rv-blue)" }} data-product={p.product.id}>
                      <input type="radio" name="rv-product" className="sr-only" checked={on} onChange={() => setPid(p.product.id)} />
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: on ? "var(--rv-blue)" : "#98A2B3" }} aria-hidden>{on && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--rv-blue)" }} />}</span>
                      <span className="min-w-0">
                        <span className="block font-bold" style={{ color: "var(--rv-navy)" }}>{p.product.name}</span>
                        <span className="block text-[0.78rem] font-semibold" style={{ color: "var(--rv-soft)" }}>{p.product.sku} · 생산기간 {p.product.leadTimeDays}일</span>
                        <span className="mt-0.5 hidden text-[0.86rem] sm:block" style={{ color: "var(--rv-soft)" }}>{p.summary}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-[0.92rem] font-bold" style={{ color: "var(--rv-navy)" }}>② 상황 (같은 제품, 다른 데이터)</legend>
              <div className="mt-2 grid gap-2">
                {SCENARIOS.map((s) => {
                  const on = s.id === sc;
                  return (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white px-3.5 py-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2" style={{ borderColor: on ? "var(--rv-teal)" : "var(--rv-line)", outlineColor: "var(--rv-teal)" }} data-scenario={s.id}>
                      <input type="radio" name="rv-scenario" className="sr-only" checked={on} onChange={() => setSc(s.id)} />
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: on ? "var(--rv-teal)" : "#98A2B3" }} aria-hidden>{on && <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--rv-teal)" }} />}</span>
                      <span><span className="block text-[0.95rem] font-bold" style={{ color: "var(--rv-navy)" }}>{s.label}</span><span className="block text-[0.82rem]" style={{ color: "var(--rv-soft)" }}>{s.desc}</span></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="text-[0.8rem] leading-relaxed" style={{ color: "var(--rv-soft)" }}>{REVIEW_DEMO_NOTICE}. 계산은 이 화면 안에서만 이루어지며 저장·전송되지 않습니다.</p>
          </div>

          {/* 결과 */}
          <div className="min-w-0 space-y-4" aria-live="polite" data-testid="demo-result" data-deadline={dl ?? ""} data-order={m.recommendedOrder}>
            <ol className="grid grid-cols-2 gap-2.5 xl:grid-cols-4" aria-label="분석 단계: 판매 추세, 재고, OEM 생산기간을 넣어 재고 소진을 예상">
              <Step n="1" label="판매 추세 → 예측" value={`하루 ${m.forecastDaily.toFixed(1)}개`} sub={`최근 4주 평균 ${m.dailyVelocity.toFixed(1)}개 · 추세 ${m.growthRate >= 0 ? "+" : ""}${Math.round(m.growthRate * 100)}%`} />
              <Step n="2" label="가용 재고" value={`${m.availableStock.toLocaleString()}개`} sub={`현재 ${m.currentStock.toLocaleString()} + 입고예정 ${r.inventory.incomingStock.toLocaleString()}`} />
              <Step n="3" label="OEM 생산기간" value={`${L}일`} sub={`+ 안전 재고 ${S}일 = ${L + S}일 필요`} />
              <Step n="4" label="재고 소진 예상" value={`약 ${Math.round(cover)}일 뒤`} sub={`${formatDateKR(addDaysISO(r.today, Math.floor(cover)))} 무렵`} highlight />
            </ol>

            {/* 시간선 */}
            <Timeline cover={cover} dl={dl} L={L} S={S} today={r.today} tone={decision.tone} />

            {/* 판단 */}
            <div className="rounded-2xl border-2 p-4 md:p-5" style={{ borderColor: TONE[decision.tone].fg, background: TONE[decision.tone].bg }} data-testid="demo-decision" data-tone={decision.tone}>
              <p className="text-[0.84rem] font-bold" style={{ color: TONE[decision.tone].fg }}>⑤ 생산 착수 판단</p>
              <p className="mt-1 text-[1.25rem] font-bold leading-snug" style={{ color: "var(--rv-navy)" }}>{decision.head}</p>
              {decision.body && <p className="mt-1 text-[0.95rem]" style={{ color: "var(--rv-ink)" }}>{decision.body}</p>}
              <p className="mt-3 text-[0.95rem]" style={{ color: "var(--rv-ink)" }}>
                <span className="font-bold">추천 생산량</span>{" "}
                <span className="tabular text-[1.15rem] font-bold" data-testid="demo-order">{m.recommendedOrder > 0 ? `${m.recommendedOrder.toLocaleString()}개` : "추가 생산 불필요"}</span>
                {m.recommendedOrder > 0 && <span className="text-[0.84rem]" style={{ color: "var(--rv-soft)" }}> (입고 후 {r.plan.coverDays}일분 · {r.plan.roundTo}개 단위 · 최소 생산수량 {r.spec.product.moq?.toLocaleString()}개 이상)</span>}
              </p>
              {hiddenRisk && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-[0.92rem] font-semibold" style={{ color: "var(--rv-navy)" }} data-testid="hidden-risk">재고만 보면 &lsquo;안정&rsquo;(현재 재고 약 {Math.round(m.daysOfStock)}일분)이지만, OEM 생산기간을 함께 보면 지금 판단이 필요합니다.</p>}
            </div>

            {r.action && (
              <div className="rounded-2xl border bg-white p-4 md:p-5" style={{ borderColor: "var(--rv-line)" }} data-testid="demo-action">
                <p className="flex flex-wrap items-center gap-2 text-[0.84rem] font-bold" style={{ color: "var(--rv-soft)" }}>⑥ 다음 Action — 시스템이 제안 <Pill tone="blue">규칙 기반</Pill><Pill tone="neutral">사람이 검토·승인 후 실행</Pill></p>
                <p className="mt-1.5 text-[1.05rem] font-bold" style={{ color: "var(--rv-navy)" }}>{r.action.title}</p>
                <p className="mt-1 text-[0.95rem]">{r.action.recommendation}</p>
                <ul className="mt-2 space-y-0.5 text-[0.86rem]" style={{ color: "var(--rv-soft)" }}>{r.action.evidence.slice(0, 4).map((e) => <li key={e}>· {e}</li>)}</ul>
              </div>
            )}

            {/* 주간 판매 */}
            <figure className="rounded-2xl border bg-white p-4 md:p-5" style={{ borderColor: "var(--rv-line)" }}>
              <figcaption className="text-[0.9rem] font-bold" style={{ color: "var(--rv-navy)" }}>최근 8주 판매 수량 <span className="font-normal" style={{ color: "var(--rv-soft)" }}>(샘플 · 5개 판매채널 합계)</span></figcaption>
              <ol className="mt-3 flex h-[120px] items-end gap-1.5 md:gap-2.5" aria-label="최근 8주 주간 판매 수량">
                {m.weekly.map((u, i) => (
                  <li key={weekEnds[i]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="tabular text-[0.7rem] font-semibold" style={{ color: "var(--rv-soft)" }}>{u}</span>
                    <span className="block w-full max-w-[2.4rem] rounded-t-[4px] transition-all duration-300 motion-reduce:transition-none" style={{ height: `${Math.max(3, (u / maxW) * 78)}%`, background: i >= 4 ? "var(--rv-blue)" : "#A9BDF0" }} aria-hidden />
                    <span className="tabular text-[0.68rem]" style={{ color: "var(--rv-soft)" }}>{weekEnds[i].slice(5).replace("-", ".")}</span>
                    <span className="sr-only">{weekEnds[i]}까지 한 주 {u}개</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[0.76rem]" style={{ color: "var(--rv-soft)" }}>진한 막대 = 최근 4주 · 연한 막대 = 이전 4주 · 날짜는 각 주의 마지막 날</p>
            </figure>

            <details className="rounded-2xl border bg-white p-4 md:p-5" style={{ borderColor: "var(--rv-line)" }}>
              <summary className="cursor-pointer text-[0.92rem] font-bold" style={{ color: "var(--rv-navy)" }}>계산 방법 보기 (설명 가능한 규칙·통계)</summary>
              <ul className="mt-3 space-y-1.5 text-[0.9rem] tabular" style={{ color: "var(--rv-ink)" }}>
                <li>· 예측 하루 판매 = 최근 4주 하루 평균 {m.dailyVelocity.toFixed(1)} × (1 + 4주 성장률 × 0.5, 성장률은 −30%~+100% 범위) = <b>{m.forecastDaily.toFixed(1)}개</b></li>
                <li>· 가용 재고 = 현재 {m.currentStock.toLocaleString()} + 입고 예정 {r.inventory.incomingStock.toLocaleString()} = {m.availableStock.toLocaleString()}개 → 약 <b>{Math.round(cover)}일분</b></li>
                <li>· 생산 착수 마감 = 가용 재고 일수 − (OEM 생산 {L}일 + 안전 재고 {S}일) = <b>{dl == null ? "-" : dl < 0 ? `${-dl}일 지남` : `${dl}일 뒤`}</b></li>
                <li>· 추천 생산량 = 예측 하루 판매 × (생산 {L} + 안전 {S} + 입고 후 {r.plan.coverDays}일) − 가용 재고 → {r.plan.roundTo}개 단위 올림, 최소 생산수량 이상 = <b>{m.recommendedOrder.toLocaleString()}개</b></li>
                <li className="pt-1 text-[0.84rem]" style={{ color: "var(--rv-soft)" }}>안전 재고일수·입고 후 판매 일수·생산 단위는 회사별 기준값으로 조정할 수 있고, 실제 데이터로 보정하는 과정은 PILOT 단계에서 진행합니다.</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 오늘(0)부터의 시간선 — 막대마다 제목을 위에 두어 글자가 겹치지 않게, 표시선 이름은 아래 축에 */
function Timeline({ cover, dl, L, S, today, tone }: { cover: number; dl: number | null; L: number; S: number; today: string; tone: Tone }) {
  const d0 = dl ?? 0;
  const start = Math.min(0, d0) - 3;
  const end = Math.max(cover, d0 + L + S) + 6;
  const pct = (d: number) => ((d - start) / (end - start)) * 100;
  const markers = [{ at: 0, label: "오늘", color: "var(--rv-navy)" }, ...(dl == null ? [] : [{ at: dl, label: `착수 마감 ${dl < 0 ? `(${-dl}일 지남)` : `D-${dl}`}`, color: TONE[tone].fg }])];
  const stacked = dl != null && Math.abs(pct(dl) - pct(0)) < 26;
  const lines = markers.map((k) => <span key={k.label} className="absolute -bottom-1 -top-1 w-[2px]" style={{ left: `${pct(k.at)}%`, background: k.color }} aria-hidden />);
  const bar = "absolute inset-y-0 transition-all duration-300 motion-reduce:transition-none";
  return (
    <figure className="rounded-2xl border bg-white p-4 md:p-5" style={{ borderColor: "var(--rv-line)" }} data-testid="demo-timeline">
      <figcaption className="text-[0.9rem] font-bold" style={{ color: "var(--rv-navy)" }}>오늘부터의 시간선 <span className="font-normal" style={{ color: "var(--rv-soft)" }}>(일 단위)</span></figcaption>
      <div role="img" aria-label={`가용 재고로 약 ${Math.round(cover)}일 버틸 수 있습니다. 생산 ${L}일과 안전 재고 ${S}일이 필요하므로 생산 착수 마감은 ${dl == null ? "계산할 수 없습니다" : dl < 0 ? `${-dl}일 지났습니다` : `${dl}일 뒤입니다`}.`}>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 text-[0.84rem] font-semibold [word-break:keep-all]" aria-hidden>
          <span style={{ color: "var(--rv-teal)" }}>가용 재고로 버티는 기간</span>
          <span className="tabular whitespace-nowrap" style={{ color: "var(--rv-teal)" }}>약 {Math.round(cover)}일 · {formatDateKR(addDaysISO(today, Math.floor(cover)))}</span>
        </div>
        <div className="relative mt-1 h-[22px] rounded-[4px]" style={{ background: "var(--rv-bg)" }} aria-hidden>
          <span className={`${bar} rounded-[4px]`} style={{ left: `${pct(0)}%`, width: `${pct(cover) - pct(0)}%`, background: "var(--rv-teal)" }} />
          {lines}
        </div>
        {dl != null && (
          <>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 text-[0.84rem] font-semibold [word-break:keep-all]" aria-hidden>
              <span style={{ color: "var(--rv-blue)" }}>마감일 착수 → <span className="whitespace-nowrap">OEM 생산 {L}일</span> <span className="whitespace-nowrap" style={{ color: "#4A6FD0" }}>+ 안전 재고 {S}일</span></span>
              <span className="tabular whitespace-nowrap" style={{ color: "var(--rv-blue)" }}>{L + S}일</span>
            </div>
            <div className="relative mt-1 h-[22px] rounded-[4px]" style={{ background: "var(--rv-bg)" }} aria-hidden>
              <span className={`${bar} rounded-l-[4px]`} style={{ left: `${pct(dl)}%`, width: `${pct(dl + L) - pct(dl)}%`, background: "var(--rv-blue)" }} />
              <span className={`${bar} rounded-r-[4px]`} style={{ left: `${pct(dl + L)}%`, width: `${pct(dl + L + S) - pct(dl + L)}%`, background: "#A9BDF0" }} />
              {lines}
            </div>
          </>
        )}
        <div className={`relative mt-2 ${stacked ? "h-[2.7rem]" : "h-[1.4rem]"}`} aria-hidden>
          {markers.map((k, i) => {
            const x = pct(k.at);
            const right = x > 62;
            return (
              <span key={k.label} className="absolute whitespace-nowrap text-[0.76rem] font-bold" style={{ left: `${x}%`, top: stacked && i === 1 ? "1.3rem" : 0, transform: right ? "translateX(-100%)" : undefined, color: k.color, paddingLeft: right ? 0 : 4, paddingRight: right ? 4 : 0 }}>
                {k.label}
              </span>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[0.82rem] leading-relaxed [word-break:keep-all]" style={{ color: "var(--rv-soft)" }}>
        착수 마감 = 재고가 바닥나는 날에서 생산기간과 안전 재고일수를 거꾸로 뺀 날. 이날까지 생산을 시작해야 안전 재고를 남긴 채 입고됩니다.
      </p>
    </figure>
  );
}

function Step({ n, label, value, sub, highlight }: { n: string; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <li className="min-w-0 rounded-xl border bg-white p-3 [word-break:keep-all]" style={{ borderColor: highlight ? "var(--rv-teal)" : "var(--rv-line)", borderWidth: highlight ? 2 : 1 }}>
      <span className="block text-[0.76rem] font-bold" style={{ color: "var(--rv-teal)" }}>{n}. {label}</span>
      <span className="tabular mt-0.5 block whitespace-nowrap text-[1.08rem] font-bold leading-snug" style={{ color: "var(--rv-navy)" }}>{value}</span>
      <span className="tabular mt-0.5 block text-[0.78rem] leading-snug" style={{ color: "var(--rv-soft)" }}>{sub}</span>
    </li>
  );
}

/* ---------------- 04 고객 신호 ---------------- */
function Signal({ now }: { now: string }) {
  const { insight, rising, threshold, growthMin } = useMemo(() => reviewSignals(Date.parse(now)), [now]);
  const actions = useMemo(() => reviewSignalActions(new Date(now)), [now]);
  const prod = useMemo(() => analyzeReviewProduct("rv-ampoule-c", "base", new Date(now)), [now]);
  const icons = [Search, Sparkles, Eye, Heart, MousePointerClick];
  const journey = ["피부 고민 선택", "AI 뷰티 파인더", "추천 제품 확인", "뷰티 패스포트 저장", "관심 상품·구매채널 이동"];
  const top = rising.find((x) => x.rising);
  return (
    <section id="signal" tabIndex={-1} aria-labelledby="signal-title" className="scroll-mt-20 outline-none" style={{ background: "var(--rv-bg)" }}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <SectionHead id="signal" no="03" eyebrow="Customer Signal Bridge" title="판매가 일어나기 전의 수요신호도 데이터가 됩니다."
          lead="외부 판매채널의 매출결과뿐 아니라, 자사 고객접점에서 발생하는 구매 전 관심신호까지 회사의 데이터 자산으로 축적합니다." />

        <ol className="mt-8 grid gap-2 sm:grid-cols-5" aria-label="고객 여정">
          {journey.map((j, i) => (
            <li key={j} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-[0.9rem] font-semibold sm:flex-col sm:items-start sm:gap-1" style={{ borderColor: "var(--rv-line)", color: "var(--rv-navy)" }}>
              <span className="tabular text-[0.76rem] font-bold" style={{ color: "var(--rv-teal)" }}>{i + 1}</span>{j}
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <figure className="rounded-2xl border bg-white p-5" style={{ borderColor: "var(--rv-line)" }}>
            <figcaption className="text-[0.92rem] font-bold" style={{ color: "var(--rv-navy)" }}>고객 관심신호 — 최근 7일 <span className="font-normal" style={{ color: "var(--rv-soft)" }}>(샘플 · 익명)</span></figcaption>
            <ul className="mt-3 space-y-2" data-testid="signal-steps">
              {SIGNAL_STEPS.map((s, i) => {
                const Icon = icons[i];
                const v = insight.recent[s.type];
                const max = insight.recent.finder_start || 1;
                return (
                  <li key={s.type} className="grid grid-cols-[1.4rem_minmax(0,7.2rem)_minmax(0,1fr)_2.4rem] sm:grid-cols-[1.6rem_minmax(0,8.5rem)_minmax(0,1fr)_2.6rem] items-center gap-2 text-[0.92rem]">
                    <Icon size={18} aria-hidden style={{ color: "var(--rv-teal)" }} />
                    <span className="font-semibold" style={{ color: "var(--rv-navy)" }}>{s.label}</span>
                    <span className="h-[14px] rounded-[4px]" style={{ background: "var(--rv-teal-soft)" }} aria-hidden><span className="block h-full rounded-[4px]" style={{ width: `${(v / max) * 100}%`, background: "var(--rv-teal)" }} /></span>
                    <span className="tabular text-right font-bold">{v}<span className="sr-only">건 — {s.desc}</span></span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[0.8rem]" style={{ color: "var(--rv-soft)" }}>개인을 식별하지 않는 익명 행동으로 기록합니다. 회원 정보는 가입 시 동의한 범위에서만 활용하도록 설계했습니다.</p>
          </figure>

          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "var(--rv-line)" }}>
            <p className="text-[0.92rem] font-bold" style={{ color: "var(--rv-navy)" }}>제품별 관심점수 <span className="font-normal" style={{ color: "var(--rv-soft)" }}>(최근 7일 vs 이전 7일)</span></p>
            <table className="mt-3 w-full text-[0.92rem]" data-testid="signal-table">
              <thead><tr className="text-left text-[0.8rem]" style={{ color: "var(--rv-soft)" }}><th className="pb-1.5 font-semibold">제품</th><th className="pb-1.5 pl-3 text-right font-semibold">최근</th><th className="pb-1.5 pl-3 text-right font-semibold">이전</th><th className="pb-1.5 pl-3 text-right font-semibold">변화</th></tr></thead>
              <tbody>
                {rising.map((x) => (
                  <tr key={x.productId} className="border-t" style={{ borderColor: "var(--rv-line)" }}>
                    <td className="py-2 font-semibold" style={{ color: "var(--rv-navy)" }}>{x.name}{x.rising && <span className="mt-0.5 block sm:ml-1.5 sm:mt-0 sm:inline"><Pill tone="warn">관심 상승</Pill></span>}</td>
                    <td className="tabular py-2 pl-3 text-right font-bold">{x.recentScore}</td>
                    <td className="tabular py-2 pl-3 text-right" style={{ color: "var(--rv-soft)" }}>{x.prevScore}</td>
                    <td className="tabular py-2 pl-3 text-right font-semibold" style={{ color: (x.growth ?? 0) >= 0 ? "var(--rv-ok)" : "var(--rv-risk)" }}>{x.growth == null ? "신규" : `${x.growth >= 0 ? "+" : ""}${Math.round(x.growth * 100)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[0.8rem]" style={{ color: "var(--rv-soft)" }}>관심점수 = 추천 조회×1 + 찜×2 + 추천 저장×3 + 구매채널 이동×2 + 제품 조회×0.2 (규칙). {threshold}점 이상이면서 이전보다 {Math.round(growthMin * 100)}% 이상 오르면 &lsquo;관심 상승&rsquo;.</p>
          </div>
        </div>

        {top && (
          <div className="mt-5 rounded-2xl p-5 text-white md:p-6" style={{ background: "var(--rv-navy)" }} data-testid="signal-combined">
            <p className="text-[0.86rem] font-bold" style={{ color: "var(--rv-gold-light)" }}>고객 관심신호 + 판매·재고 데이터 → Business AX 판단</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.2fr)] md:items-center">
              <p className="rounded-xl bg-white/10 p-3 text-[0.95rem]"><b>{top.name}</b><br />고객 관심 {top.growth != null ? `+${Math.round(top.growth * 100)}%` : "상승"}</p>
              <span className="text-center text-[1.3rem] font-bold" aria-hidden>+</span>
              <p className="rounded-xl bg-white/10 p-3 text-[0.95rem]">판매 4주 {prod.metrics.growthRate >= 0 ? "+" : ""}{Math.round(prod.metrics.growthRate * 100)}%<br />생산 착수 {prod.metrics.daysToDeadline == null ? "-" : prod.metrics.daysToDeadline < 0 ? "마감 지남" : `D-${prod.metrics.daysToDeadline}`}</p>
              <ArrowRight size={22} className="hidden justify-self-center md:block" aria-hidden />
              <p className="rounded-xl bg-white p-3 text-[0.95rem]" style={{ color: "var(--rv-navy)" }}><b>{actions[0]?.title ?? "고객 관심 상승 대응"}</b><br /><span className="text-[0.86rem]" style={{ color: "var(--rv-soft)" }}>{actions[0]?.recommendation}</span></p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- 05 CLOSED LOOP ---------------- */
function Loop() {
  const steps = [
    { en: "DATA", ko: "데이터", body: "판매 · 재고 · 생산 · 고객행동", icon: Database },
    { en: "ANALYZE", ko: "분석", body: "위험 · 기회 · 우선순위", icon: LineChart },
    { en: "ACTION", ko: "실행 제안", body: "생산 · 재고배분 · 판매 · 고객관리", icon: Sparkles },
    { en: "HUMAN", ko: "사람 승인", body: "대표·담당자 확인 / 승인 / 실행", icon: UserCheck },
    { en: "RESULT", ko: "결과 기록", body: "실행 내용과 실제 결과 기록", icon: PackageCheck },
    { en: "LEARN", ko: "다음 판단에 반영", body: "완료 전후 성과를 다음 검토의 근거로", icon: RotateCcw },
  ];
  return (
    <section id="loop" tabIndex={-1} aria-labelledby="loop-title" className="scroll-mt-20 outline-none">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <SectionHead id="loop" no="04" eyebrow="Closed Loop" title="분석에서 끝나지 않습니다." lead={<>판단이 실제 행동과 결과로 이어지고, 그 결과가 다시 다음 판단의 근거가 됩니다. <b style={{ color: "var(--rv-navy)" }}>자동 실행이 아닌 AI·AX 판단 + 사람 승인 방식</b>입니다.</>} />
        <ol className="mt-9 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6" data-testid="loop-steps">
          {steps.map((s, i) => (
            <li key={s.en} className="relative rounded-2xl border p-4" style={{ borderColor: s.en === "HUMAN" ? "var(--rv-navy)" : "var(--rv-line)", background: s.en === "HUMAN" ? "var(--rv-navy)" : "#fff", color: s.en === "HUMAN" ? "#fff" : undefined }}>
              <span className="flex items-center justify-between">
                <span className="text-[0.74rem] font-bold tracking-wider" style={{ color: s.en === "HUMAN" ? "var(--rv-gold-light)" : "var(--rv-teal)" }}>{i + 1} · {s.en}</span>
                <s.icon size={18} aria-hidden style={{ color: s.en === "HUMAN" ? "#fff" : "var(--rv-blue)" }} />
              </span>
              <span className="mt-1.5 block text-[1.05rem] font-bold [word-break:keep-all]">{s.ko}</span>
              <span className="mt-0.5 block text-[0.86rem] leading-snug [word-break:keep-all]" style={{ color: s.en === "HUMAN" ? "rgba(255,255,255,.85)" : "var(--rv-soft)" }}>{s.body}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-center gap-2 text-[0.86rem]" style={{ color: "var(--rv-soft)" }}><RotateCcw size={15} aria-hidden /> 6번 결과가 다시 1번 데이터로 돌아가는 순환 구조</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border p-4 text-[0.92rem]" style={{ borderColor: "var(--rv-line)" }}>
            <p className="font-bold" style={{ color: "var(--rv-navy)" }}><Pill tone="ok">구현 완료</Pill> 지금 동작하는 흐름</p>
            <p className="mt-2 leading-relaxed">규칙이 위험·기회를 감지해 Action을 제안 → 담당자 검토 → 대표·관리자 승인과 담당 지정 → 실행 메모·결과 기록 → 실증 기록 생성과 완료 전후 판매 비교(사후 성과) → 대표가 결과 확정</p>
          </div>
          <div className="rounded-2xl border p-4 text-[0.92rem]" style={{ borderColor: "var(--rv-line)" }}>
            <p className="font-bold" style={{ color: "var(--rv-navy)" }}><Pill tone="neutral">향후 고도화</Pill> 학습 단계</p>
            <p className="mt-2 leading-relaxed">지금은 결과 기록과 사후 성과를 다음 검토의 근거로 보여 주는 단계입니다. 실제 운영데이터가 쌓이면 결과를 예측 보정에 활용하는 방향으로 고도화합니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 06 개발 현황 ---------------- */
function Status() {
  const cols: { tone: Tone; label: string; desc: string; items: string[]; testid: string }[] = [
    {
      tone: "ok", label: "구현 완료", desc: "코드로 동작하며 시연 데이터로 확인", testid: "status-current",
      items: ["상품·재고·OEM 생산 관리", "판매 엑셀·CSV 가져오기와 자료 진단", "채널·B2B·수출·정산(받을 돈) 관리", "재고 소진 예상 · 생산 착수 마감 · 추천 생산량 (규칙·통계)", "회사별 생산 기준값 조정 (안전 재고일수 등)", "고객 AI 뷰티 파인더 · 추천 · 뷰티 패스포트", "고객 관심신호 수집 (익명 행동)", "Growth Action 제안 → 사람 검토·승인·결과 기록", "실증 기록 · 완료 전후 사후 성과 측정", "대표 브리핑 · 보고 슬라이드", "역할별 권한 (대표·관리자·직원) · PC·모바일 화면"],
    },
    {
      tone: "warn", label: "PILOT / 실증 중", desc: "기능은 준비 — 실제 회사 데이터로 검증 진행", testid: "status-pilot",
      items: ["실제 가연 상품·판매·재고 데이터 적용", "실제 OEM 계약 조건으로 생산 기준값 보정", "운영 데이터베이스 연결 · 실사용 (보안 저장·권한 기반 접근 준비 완료)", "고객 화면 공개 후 실제 관심신호 축적", "기준값 확정 후 Before / After 성과 측정", "실제 데이터 기준 Action 정확도 보정", "생성형 AI 경영 브리핑 문장화 (기능 준비, 사용 승인 후 시험)"],
    },
    {
      tone: "neutral", label: "향후 고도화", desc: "실데이터 축적 이후 적용", testid: "status-future",
      items: ["시계열 기반 수요예측", "머신러닝 기반 판매·재고 예측", "외부 판매채널 주문 데이터 자동 연결", "고도화된 AI 경영 브리핑"],
    },
  ];
  return (
    <section id="status" tabIndex={-1} aria-labelledby="status-title" className="scroll-mt-20 outline-none" style={{ background: "var(--rv-bg)" }}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <SectionHead id="status" no="05" eyebrow="개발 현황" title="현재 어디까지 개발됐나요?" lead="현재 구현된 것, 실제 데이터로 검증 중인 것, 앞으로 고도화할 것을 구분해 표시합니다." />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {cols.map((c) => (
            <div key={c.label} className="rounded-2xl border bg-white p-5" style={{ borderColor: "var(--rv-line)", borderTop: `4px solid ${TONE[c.tone].fg}` }} data-testid={c.testid}>
              <p><Pill tone={c.tone}>{c.label}</Pill></p>
              <p className="mt-2 text-[0.86rem]" style={{ color: "var(--rv-soft)" }}>{c.desc}</p>
              <ul className="mt-3 space-y-2">
                {c.items.map((it) => <li key={it} className="flex gap-2 text-[0.95rem] leading-snug [word-break:keep-all]"><span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE[c.tone].fg }} aria-hidden />{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.9rem] leading-relaxed" style={{ color: "var(--rv-soft)" }}>현재 PILOT은 설명 가능한 규칙·통계 기반 분석·예측을 중심으로 구현되어 있으며, 실제 운영데이터 축적 후 시계열·머신러닝 기반 수요예측으로 단계적으로 고도화할 예정입니다.</p>
      </div>
    </section>
  );
}

/* ---------------- 07 확장 방향 ---------------- */
function Roadmap() {
  const steps = [
    { n: "STEP 1", t: "가연인터내셔널 내부 Pilot", d: "실제 데이터 축적 · 운영효과 검증", now: true },
    { n: "STEP 2", t: "K-Beauty 제조·유통 Workflow 표준화", d: "판매·재고·생산·고객관리 흐름 정리" },
    { n: "STEP 3", t: "유사 화장품 중소기업을 위한 구독형 K-Beauty AX 서비스 확장 검토", d: "사업화 방향 — 검토 단계" },
  ];
  return (
    <section id="roadmap" tabIndex={-1} aria-labelledby="roadmap-title" className="scroll-mt-20 outline-none">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <SectionHead id="roadmap" no="06" eyebrow="확장 방향" title={<>가연의 내부 AX에서,<br className="hidden sm:block" /> K-Beauty 업종형 서비스로</>} />
        <ol className="mt-8 grid gap-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          {steps.map((s, i) => [
            i > 0 && <li key={`a${i}`} aria-hidden className="list-none"><FlowArrow /></li>,
            <li key={s.n} className="rounded-2xl border p-5 [word-break:keep-all]" style={{ borderColor: s.now ? "var(--rv-blue)" : "var(--rv-line)", background: s.now ? "var(--rv-blue-soft)" : "#fff" }}>
              <span className="flex items-center gap-2 text-[0.8rem] font-bold" style={{ color: s.now ? "var(--rv-blue)" : "var(--rv-soft)" }}>{s.n}{s.now && <Pill tone="blue">지금 단계</Pill>}</span>
              <span className="mt-1.5 block text-[1.08rem] font-bold leading-snug" style={{ color: "var(--rv-navy)" }}>{s.t}</span>
              <span className="mt-1 block text-[0.9rem]" style={{ color: "var(--rv-soft)" }}>{s.d}</span>
            </li>,
          ])}
        </ol>
        <p className="mt-5 max-w-[48rem] text-[0.98rem] leading-relaxed" style={{ color: "var(--rv-soft)" }}>
          현재의 최우선 목표는 가연인터내셔널 내부에서 실제 데이터를 축적하고 운영효과를 검증하는 것입니다. 이후 유사한 판매·재고·생산·고객관리 문제를 가진 K-Beauty 중소기업에 적용 가능한 업종형 구독서비스로의 확장을 검토하고 있습니다.
        </p>
      </div>
    </section>
  );
}

/* ---------------- 마무리 ---------------- */
function Closing() {
  return (
    <section aria-labelledby="closing-title" style={{ background: "var(--rv-navy)", color: "#fff" }}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 text-center md:px-6 md:py-16">
        <h2 id="closing-title" className="font-display text-[clamp(1.4rem,3vw,2rem)] font-bold tracking-wide">MIRYEO K-Beauty Growth AX</h2>
        <p className="mt-2 text-[1.05rem] font-semibold">현재 개발·실증 중인 PILOT입니다.</p>
        <p className="mx-auto mt-3 max-w-[40rem] text-[0.95rem] leading-relaxed text-white/80">실제 상품·판매·재고·고객 데이터를 단계적으로 연결하여 분석 정확도와 운영효과를 검증해 나가고 있습니다.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[0.82rem]">
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold">AX Sprint II 제출용 Review Page</span>
          <NoticeBadge tone="dark" />
        </div>
      </div>
    </section>
  );
}
