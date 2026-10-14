import type { DataSnapshot } from "./data/source";
import type { GrowthAction } from "./types";
import { addDaysISO, daysBetween, todayISO } from "./date";

/* Action 사후 성과 자동 측정 (계약 별지 제1호 ④ AI 성장 실행센터 — 실행 → 결과)
   기존 'KPI After'는 완료 버튼을 누른 순간의 값이라 실행 효과를 담지 못한다 → 기록된 판매로 전후 14일을 비교한다.
   - 비교: 승인 전 14일 (실행 전) vs 완료 후 14일 (어제까지·판매 기록이 있는 날까지만, 14일이 안 차면 '측정 중')
   - 상품 Action: 그 상품의 일평균 판매량·매출 / 채널 Action: 그 채널의 일평균 매출
   - 정산·B2B·재구매처럼 판매 기록으로 잴 수 없는 Action은 측정하지 않고 확인 방법을 안내한다
   같은 기간의 다른 요인(시즌·행사·재고)이 함께 반영되므로 인과를 증명하지 않는다 — 화면에 항상 표시. */

export const OUTCOME_DAYS = 14;
export interface OutcomeMetric { label: string; unit: string; before: number; after: number; change: number | null }
export interface ActionOutcome {
  measurable: boolean;
  reason?: string;
  target?: string;
  before?: { from: string; to: string };
  after?: { from: string; to: string; days: number };
  complete: boolean;
  metrics: OutcomeMetric[];
}

const seoul = (iso: string) => todayISO(new Date(iso));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function doneAt(a: GrowthAction, s: DataSnapshot): string | null {
  const ev = s.actionEvents.filter((e) => e.growthActionId === a.id && e.toStatus === "DONE").sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
  return ev?.createdAt ?? (a.status === "DONE" ? a.updatedAt : null);
}

/** windowDays — 사후 성과 측정 기간 (운영 기준값, 기본 14일). 완료 전 같은 일수와 비교 */
export function measureOutcome(a: GrowthAction, s: DataSnapshot, today: string, windowDays: number = OUTCOME_DAYS): ActionOutcome {
  if (a.status !== "DONE") return { measurable: false, reason: "완료된 Action만 측정합니다.", complete: false, metrics: [] };
  const done = doneAt(a, s);
  if (!done) return { measurable: false, reason: "완료 시각 기록이 없습니다.", complete: false, metrics: [] };
  const key = a.ruleKey.split(":")[0];
  let filter: ((x: DataSnapshot["sales"][number]) => boolean) | null = null;
  let target = "";
  if (a.linkedProductId && ["stock", "prod", "over", "slow", "interest", "lead"].includes(key)) {
    const pid = a.linkedProductId;
    filter = (x) => x.productId === pid;
    target = `상품 ${s.products.find((p) => p.id === pid)?.name ?? ""}`;
  } else if (key === "ch") {
    const cid = a.ruleKey.slice(3);
    filter = (x) => x.channelId === cid;
    target = `채널 ${s.channels.find((c) => c.id === cid)?.name ?? ""}`;
  }
  if (!filter) {
    const how = key === "settlement-overdue" ? "정산 화면의 입금 기록" : key === "b2b" ? "B2B 거래처 납품 기록" : key.startsWith("repurchase") ? "회원 구매 기록" : "결과 메모·증빙";
    return { measurable: false, reason: `판매 기록으로 자동 측정하지 않는 유형입니다 — ${how}으로 확인하세요.`, complete: false, metrics: [] };
  }
  const start = seoul(a.approvedAt ?? a.createdAt);
  const end = seoul(done);
  const before = { from: addDaysISO(start, -windowDays), to: addDaysISO(start, -1) };
  const afterTo = addDaysISO(end, windowDays - 1);
  // 오늘 판매는 아직 입력 중일 수 있고, 판매를 며칠씩 몰아 올리는 경우도 많다 → 어제까지 + 판매 기록이 있는 마지막 날까지만 센다 (빈 날을 0으로 세면 '감소'로 보임)
  const latestSale = s.sales.reduce((mx, x) => (x.saleDate > mx ? x.saleDate : mx), "");
  const lastDay = [afterTo, addDaysISO(today, -1), latestSale].filter(Boolean).sort()[0];
  const days = lastDay < end ? 0 : daysBetween(end, lastDay) + 1;
  if (days === 0) return { measurable: true, target, before, after: { from: end, to: end, days: 0 }, complete: false, metrics: [] };
  const sum = (from: string, to: string) => s.sales.filter((x) => filter!(x) && x.saleDate >= from && x.saleDate <= to).reduce((acc, x) => ({ units: acc.units + x.units, revenue: acc.revenue + x.revenue }), { units: 0, revenue: 0 });
  const b = sum(before.from, before.to), af = sum(end, lastDay);
  const metric = (label: string, unit: string, bv: number, av: number): OutcomeMetric => ({ label, unit, before: round1(bv), after: round1(av), change: bv > 0 ? (av - bv) / bv : null });
  const metrics = [
    ...(key === "ch" ? [] : [metric("일평균 판매량", "개", b.units / windowDays, af.units / days)]),
    metric("일평균 매출", "원", b.revenue / windowDays, af.revenue / days),
  ];
  return { measurable: true, target, before, after: { from: end, to: lastDay, days }, complete: days >= windowDays, metrics };
}
