"use client";

/* 차트는 늦게 불러오기 (PASS 38, D-139) — recharts(압축 전 약 450KB)를 화면 첫 묶음에서 빼고, 차트를 그릴 때 따로 받는다.
   자리는 미리 같은 높이로 잡아 두어 차트가 들어와도 화면이 밀리지 않는다. 차트 파일(TrendChart·DonutPie·MonthlyChart)을 직접 불러오지 말 것. */
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { DailyEvents as DailyEventsT, WeeklyTrend as WeeklyTrendT } from "./TrendChart";
import type { DonutPie as DonutPieT } from "./DonutPie";
import type { MonthlyChart as MonthlyChartT } from "./MonthlyChart";

const Hold = () => <div aria-hidden className="h-full w-full rounded-xl" style={{ background: "color-mix(in srgb, var(--border) 30%, transparent)" }} data-chart-loading />;

const WeeklyTrendL = dynamic(() => import("./TrendChart").then((m) => m.WeeklyTrend), { ssr: false, loading: Hold });
const DailyEventsL = dynamic(() => import("./TrendChart").then((m) => m.DailyEvents), { ssr: false, loading: Hold });
const DonutPieL = dynamic(() => import("./DonutPie").then((m) => m.DonutPie), { ssr: false, loading: () => <div aria-hidden className="h-full w-full rounded-full" style={{ border: "32px solid color-mix(in srgb, var(--border) 30%, transparent)" }} data-chart-loading /> });
const MonthlyChartL = dynamic(() => import("./MonthlyChart").then((m) => m.MonthlyChart), { ssr: false, loading: Hold });

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
