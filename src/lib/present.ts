import type { AxModel } from "./model";
import type { ActionStatus, Role } from "./types";
import { can } from "./permissions";
import { addDaysISO } from "./date";

/* 대표 보고 모드 (PASS 14, R-01) — 저장된 데이터에서 매번 계산하는 보고 슬라이드.
   숫자는 화면과 같은 계산(RULE·STATISTICAL)만 쓰고, 새 해석·목표를 만들지 않는다. 권한 밖 슬라이드(매출·이익)는 빼고 만든다. */

export type SlideId = "cover" | "summary" | "numbers" | "month" | "products" | "channels" | "customers" | "execution" | "next";
export interface SlideDef { id: SlideId; title: string; financial?: boolean }

export const SLIDES: SlideDef[] = [
  { id: "cover", title: "표지" },
  { id: "summary", title: "한눈에 요약" },
  { id: "numbers", title: "핵심 숫자 (4주)", financial: true },
  { id: "month", title: "이번 달 실적", financial: true },
  { id: "products", title: "제품·재고" },
  { id: "channels", title: "채널", financial: true },
  { id: "customers", title: "고객 반응" },
  { id: "execution", title: "실행·실증" },
  { id: "next", title: "결정이 필요한 것" },
];

export function slidesFor(role: Role): SlideDef[] {
  const fin = can(role, "view_financials");
  return SLIDES.filter((s) => fin || !s.financial);
}

/** 판매 기준일(마지막 판매일)에서 거꾸로 7일씩 n주 — 주간 매출·수량 */
export function weeklySales(m: AxModel, n = 8): { from: string; to: string; revenue: number; units: number }[] {
  const out = Array.from({ length: n }, (_, i) => {
    const to = addDaysISO(m.salesAsOf, -7 * (n - 1 - i));
    return { from: addDaysISO(to, -6), to, revenue: 0, units: 0 };
  });
  const first = out[0].from, last = out[n - 1].to;
  for (const s of m.snapshot.sales) {
    if (s.saleDate < first || s.saleDate > last) continue;
    const w = out.find((x) => s.saleDate >= x.from && s.saleDate <= x.to);
    if (w) { w.revenue += s.revenue; w.units += s.units; }
  }
  return out;
}

/** 4주 판매 증감 상위·하위 (이전 4주 판매가 있는 상품만 — 신규는 성장률이 과장됨) */
export function productMovers(m: AxModel, k = 3) {
  const rows = m.snapshot.products
    .map((p) => ({ p, mm: m.metrics.get(p.id)! }))
    .filter((x) => x.mm && x.mm.prev4wUnits > 0);
  const up = [...rows].filter((x) => x.mm.growthRate > 0).sort((a, b) => b.mm.growthRate - a.mm.growthRate).slice(0, k);
  const down = [...rows].filter((x) => x.mm.growthRate < 0).sort((a, b) => a.mm.growthRate - b.mm.growthRate).slice(0, k);
  return { up, down };
}

/** 재고·생산 주의 — 품절위험·부족주의, 생산 착수 마감 14일 이내 (진행 중 생산 없음) */
export function stockWatch(m: AxModel, k = 4) {
  const inProd = new Set(m.snapshot.production.filter((x) => x.status === "생산중" || x.status === "입고예정").map((x) => x.productId));
  return m.snapshot.products
    .map((p) => ({ p, mm: m.metrics.get(p.id)! }))
    .filter(({ p, mm }) => mm && (mm.stockStatus === "품절위험" || mm.stockStatus === "부족주의" || (mm.daysToDeadline != null && mm.daysToDeadline <= 14 && !inProd.has(p.id) && mm.recommendedOrder > 0)))
    .sort((a, b) => (a.mm.daysToDeadline ?? a.mm.daysOfStock) - (b.mm.daysToDeadline ?? b.mm.daysOfStock))
    .slice(0, k);
}

export const STATUS_ORDER: ActionStatus[] = ["NEW", "REVIEWED", "IN_PROGRESS", "DONE", "DISMISSED"];
export function actionCounts(m: AxModel): Record<ActionStatus, number> {
  const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ActionStatus, number>;
  for (const a of m.actions) c[a.status] += 1;
  return c;
}
