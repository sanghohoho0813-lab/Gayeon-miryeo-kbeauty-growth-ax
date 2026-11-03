"use client";

/* 도넛 그림만 (recharts) — ChannelDonut이 LazyCharts로 늦게 불러온다 (PASS 38, D-139) */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatKRW } from "@/lib/analytics";
import { CHART_VARS, useChartMotion } from "./chart-motion";

export function DonutPie({ data }: { data: { name: string; value: number }[] }) {
  const motion = useChartMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={2} strokeWidth={0} rootTabIndex={-1} isAnimationActive={motion}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_VARS[i % CHART_VARS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatKRW(Number(value))}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: "0.85rem", color: "var(--text-primary)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
