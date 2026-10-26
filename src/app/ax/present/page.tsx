"use client";

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Printer, X } from "lucide-react";
import { RankBars } from "@/components/ax/RankBars";
import { ACTION_STATUS_LABEL } from "@/components/ax/Cards";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { buildBriefing, type BriefTone } from "@/lib/briefing";
import { buildNotifications, type NoticeTone } from "@/lib/notifications";
import { change, marginRate, monthlySummary, monthUpTo, samePeriodDay } from "@/lib/monthly";
import { targetProgress } from "@/lib/targets";
import { AGING_LABEL, receivableAging, summarizeReceivables } from "@/lib/settlements";
import { AGING_COLOR } from "@/components/ax/AgingBar";
import { doneAt } from "@/lib/action-outcome";
import { lastDays, measureMoneyKpis } from "@/lib/evidence";
import { formatKRW, formatPct } from "@/lib/analytics";
import { daysBetween, formatDateKR } from "@/lib/date";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { useNarrow } from "@/lib/use-narrow";
import { actionCounts, productMovers, slidesFor, STATUS_ORDER, stockWatch, weeklySales, type SlideDef } from "@/lib/present";

/* 대표 보고 모드 (PASS 14, R-01) — 데이터에서 자동으로 만드는 보고 슬라이드.
   PC: 1280×720 슬라이드를 화면에 맞춰 확대·축소, ←/→·스페이스·Home/End·숫자키, 전체 화면, 인쇄(슬라이드 1장 = 1쪽).
   모바일: 같은 내용을 폭에 맞춘 카드로 (좌우로 밀어 넘김). 권한 밖(매출·이익) 슬라이드는 만들지 않는다. */

const W = 1280, H = 720;

/* 본문 영역(@container)은 position:fixed를 가두므로 body 바로 아래로 그린다 (사이드바·헤더 위를 덮게).
   인쇄할 때는 앱 화면을 숨기고 이 영역(슬라이드 전체)만 찍는다 — globals.css body.present-open */
function Deck() {
  const m = useModel();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-present-root", "");
    document.body.appendChild(el);
    document.body.classList.add("present-open");
    setHost(el);
    return () => { el.remove(); document.body.classList.remove("present-open"); };
  }, []);
  if (!host) return null;
  return createPortal(m.snapshot.products.length === 0 ? <EmptyDeck /> : <DeckInner />, host);
}

function EmptyDeck() {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 print:hidden" style={{ background: "#0E1320" }} data-testid="present">
      <div className="ax-card max-w-md p-6 text-center">
        <h2 className="text-[1.2rem] font-bold">보고할 데이터가 아직 없습니다</h2>
        <p className="mt-2 text-[0.92rem] text-ink-soft">상품·판매를 입력하면 보고 슬라이드가 자동으로 만들어집니다.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-secondary" onClick={() => router.push("/ax")} data-testid="present-close">닫기</button>
          <button className="btn-primary" onClick={() => router.push("/ax/data")}>판매 파일로 시작</button>
        </div>
      </div>
    </div>
  );
}

