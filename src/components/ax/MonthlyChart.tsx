"use client";

/* 월별 실적 12개월 차트 (recharts) — 월별 실적 화면이 LazyCharts로 늦게 불러온다 (PASS 38, D-139) */
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartMotion } from "./chart-motion";

export interface MonthlyChartRow { month: string; 매출: number; 매출총이익: number; 목표: number | null }

export function MonthlyChart({ data, showTarget }: { data: MonthlyChartRow[]; showTarget: boolean }) {
  const motion = useChartMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={44} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: "0.85rem" }} formatter={(v, n) => [`${Number(v).toLocaleString()}백만 원`, n]} />
        <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
        <Bar dataKey="매출" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={motion} />
        <Line dataKey="매출총이익" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 4, fill: "var(--chart-3)", stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={motion} />
        {showTarget && <Line dataKey="목표" stroke="var(--text-primary)" strokeDasharray="5 4" strokeWidth={1.5} dot={{ r: 3, stroke: "var(--surface)", strokeWidth: 2 }} connectNulls={false} isAnimationActive={motion} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
