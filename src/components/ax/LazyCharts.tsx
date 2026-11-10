"use client";

/* 차트는 늦게 불러오기 (PASS 38, D-139) — recharts(압축 전 약 450KB)를 화면 첫 묶음에서 빼고, 차트를 그릴 때 따로 받는다.
   자리는 미리 같은 높이로 잡아 두어 차트가 들어와도 화면이 밀리지 않는다. 차트 파일(TrendChart·DonutPie·MonthlyChart)을 직접 불러오지 말 것.

   차트 묶음을 못 받아도 화면은 그대로 (PASS 41, D-148) — 예전에는 차트 하나를 못 받으면 그 화면 전체가 오류 화면으로 바뀌었다.
   지금은 조용히 두 번 더 받아 보고, 그래도 안 되면 차트 자리에만 '다시 시도'를 보인다. 숫자·표·버튼은 그대로 쓸 수 있다. */
import { useEffect, useState, type ComponentProps, type ComponentType } from "react";
import { RefreshCw } from "lucide-react";
import type { DailyEvents as DailyEventsT, WeeklyTrend as WeeklyTrendT } from "./TrendChart";
import type { DonutPie as DonutPieT } from "./DonutPie";
import type { MonthlyChart as MonthlyChartT } from "./MonthlyChart";

const Hold = () => <div aria-hidden className="h-full w-full rounded-xl" style={{ background: "color-mix(in srgb, var(--border) 30%, transparent)" }} data-chart-loading />;
const HoldRing = () => <div aria-hidden className="h-full w-full rounded-full" style={{ border: "32px solid color-mix(in srgb, var(--border) 30%, transparent)" }} data-chart-loading />;

/** 다시 받기 간격 (ms) — 처음 실패 뒤 0.5초, 1.2초 */
const RETRY_WAIT = [500, 1200];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ChartFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-2 text-center" style={{ borderColor: "var(--border)" }} role="status" data-testid="chart-failed">
      <p className="text-[0.82rem] text-ink-soft">차트를 불러오지 못했습니다</p>
      <button type="button" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-[0.84rem] font-semibold hover:bg-surface-muted" style={{ borderColor: "var(--border)" }} onClick={onRetry} data-testid="chart-retry">
        <RefreshCw size={15} aria-hidden /> 다시 시도
      </button>
    </div>
  );
}

function lazyChart<P extends object>(load: () => Promise<ComponentType<P>>, Holder: ComponentType) {
  let cached: ComponentType<P> | null = null; // 한 번 받은 차트는 다른 화면에서도 바로 그린다
  return function LazyChart(props: P) {
    // 이미 받은 차트는 자리 표시 없이 바로 그린다 (차트는 자료를 불러온 뒤 브라우저에서만 그려져 서버 화면과 어긋날 일이 없다)
    const [Chart, setChart] = useState<ComponentType<P> | null>(() => cached);
    const [failed, setFailed] = useState(false);
    const [round, setRound] = useState(0);
    useEffect(() => {
      if (cached) { if (!Chart) setChart(() => cached); return; }
      let alive = true;
      (async () => {
        for (let i = 0; ; i++) {
          try {
            const c = await load();
            cached = c;
            if (alive) { setChart(() => c); setFailed(false); }
            return;
          } catch (e) {
            if (i >= RETRY_WAIT.length) {
              console.warn("[AX] chart load failed", e);
              if (alive) setFailed(true);
              return;
            }
            await wait(RETRY_WAIT[i]);
            if (!alive) return;
          }
        }
      })();
      return () => { alive = false; };
    }, [round]);
    if (Chart) return <Chart {...props} />;
    if (failed) return <ChartFailed onRetry={() => { setFailed(false); setRound((r) => r + 1); }} />;
    return <Holder />;
  };
}

const WeeklyTrendL = lazyChart<ComponentProps<typeof WeeklyTrendT>>(() => import("./TrendChart").then((m) => m.WeeklyTrend), Hold);
const DailyEventsL = lazyChart<ComponentProps<typeof DailyEventsT>>(() => import("./TrendChart").then((m) => m.DailyEvents), Hold);
const DonutPieL = lazyChart<ComponentProps<typeof DonutPieT>>(() => import("./DonutPie").then((m) => m.DonutPie), HoldRing);
const MonthlyChartL = lazyChart<ComponentProps<typeof MonthlyChartT>>(() => import("./MonthlyChart").then((m) => m.MonthlyChart), Hold);

export function WeeklyTrend(p: ComponentProps<typeof WeeklyTrendT>) {
  return <div style={{ height: p.height ?? 200 }}><WeeklyTrendL {...p} /></div>;
}
export function DailyEvents(p: ComponentProps<typeof DailyEventsT>) {
  return <div style={{ height: p.height ?? 240 }}><DailyEventsL {...p} /></div>;
}
/** 부모가 크기(220×220 등)를 정한다 */
export function DonutPie(p: ComponentProps<typeof DonutPieT>) {
  return <DonutPieL {...p} />;
}
/** 부모가 높이를 정한다 */
export function MonthlyChart(p: ComponentProps<typeof MonthlyChartT>) {
  return <MonthlyChartL {...p} />;
}
