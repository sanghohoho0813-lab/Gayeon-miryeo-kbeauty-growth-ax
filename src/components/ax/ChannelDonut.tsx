"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatKRW } from "@/lib/analytics";

const CHART_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent)"];

export interface DonutDatum {
  name: string;
  value: number;
}

export function ChannelDonut({ data, centerLabel }: { data: DonutDatum[]; centerLabel: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_VARS[i % CHART_VARS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatKRW(Number(value))}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: "0.85rem",
                color: "var(--text-primary)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[1.35rem] font-bold leading-none">{formatKRW(total)}</div>
          <div className="mt-1 text-[0.8rem] text-ink-soft">{centerLabel}</div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2.5 text-[0.92rem]">
            <span
              className="h-3 w-3 shrink-0 rounded-[4px]"
              style={{ background: CHART_VARS[i % CHART_VARS.length] }}
              aria-hidden
            />
            <span className="flex-1 truncate font-medium">{d.name}</span>
            <span className="whitespace-nowrap font-semibold">{formatKRW(d.value)}</span>
            <span className="w-12 shrink-0 whitespace-nowrap text-right text-ink-soft">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
