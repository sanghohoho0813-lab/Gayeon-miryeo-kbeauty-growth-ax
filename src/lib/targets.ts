import type { MonthlyTarget } from "./types";

/* 월 매출 목표 대비 실적 — 목표는 대표가 입력한 값만 쓴다 (없으면 달성률을 만들지 않는다).
   진행 중인 달은 '경과 일수 비율'과 비교하고, 월말 예상은 지금 속도를 그대로 이어간 단순 추정으로 표시한다. */
export interface TargetProgress {
  month: string;
  target: number | null;
  actual: number;
  /** 실적 ÷ 목표 */
  rate: number | null;
  /** 진행 중인 달: 경과일 ÷ 월 일수, 지난 달: 1 */
  elapsed: number;
  /** 진행 중인 달: 실적 ÷ 경과일 × 월 일수 (추정) */
  projected: number | null;
  status: "목표 없음" | "달성" | "미달" | "진도 앞섬" | "진도 뒤처짐";
}

export const daysInMonth = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();

export function targetProgress(month: string, actual: number, targets: MonthlyTarget[], today: string): TargetProgress {
  const t = targets.find((x) => x.month === month)?.revenueTarget ?? null;
  const total = daysInMonth(month);
  const inProgress = today.slice(0, 7) === month && Number(today.slice(8, 10)) < total;
  const elapsed = inProgress ? Number(today.slice(8, 10)) / total : month > today.slice(0, 7) ? 0 : 1;
  const projected = inProgress && elapsed > 0 ? Math.round(actual / elapsed) : null;
  const rate = t ? actual / t : null;
  const status: TargetProgress["status"] = rate == null ? "목표 없음" : inProgress ? (rate >= elapsed ? "진도 앞섬" : "진도 뒤처짐") : rate >= 1 ? "달성" : "미달";
  return { month, target: t, actual, rate, elapsed, projected, status };
}

/** 입력 검증 — 원 단위 정수, 1원 이상 1조 원 미만 */
export function parseTarget(raw: string): number | null {
  const v = Number(raw.replace(/[,\s원₩]/g, ""));
  return Number.isInteger(v) && v > 0 && v < 1e12 ? v : null;
}
