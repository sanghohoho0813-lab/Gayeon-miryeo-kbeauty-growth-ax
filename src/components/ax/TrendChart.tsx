"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: "0.85rem",
  color: "var(--text-primary)",
};

/** 주간 판매 추세 라인 차트 */
export function WeeklyTrend({ weekly, height = 200 }: { weekly: number[]; height?: number }) {
  const data = weekly.map((v, i) => ({ week: `${8 - i}주 전`.replace("0주 전", "이번 주"), units: v }));
  data[data.length - 1].week = "이번 주";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()}개`, "판매수량"]} />
          <Line type="monotone" dataKey="units" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-1)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 채널 비교 가로 Bar */
export function ChannelBars({
  data,
  height = 240,
  unit = "억",
}: {
  data: { name: string; value: number }[];
  height?: number;
  unit?: string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={118}
            tick={{ fontSize: "0.82rem", fill: "var(--text-primary)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}${unit}`, "매출"]} />
          <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 8, 8, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 고객 이벤트 일별 추이 (14일) */
export function DailyEvents({ data, height = 240 }: { data: { date: string; finder: number; passport: number; wishlist: number; outbound: number }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5).replace("-", ".") }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: "0.72rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: "0.72rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="finder" name="Finder 완료" stackId="a" fill="var(--chart-1)" />
          <Bar dataKey="passport" name="Passport 저장" stackId="a" fill="var(--chart-3)" />
          <Bar dataKey="wishlist" name="찜" stackId="a" fill="var(--chart-5)" />
          <Bar dataKey="outbound" name="구매채널 이동" stackId="a" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