function DeckInner() {
  const { role } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const narrow = useNarrow();
  const slides = useMemo(() => slidesFor(role), [role]);
  const n = slides.length;
  const initial = Math.min(n, Math.max(1, Number(params.get("s")) || 1)) - 1;
  const [i, setI] = useState(initial);
  const [k, setK] = useState(0);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);

  const go = useCallback((to: number) => {
    const next = Math.max(0, Math.min(n - 1, to));
    setI(next);
    router.replace(`/ax/present?s=${next + 1}`, { scroll: false });
  }, [n, router]);
  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    router.push("/ax");
  }, [router]);

  // 화면 크기에 맞춰 슬라이드 배율 계산 (PC)
  useEffect(() => {
    const el = stage.current;
    if (!el || narrow) return;
    const fit = () => setK(Math.min(el.clientWidth / W, el.clientHeight / H) * 0.96); // 가장자리 여백 — 슬라이드처럼 보이게
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow]);

  // 키보드 · 본문 스크롤 잠금 · 열면 슬라이드에 포커스
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(n - 1); }
      else if (/^[1-9]$/.test(e.key)) go(Number(e.key) - 1);
      else if (e.key === "Escape" && !document.fullscreenElement) close();
      else if (e.key === "f" || e.key === "F") toggleFull();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    deck.current?.focus();
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => { document.body.style.overflow = prev; document.removeEventListener("fullscreenchange", onFs); };
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const cur = slides[i];
  return (
    <>
      <div
        ref={deck}
        tabIndex={-1}
        role="region"
        aria-roledescription="보고 슬라이드"
        aria-label="대표 보고 모드"
        className="fixed inset-0 z-[70] flex flex-col outline-none print:hidden"
        style={{ background: "#0E1320" }}
        data-testid="present"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? i + 1 : i - 1);
        }}
      >
        <p className="sr-only" aria-live="polite">{`슬라이드 ${i + 1} / ${n}: ${cur.title}`}</p>
        <div ref={stage} className={narrow ? "flex-1 overflow-y-auto p-3" : "relative flex-1 overflow-hidden"}>
          {narrow ? (
            <Slide def={cur} index={i} total={n} narrow />
          ) : k > 0 && (
            <div className="absolute left-1/2 top-1/2" style={{ width: W * k, height: H * k, transform: "translate(-50%, -50%)" }}>
              <div style={{ width: W, height: H, transform: `scale(${k})`, transformOrigin: "top left" }}>
                <div className="h-full w-full overflow-hidden rounded-[14px] shadow-2xl"><Slide def={cur} index={i} total={n} /></div>
              </div>
            </div>
          )}
        </div>

        <nav aria-label="슬라이드 이동" className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-white sm:px-5" data-testid="present-controls">
          <button className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30" onClick={() => go(i - 1)} disabled={i === 0} aria-label="이전 슬라이드"><ChevronLeft size={22} aria-hidden /></button>
          <span className="tabular min-w-[3.5rem] text-center text-[0.95rem] font-semibold" data-testid="present-page">{i + 1} / {n}</span>
          <button className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="다음 슬라이드"><ChevronRight size={22} aria-hidden /></button>
          <ol className="mx-2 hidden min-w-0 flex-1 items-center gap-1.5 md:flex" aria-label="슬라이드 목록">
            {slides.map((s, j) => (
              <li key={s.id}>
                <button onClick={() => go(j)} aria-label={`${j + 1}. ${s.title}`} aria-current={j === i ? "step" : undefined} title={s.title} className="flex h-6 items-center px-0.5">
                  <span className="block h-1.5 rounded-full transition-all" style={{ width: j === i ? 28 : 10, background: j === i ? "#fff" : "rgba(255,255,255,.35)" }} />
                </button>
              </li>
            ))}
          </ol>
          <span className="ml-auto flex items-center gap-1">
            <button className="hidden h-11 items-center gap-1.5 rounded-lg px-3 text-[0.9rem] font-semibold hover:bg-white/10 sm:flex" onClick={() => window.print()}><Printer size={18} aria-hidden /> 인쇄·PDF</button>
            <button className="hidden h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 sm:flex" onClick={toggleFull} aria-label={full ? "전체 화면 끝내기" : "전체 화면"} aria-pressed={full}>{full ? <Minimize2 size={19} aria-hidden /> : <Maximize2 size={19} aria-hidden />}</button>
            <button className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-[0.9rem] font-semibold hover:bg-white/10" onClick={close} data-testid="present-close"><X size={19} aria-hidden /> 닫기</button>
          </span>
        </nav>
      </div>

      <PrintDeck slides={slides} />
    </>
  );
}

/* 인쇄: 모든 슬라이드를 한 쪽씩 — 화면에서는 숨김, 슬라이드를 넘길 때 다시 그리지 않음 */
const PrintDeck = memo(function PrintDeck({ slides }: { slides: SlideDef[] }) {
  return (
    <div className="hidden print:block" data-testid="present-print" aria-hidden>
      {slides.map((s, j) => (
        <div key={s.id} className="present-print-page">
          <Slide def={s} index={j} total={slides.length} print />
        </div>
      ))}
    </div>
  );
});

export default function PresentPage() {
  return <Suspense><Deck /></Suspense>;
}

/* ---------------- 슬라이드 ---------------- */

