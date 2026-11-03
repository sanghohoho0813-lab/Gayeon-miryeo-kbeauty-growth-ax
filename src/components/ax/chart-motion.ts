"use client";

import { useEffect, useState } from "react";

/* 차트 공통 — recharts 없이 쓸 수 있는 것만 (PASS 38, D-139) */
export const CHART_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent)"];

/** 움직임 줄이기(OS 설정·화면 설정)면 차트 애니메이션 끔 — 애니메이션 중 크기가 바뀌면(인쇄·창 크기) 선이 옛 좌표에 멈추는 문제도 피한다 */
export function useChartMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    setOn(!reduce);
  }, []);
  return on;
}
