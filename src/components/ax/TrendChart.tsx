"use client";

import { useEffect, useState } from "react";
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

/** 움직임 줄이기(OS 설정·화면 설정)면 차트 애니메이션 끔 — 애니메이션 중 크기가 바뀌면(인쇄·창 크기) 선이 옛 좌표에 멈추는 문제도 피한다 */
export function useChartMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    setOn(!reduce);
  }, []);
  return on;
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: "0.85rem",
  color: "var(--text-primary)",
};

/** 주간 판매 추세 라인 차트 */
export function WeeklyTrend({ weekly, height = 200 }: { weekly: number[]; height?: number }) {
  const motion = useChartMotion();
  const data = weekly.map((v, i) => ({ week: `${8 - i}주 전`.replace("0주 전", "이번 주"), units: v }));
  data[data.length - 1].week = "이번 주";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()}개`, "판매수량"]} />
          <Line type="monotone" dataKey="units" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={motion} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 고객 이벤트 일별 추이 (14일) */
export function DailyEvents({ data, height = 240 }: { data: { date: string; finder: number; passport: number; wishlist: number; outbound: number }[]; height?: number }) {
  const motion = useChartMotion();
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5).replace("-", ".") }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: "0.72rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: "0.72rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="finder" name="Finder 완료" stackId="a" fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={1} isAnimationActive={motion} />
          <Bar dataKey="passport" name="Passport 저장" stackId="a" fill="var(--chart-3)" stroke="var(--surface)" strokeWidth={1} isAnimationActive={motion} />
          <Bar dataKey="wishlist" name="찜" stackId="a" fill="var(--chart-5)" stroke="var(--surface)" strokeWidth={1} isAnimationActive={motion} />
          <Bar dataKey="outbound" name="구매채널 이동" stackId="a" fill="var(--chart-4)" stroke="var(--surface)" strokeWidth={1} radius={[4, 4, 0, 0]} isAnimationActive={motion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
