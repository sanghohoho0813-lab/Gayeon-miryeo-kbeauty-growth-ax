"use client";

import { useEffect, useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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

/** 주간 판매 추세 (PASS 31, D-102) — 면 채움 + 이번 주 점·값 강조. 가로축은 처음(8주 전)·끝(이번 주)만 적어
 *  좁은 화면에서 라벨이 빠지거나 겹치지 않게 하고, 주별 값은 점을 누르면(호버) 보인다 */
export function WeeklyTrend({ weekly, height = 200 }: { weekly: number[]; height?: number }) {
  const motion = useChartMotion();
  const data = weekly.map((v, i) => ({ week: i === weekly.length - 1 ? "이번 주" : `${weekly.length - 1 - i}주 전`, units: v }));
  const last = data.length - 1;
  const gid = `wt${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="relative" style={{ height }} data-testid="weekly-trend">
      {/* 화면 읽기용 주별 값 (차트 자체는 마우스·터치용) */}
      <p className="sr-only">주간 판매 추세: {data.map((d) => `${d.week} ${d.units.toLocaleString()}개`).join(", ")}</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 18, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="week" ticks={[data[0].week, data[last].week]} tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} interval={0} padding={{ left: 6, right: 6 }} />
          <YAxis tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()}개`, "판매수량"]} />
          <Area type="monotone" dataKey="units" stroke="var(--chart-1)" strokeWidth={2} fill={`url(#${gid})`} strokeLinecap="round" strokeLinejoin="round"
            dot={(p: { cx?: number; cy?: number; index?: number }) => <circle key={p.index} cx={p.cx} cy={p.cy} r={p.index === last ? 5 : 2.5} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={p.index === last ? 2 : 1} />}
            activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={motion}>
            <LabelList dataKey="units" content={(p: { x?: number | string; y?: number | string; index?: number; value?: number | string }) => p.index === last ? <text x={Number(p.x)} y={Number(p.y) - 10} textAnchor="end" fontSize="0.78rem" fontWeight={700} fill="var(--text-primary)">{Number(p.value).toLocaleString()}개</text> : null} />
          </Area>
        </AreaChart>
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
