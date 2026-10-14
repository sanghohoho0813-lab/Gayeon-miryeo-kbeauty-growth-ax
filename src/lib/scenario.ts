import { planProduction, sixWeekOrder, type PlanBasis, type ProductMetrics } from "./analytics";
import type { Product } from "./types";

/* 생산 판단 '조건 바꿔 보기' (PASS 21, D-076) — 저장하지 않는 계산.
   상품 지표(computeProductMetrics)와 같은 식(planProduction)으로 다시 계산해, 현재 조건이면 화면의 착수 마감·추천 생산량과 같다.
   바꿀 수 있는 조건: 판매속도(예측 일판매 ±%), 추가 입고 수량, OEM 생산기간. */

export interface Scenario {
  /** 예측 일판매 변화 (%, -50 ~ +100) */
  speedPct: number;
  /** 지금 입고 예정에 더할 수량 (개) */
  extraIncoming: number;
  /** OEM 생산기간 (일) — null 이면 미입력 */
  leadTimeDays: number | null;
}

export interface PlanView {
  forecastDaily: number;
  availableStock: number;
  /** 가용 재고가 버티는 일수 (소수) — 판매가 없으면 null */
  coverDays: number | null;
  leadTimeDays: number | null;
  safetyDays: number;
  daysToDeadline: number | null;
  orderDeadline: string | null;
  recommendedOrder: number;
  basis: "생산기간 반영" | "6주 예측";
  /** 재고 행이 없으면 계산 불가 */
  noInventory: boolean;
}

export const baseScenario = (product: Product): Scenario => ({ speedPct: 0, extraIncoming: 0, leadTimeDays: product.leadTimeDays ?? null });

export function isBase(sc: Scenario, product: Product) {
  return sc.speedPct === 0 && sc.extraIncoming === 0 && (sc.leadTimeDays ?? null) === (product.leadTimeDays ?? null);
}

export function planView(product: Product, mm: ProductMetrics, plan: PlanBasis, today: string, sc: Scenario = baseScenario(product)): PlanView {
  const noInventory = mm.stockStatus === "데이터 없음";
  const forecastDaily = mm.forecastDaily * (1 + sc.speedPct / 100);
  const availableStock = mm.availableStock + sc.extraIncoming;
  const lead = sc.leadTimeDays && sc.leadTimeDays > 0 ? Math.round(sc.leadTimeDays) : null;
  const pp = noInventory ? null : planProduction(forecastDaily, availableStock, lead, product.moq, plan, today);
  return {
    forecastDaily,
    availableStock,
    coverDays: forecastDaily > 0 ? availableStock / forecastDaily : null,
    leadTimeDays: lead,
    safetyDays: plan.safetyDays,
    daysToDeadline: pp?.daysToDeadline ?? null,
    orderDeadline: pp?.orderDeadline ?? null,
    recommendedOrder: noInventory ? 0 : pp ? pp.recommendedOrder : sixWeekOrder(forecastDaily, availableStock, plan),
    basis: pp ? "생산기간 반영" : "6주 예측",
    noInventory,
  };
}

export const deadlineLabel = (d: number | null) => (d == null ? "-" : d <= 0 ? "마감 지남" : `D-${d}`);

/** 현재 → 바꾼 조건 비교 문장 (사람이 판단할 근거, 자동 실행 없음) */
export function compareSentences(base: PlanView, next: PlanView, sc: Scenario, product: Product): string[] {
  const out: string[] = [];
  const cond: string[] = [];
  if (sc.speedPct) cond.push(`판매속도가 ${Math.abs(sc.speedPct)}% ${sc.speedPct > 0 ? "빨라지면" : "느려지면"}`);
  if (sc.extraIncoming) cond.push(`추가 입고 ${sc.extraIncoming.toLocaleString()}개를 반영하면`);
  if ((sc.leadTimeDays ?? null) !== (product.leadTimeDays ?? null)) cond.push(sc.leadTimeDays ? `생산기간이 ${sc.leadTimeDays}일이면` : "생산기간을 빼면");
  const head = cond.join(", ");
  if (base.daysToDeadline != null && next.daysToDeadline != null) {
    const diff = next.daysToDeadline - base.daysToDeadline;
    if (diff === 0) out.push(`${head} 착수 마감은 ${deadlineLabel(next.daysToDeadline)}로 같습니다.`);
    else out.push(`${head} 착수 마감이 ${deadlineLabel(base.daysToDeadline)} → ${deadlineLabel(next.daysToDeadline)}로 ${Math.abs(diff)}일 ${diff < 0 ? "앞당겨집니다" : "늦춰집니다"}.`);
  } else if (next.daysToDeadline != null) {
    out.push(`${head} 착수 마감은 ${deadlineLabel(next.daysToDeadline)}입니다.`);
  } else if (head) {
    out.push(`${head} — 생산기간이 없어 착수 마감은 계산하지 않고 6주 예측으로만 추천합니다.`);
  }
  if (next.recommendedOrder !== base.recommendedOrder) {
    const n = (v: number) => (v > 0 ? `${v.toLocaleString()}개` : "불필요");
    out.push(`추천 생산량 ${n(base.recommendedOrder)} → ${n(next.recommendedOrder)}.`);
  }
  if (next.daysToDeadline != null && next.daysToDeadline <= 0) out.push("이 조건이라면 지금 생산 검토가 필요합니다.");
  else if (next.daysToDeadline != null && next.daysToDeadline <= 14) out.push("2주 안에 생산 여부를 정해야 합니다.");
  return out;
}