const TONE_COLOR: Record<BriefTone | NoticeTone, string> = {
  risk: "var(--danger)", danger: "var(--danger)", warn: "var(--warning)", warning: "var(--warning)", good: "var(--success)", success: "var(--success)", info: "var(--primary)",
};

function Slide({ def, index, total, narrow = false, print = false }: { def: SlideDef; index: number; total: number; narrow?: boolean; print?: boolean }) {
  const m = useModel();
  const fixed = !narrow && !print;
  return (
    <section
      aria-roledescription="슬라이드"
      aria-label={`${index + 1} / ${total}: ${def.title}`}
      data-slide={def.id}
      className={`@container flex flex-col overflow-hidden bg-surface text-ink ${fixed ? "h-full w-full p-[44px_56px]" : print ? "p-8" : "min-h-full rounded-2xl p-5"}`}
      style={{ fontSize: fixed ? 20 : print ? 14 : 16 }}
    >
      <header className="flex items-center justify-between gap-3 text-[0.72em] font-semibold text-ink-soft">
        <span><span className={narrow ? "hidden" : ""}>MIRYEO Business AX · </span>대표 보고 · {formatDateKR(m.today)}</span>
        <span className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5" style={isLive ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--warning-soft)", color: "var(--warning)" }}>
          {isLive ? "LIVE 실데이터" : m.snapshot.practice ? "DEMO · 샘플 연습" : "DEMO — 실제 실적 아님"}
        </span>
      </header>
      {def.id !== "cover" && <h2 className="mt-[0.5em] text-[1.75em] font-bold leading-tight tracking-tight">{def.title}</h2>}
      <div className="mt-[0.8em] min-h-0 flex-1">{renderBody(def)}</div>
      <footer className="mt-[0.6em] flex items-center justify-between gap-3 text-[0.66em] text-ink-soft">
        <span>근거: 입력된 판매·재고·고객·Action 기록 (RULE·STATISTICAL 계산) · 판매 {formatDateKR(m.salesAsOf)}까지</span>
        <span className="tabular">{index + 1} / {total}</span>
      </footer>
    </section>
  );
}

function renderBody(def: SlideDef): ReactNode {
  switch (def.id) {
    case "cover": return <Cover />;
    case "summary": return <Summary />;
    case "numbers": return <Numbers />;
    case "month": return <Month />;
    case "products": return <Products />;
    case "channels": return <Channels />;
    case "customers": return <Customers />;
    case "execution": return <Execution />;
    case "next": return <Next />;
  }
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
      <div className="text-[0.78em] font-semibold text-ink-soft">{label}</div>
      <div className="mt-[0.15em] text-[1.6em] font-bold leading-tight tracking-tight" style={tone ? { color: tone } : undefined}>{value}</div>
      {sub != null && <div className="mt-[0.2em] text-[0.74em] text-ink-soft">{sub}</div>}
    </div>
  );
}
/** 막대 위 값 — 좁은 칸에 들어가게 '원' 생략 (1.1억 · 7,242만) */
const shortKRW = (v: number) => (Math.abs(v) >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}억` : Math.abs(v) >= 10_000 ? `${Math.round(v / 10_000).toLocaleString()}만` : `${v.toLocaleString()}`);
const trendText = (r: number | null | undefined, label = "이전 4주 대비") => (r == null ? "비교 기간 없음" : <span style={{ color: r >= 0 ? "var(--success)" : "var(--danger)" }} className="font-semibold">{formatPct(r)} {label}</span>);

function Cover() {
  const m = useModel();
  const { role } = useSession();
  const slides = slidesFor(role);
  return (
    <div className="grid h-full gap-[1.2em] @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @3xl:items-center">
      <div>
        <div className="text-[0.9em] font-semibold" style={{ color: "var(--primary)" }}>{m.snapshot.org.name}</div>
        <h2 className="mt-[0.3em] text-[2.6em] font-bold leading-[1.15] tracking-tight">경영 보고</h2>
        <p className="mt-[0.4em] text-[1em] text-ink-soft">판매·재고·생산·채널·고객·실행을 한 번에 — 최근 4주 vs 이전 4주</p>
        <p className="tabular mt-[0.8em] text-[0.86em]">기준일 <b>{formatDateKR(m.today)}</b> · 판매 입력 <b>{formatDateKR(m.salesAsOf)}</b>까지</p>
        {!isLive && <p className="mt-[0.8em] inline-block rounded-[0.5em] px-[0.7em] py-[0.4em] text-[0.8em] font-semibold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO 데이터 — 시연용 숫자이며 실제 실적이 아닙니다</p>}
        {!can(role, "view_financials") && <p className="mt-[0.6em] text-[0.78em] text-ink-soft">직원 권한: 매출·이익 슬라이드는 제외했습니다</p>}
      </div>
      <ol className="space-y-[0.35em] rounded-[0.8em] bg-surface-muted p-[0.9em] text-[0.82em]" aria-label="목차">
        {slides.slice(1).map((s, j) => <li key={s.id} className="flex gap-[0.6em]"><span className="tabular w-[1.4em] text-ink-soft">{j + 2}</span><span className="font-semibold">{s.title}</span></li>)}
      </ol>
    </div>
  );
}

function Summary() {
  const m = useModel();
  const { role } = useSession();
  const b = buildBriefing(m, { financial: can(role, "view_financials") });
  return (
    <div>
      <p className="text-[1.25em] font-bold leading-snug">{b.headline}</p>
      <ul className="mt-[0.7em] space-y-[0.45em]">
        {b.lines.slice(0, 6).map((l, j) => (
          <li key={j} className="flex items-start gap-[0.6em] text-[0.92em] leading-snug">
            <span className="mt-[0.45em] h-[0.55em] w-[0.55em] shrink-0 rounded-full" style={{ background: TONE_COLOR[l.tone] }} aria-hidden />
            <span><b className="font-semibold">{l.topic}</b> · {l.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Numbers() {
  const m = useModel();
  const { kpis } = m;
  const weeks = weeklySales(m);
  const max = Math.max(1, ...weeks.map((w) => w.revenue));
  const units = m.channelStats.reduce((a, c) => a + c.recentUnits, 0);
  return (
    <div className="flex h-full flex-col gap-[0.9em]">
      <div className="grid grid-cols-2 gap-[0.6em] @3xl:grid-cols-4">
        <div data-revenue28={kpis.revenue28} className="contents"><Stat label="최근 4주 매출" value={formatKRW(kpis.revenue28)} sub={trendText(kpis.revenueGrowth)} /></div>
        <Stat label="판매 수량 (4주)" value={`${units.toLocaleString()}개`} sub={`판매 중 SKU ${kpis.totalSku}개`} />
        <Stat label="재고 위험 SKU" value={`${kpis.stockRiskSku}개`} sub={`과잉 ${kpis.overStockSku}개 별도`} tone={kpis.stockRiskSku ? "var(--warning)" : undefined} />
        <Stat label="B2B·수출 (4주)" value={formatKRW(kpis.b2bExportRevenue28)} sub={trendText(kpis.b2bExportGrowth)} />
      </div>
      <div className="min-h-0 flex-1 rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">주간 매출 (8주, 판매 기준일까지)</div>
        <ol className="mt-[0.5em] flex h-[7.5em] items-end gap-[0.5em]" aria-label="주간 매출 8주">
          {weeks.map((w, j) => (
            <li key={w.to} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[0.25em]" data-week-revenue={w.revenue}>
              <span className="tabular whitespace-nowrap text-[0.6em] text-ink-soft">{shortKRW(w.revenue)}</span>
              <span className="block w-full max-w-[3em] rounded-t-[4px]" style={{ height: `${Math.max(2, (w.revenue / max) * 100)}%`, background: j >= 4 ? "var(--chart-1)" : "color-mix(in srgb, var(--chart-1) 40%, transparent)" }} aria-hidden />
              <span className="tabular text-[0.6em] text-ink-soft">{w.to.slice(5).replace("-", ".")}</span>
            </li>
          ))}
        </ol>
        <p className="mt-[0.3em] text-[0.62em] text-ink-soft">진한 막대 = 최근 4주, 연한 막대 = 이전 4주 · 날짜는 각 주의 마지막 날</p>
      </div>
    </div>
  );
}

function Month() {
  const m = useModel();
  const rows = monthlySummary(m.snapshot.sales, m.snapshot.products, m.snapshot.channels, m.today, 12);
  const cur = rows[rows.length - 1], prev = rows[rows.length - 2];
  const tp = targetProgress(cur.month, cur.revenue, m.snapshot.monthlyTargets ?? [], m.today);
  const mr = marginRate(cur);
  const rs = summarizeReceivables(m.snapshot.settlements, m.today);
  const aging = receivableAging(m.snapshot.settlements, m.today);
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  const day = Number(m.today.slice(8, 10));
  const spDay = samePeriodDay(m.today, m.salesAsOf);
  const sp = monthUpTo(m.snapshot.sales, m.snapshot.products, m.snapshot.channels, prev.month, spDay); // 지난달 같은 기간 (PASS 33, D-112)
  const spChange = change(cur.revenue, sp.revenue);
  const narrow = useNarrow(); // 좁은 화면은 월 라벨 12개가 붙어 읽히지 않음 → 3개월마다(끝 = 이번 달) 하나씩 (PASS 32)
  return (
    <div className="flex h-full flex-col gap-[0.9em]">
      <div className="grid grid-cols-2 gap-[0.6em] @3xl:grid-cols-4">
        <Stat label={`이번 달 매출 (${day}일까지)`} value={formatKRW(cur.revenue)} sub={<>지난달 1~{spDay}일 {formatKRW(sp.revenue)}{spChange != null && <b className="ml-1" style={{ color: spChange >= 0 ? "var(--success)" : "var(--danger)" }}>{formatPct(spChange)}</b>}</>} />
        <Stat label="목표 대비" value={tp.rate != null ? `${Math.round(tp.rate * 100)}%` : "목표 미입력"} sub={tp.rate != null ? `월 경과 ${Math.round(tp.elapsed * 100)}% · ${tp.status}` : "월별 실적에서 입력"} tone={tp.rate != null ? (tp.rate >= tp.elapsed ? "var(--success)" : "var(--warning)") : undefined} />
        <Stat label="매출총이익" value={formatKRW(cur.grossProfit)} sub={mr == null ? "원가 미입력" : `이익률 ${Math.round(mr * 100)}% (원가 입력 제품)`} />
        <Stat label="받을 돈 (미수금)" value={formatKRW(rs.outstanding)} sub={<>{rs.overdueCount ? `연체 ${rs.overdueCount}건 · ${formatKRW(rs.overdueAmount)}` : "연체 없음"}<AgingStrip rows={aging} total={rs.outstanding} /></>} tone={rs.overdueCount ? "var(--danger)" : undefined} />
      </div>
      <div className="min-h-0 flex-1 rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">월별 매출 (12개월)</div>
        <ol className="mt-[0.5em] flex h-[7.5em] items-end gap-[0.4em]" aria-label="월별 매출 12개월">
          {rows.map((r, i) => {
            const inProgress = r.month === cur.month;
            const showLabel = !narrow || (rows.length - 1 - i) % 3 === 0;
            return (
              <li key={r.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[0.25em]">
                <span className="block w-full max-w-[2.6em] rounded-t-[4px]" style={{ height: `${Math.max(2, (r.revenue / max) * 100)}%`, background: inProgress ? "color-mix(in srgb, var(--chart-1) 45%, transparent)" : "var(--chart-1)", outline: inProgress ? "1.5px dashed var(--chart-1)" : undefined }} aria-hidden />
                <span className={`tabular text-[0.58em] text-ink-soft ${showLabel ? "" : "invisible"}`} aria-hidden={!showLabel || undefined}>{r.month.slice(2).replace("-", ".")}</span>
                <span className="sr-only">{r.month} {formatKRW(r.revenue)}{inProgress ? " (진행 중)" : ""}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-[0.3em] text-[0.62em] text-ink-soft">점선 막대 = 이번 달 (진행 중) · 판관비 제외 매출총이익 기준</p>
      </div>
    </div>
  );
}

/* 받을 돈 연령 (PASS 32, D-110) — 보고 장에서 '기한 넘긴 돈 %'와 구간 막대. 색은 정산 화면·대시보드와 같음 */
function AgingStrip({ rows, total }: { rows: ReturnType<typeof receivableAging>; total: number }) {
  if (total <= 0) return null;
  const over = rows.filter((r) => r.bucket !== "notDue").reduce((a, r) => a + r.amount, 0);
  const shown = rows.filter((r) => r.amount > 0);
  return (
    <span className="mt-[0.45em] block" data-testid="present-aging">
      <span className="flex h-[0.42em] w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
        {shown.map((r) => <span key={r.bucket} className="h-full" style={{ width: `${Math.max(3, (r.amount / total) * 100)}%`, background: AGING_COLOR[r.bucket] }} data-bucket={r.bucket} />)}
      </span>
      <span className="mt-[0.3em] block" data-testid="present-aging-over">기한 넘긴 돈 <b className="tabular" style={{ color: over > 0 ? "var(--danger)" : undefined }}>{over > 0 && over / total < 0.01 ? "1% 미만" : `${Math.round((over / total) * 100)}%`}</b></span>
      <span className="sr-only">{shown.map((r) => `${AGING_LABEL[r.bucket]} ${formatKRW(r.amount)}`).join(", ")}</span>
    </span>
  );
}

function MoverList({ title, rows, tone }: { title: string; rows: ReturnType<typeof productMovers>["up"]; tone: string }) {
  return (
    <div className="rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
      <div className="text-[0.78em] font-semibold text-ink-soft">{title}</div>
      {rows.length === 0 ? <p className="mt-[0.4em] text-[0.8em] text-ink-soft">해당 없음</p> : (
        <ul className="mt-[0.4em] space-y-[0.35em]">
          {rows.map(({ p, mm }) => (
            <li key={p.id} className="flex items-baseline justify-between gap-[0.6em] text-[0.88em]">
              <span className="min-w-0 truncate font-semibold">{p.name}</span>
              <span className="tabular shrink-0"><span className="text-ink-soft">{mm.recent4wUnits.toLocaleString()}개 </span><b style={{ color: tone }}>{formatPct(mm.growthRate)}</b></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Products() {
  const m = useModel();
  const { up, down } = productMovers(m);
  const watch = stockWatch(m);
  return (
    <div className="grid gap-[0.7em] @3xl:grid-cols-2">
      <MoverList title="4주 판매 성장 상위" rows={up} tone="var(--success)" />
      <MoverList title="4주 판매 감소 상위" rows={down} tone="var(--danger)" />
      <div className="rounded-[0.7em] border p-[0.8em] @3xl:col-span-2" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">재고·생산 주의 (품절위험·부족주의·생산 착수 마감 14일 이내)</div>
        {watch.length === 0 ? <p className="mt-[0.4em] text-[0.8em] text-ink-soft">주의할 상품 없음</p> : (
          <ul className="mt-[0.4em] grid gap-[0.35em] @3xl:grid-cols-2">
            {watch.map(({ p, mm }) => (
              <li key={p.id} className="flex items-baseline justify-between gap-[0.6em] rounded-[0.5em] bg-surface-muted px-[0.6em] py-[0.35em] text-[0.84em]">
                <span className="min-w-0 truncate font-semibold">{p.name}</span>
                <span className="shrink-0 text-ink-soft">
                  {mm.daysToDeadline != null && mm.daysToDeadline <= 14 ? <b style={{ color: mm.daysToDeadline <= 0 ? "var(--danger)" : "var(--warning)" }}>{mm.daysToDeadline <= 0 ? "생산 착수 마감 지남" : `착수 D-${mm.daysToDeadline}`}</b> : <b style={{ color: "var(--warning)" }}>{mm.stockStatus}</b>}
                  {Number.isFinite(mm.daysOfStock) ? ` · 약 ${Math.round(mm.daysOfStock)}일분` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Channels() {
  const m = useModel();
  const rows = m.channelStats;
  const total = rows.reduce((a, r) => a + r.recentRevenue, 0);
  return (
    <div className="text-[0.95em]">
      <p className="mb-[0.6em] text-[0.8em] text-ink-soft">최근 4주 합계 {formatKRW(total)} · 큰 순서</p>
      {rows.length === 0 ? <p className="text-ink-soft">채널 없음</p> : (
        <RankBars label="채널별 최근 4주 매출" items={rows.map((r) => ({ id: r.channel.id, label: r.channel.name, value: r.recentRevenue, prev: r.prevRevenue, valueText: formatKRW(r.recentRevenue), change: r.prevRevenue > 0 ? r.growthRate : null }))} />
      )}
    </div>
  );
}

function Customers() {
  const m = useModel();
  const c = m.customer;
  const rising = [...c.productInterest].filter((x) => x.recentScore > 0).sort((a, b) => b.recentScore - a.recentScore).slice(0, 4);
  const top = c.concerns.slice(0, 4);
  const sum = c.concerns.reduce((a, x) => a + x.count, 0);
  return (
    <div className="grid gap-[0.7em] @3xl:grid-cols-2">
      <div className="grid grid-cols-3 gap-[0.6em] @3xl:col-span-2">
        <Stat label="Finder 완료 (7일)" value={`${c.recent.finder_complete}건`} sub={`이전 7일 ${c.prev.finder_complete}`} />
        <Stat label="Passport 저장 (7일)" value={`${c.recent.passport_save}건`} sub={`이전 7일 ${c.prev.passport_save}`} />
        <Stat label="Finder → Passport" value={c.conversionRecent == null ? "-" : `${(c.conversionRecent * 100).toFixed(1)}%`} sub={`이전 7일 ${formatPct(c.conversionPrev, false)}`} />
      </div>
      <div className="rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">관심점수 상위 제품 (7일)</div>
        {rising.length === 0 ? <p className="mt-[0.4em] text-[0.8em] text-ink-soft">관심 데이터 없음</p> : (
          <ul className="mt-[0.4em] space-y-[0.35em]">
            {rising.map((x) => (
              <li key={x.productId} className="flex items-baseline justify-between gap-[0.6em] text-[0.88em]">
                <span className="min-w-0 truncate font-semibold">{m.productById.get(x.productId)?.name ?? x.productId}</span>
                <span className="tabular shrink-0">{x.recentScore}점 <b style={{ color: (x.growth ?? 1) >= 0 ? "var(--success)" : "var(--danger)" }}>{x.growth == null ? "신규" : formatPct(x.growth)}</b></span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">고객이 고른 피부 고민 (7일)</div>
        {top.length === 0 ? <p className="mt-[0.4em] text-[0.8em] text-ink-soft">Finder 완료 없음</p> : (
          <ul className="mt-[0.4em] space-y-[0.45em]">
            {top.map((x) => (
              <li key={x.concern} className="text-[0.84em]">
                <div className="flex justify-between"><span className="font-semibold">{x.concern}</span><span className="tabular text-ink-soft">{x.count}회 · {Math.round((x.count / sum) * 100)}%</span></div>
                <div className="mt-[0.2em] h-[0.45em] rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${(x.count / top[0].count) * 100}%`, background: "#C76C86" }} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Execution() {
  const m = useModel();
  const counts = actionCounts(m);
  const total = m.actions.length || 1;
  const proofs = m.snapshot.proofEvents;
  const money = measureMoneyKpis(m.snapshot, lastDays(28, m.today));
  const locked = money.filter((k) => k.baseline).length;
  const recentDone = m.actions.filter((a) => a.status === "DONE").map((a) => ({ a, at: doneAt(a, m.snapshot) })).sort((x, y) => (y.at ?? "").localeCompare(x.at ?? "")).slice(0, 3);
  const pilot = m.snapshot.org.pilotStartedOn;
  const week = pilot ? Math.max(0, Math.floor(daysBetween(pilot, m.today) / 7)) : null;
  const colors: Record<string, string> = { NEW: "var(--chart-5)", REVIEWED: "var(--chart-2)", IN_PROGRESS: "var(--chart-1)", DONE: "var(--success)", DISMISSED: "var(--border)" };
  return (
    <div className="grid gap-[0.7em] @3xl:grid-cols-2">
      <div className="rounded-[0.7em] border p-[0.8em] @3xl:col-span-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-baseline justify-between text-[0.78em] font-semibold text-ink-soft"><span>Action 상태 (전체 {m.actions.length}건)</span><span>추천 → 검토 → 실행 → 완료 (사람 승인)</span></div>
        <div className="mt-[0.5em] flex h-[0.9em] overflow-hidden rounded-full bg-surface-muted" aria-hidden>
          {STATUS_ORDER.map((s) => counts[s] > 0 && <span key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: colors[s] }} />)}
        </div>
        <ul className="mt-[0.5em] flex flex-wrap gap-x-[1.1em] gap-y-[0.2em] text-[0.8em]">
          {STATUS_ORDER.map((s) => <li key={s} className="inline-flex items-center gap-[0.35em]"><span className="h-[0.6em] w-[0.6em] rounded-full" style={{ background: colors[s] }} aria-hidden />{ACTION_STATUS_LABEL[s]} <b className="tabular">{counts[s]}</b></li>)}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-[0.6em] @3xl:col-span-2">
        <Stat label="Proof Event" value={`${proofs.length}건`} sub={`결과 확정 ${proofs.filter((p) => p.status === "RESULT_CONFIRMED").length} · 측정중 ${proofs.filter((p) => p.status === "RECORDED").length}`} />
        <Stat label="Money KPI 기준값" value={`${locked} / 3`} sub={locked < 3 ? "잠그기 전 개선률 없음" : "잠금 완료"} tone={locked < 3 ? "var(--warning)" : undefined} />
        <Stat label="12주 실증" value={week == null ? "시작 전" : week > 12 ? "완료" : `Week ${week}`} sub={m.snapshot.org.axOwnerName ? `책임자 ${m.snapshot.org.axOwnerName}` : "AX OWNER 미지정"} />
      </div>
      <div className="rounded-[0.7em] border p-[0.8em] @3xl:col-span-2" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">최근 완료한 Action</div>
        {recentDone.length === 0 ? <p className="mt-[0.4em] text-[0.8em] text-ink-soft">아직 완료한 Action이 없습니다</p> : (
          <ul className="mt-[0.4em] space-y-[0.3em] text-[0.86em]">
            {recentDone.map(({ a, at }) => <li key={a.id} className="flex justify-between gap-[0.6em]"><span className="min-w-0 truncate font-semibold">{a.title}</span><span className="tabular shrink-0 text-ink-soft">{at ? formatDateKR(at) : "-"}</span></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Next() {
  const m = useModel();
  const { role } = useSession();
  const notices = buildNotifications(m, role, { allowPractice: !isLive }).filter((x) => x.tone === "danger" || x.tone === "warning");
  return (
    <div className="grid gap-[0.7em] @3xl:grid-cols-2">
      <div className="rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">위험·주의 (알림 센터와 같은 기준)</div>
        {notices.length === 0 ? <p className="mt-[0.4em] text-[0.84em] text-ink-soft">위험·주의 항목 없음</p> : (
          <ul className="mt-[0.4em] space-y-[0.45em]">
            {notices.map((x) => (
              <li key={x.id} className="flex items-start gap-[0.55em] text-[0.86em] leading-snug">
                <span className="mt-[0.4em] h-[0.55em] w-[0.55em] shrink-0 rounded-full" style={{ background: TONE_COLOR[x.tone] }} aria-hidden />
                <span><b className="font-semibold">{x.title}</b><span className="block text-[0.9em] text-ink-soft">{x.detail}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-[0.7em] border p-[0.8em]" style={{ borderColor: "var(--border)" }}>
        <div className="text-[0.78em] font-semibold text-ink-soft">오늘의 Mission (우선순위 상위)</div>
        {m.missions.length === 0 ? <p className="mt-[0.4em] text-[0.84em] text-ink-soft">처리할 Action 없음</p> : (
          <ol className="mt-[0.4em] space-y-[0.5em]">
            {m.missions.map((a, j) => (
              <li key={a.id} className="flex items-start gap-[0.55em] text-[0.86em] leading-snug">
                <span className="tabular flex h-[1.4em] w-[1.4em] shrink-0 items-center justify-center rounded-full text-[0.8em] font-bold text-white" style={{ background: "var(--primary)" }}>{j + 1}</span>
                <span><b className="font-semibold">{a.title}</b><span className="block text-[0.9em] text-ink-soft">{a.recommendation}</span></span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="text-[0.72em] text-ink-soft @3xl:col-span-2">추천은 사람이 검토·승인한 뒤에만 실행합니다 (자동 실행 없음). 처리: AI Growth Center</p>
    </div>
  );
}
