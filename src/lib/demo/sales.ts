import type { SalesRecord } from "../types";
import { daysAgoISO } from "../date";
import { demoProducts } from "./products";
import { demoChannels } from "./channels";

/**
 * DEMO DATA — 최근 8주 주간 판매 패턴 (index 0 = 8주 전, 7 = 최근 1주) + 앞선 44주 결정적 이력.
 * DB 구조와 동일하게 "판매 행(sale_date, units, revenue)"으로 변환해 저장한다.
 */
const patterns: [string, string, number[]][] = [
  ["p-ess-01", "ch-direct", [120, 128, 135, 142, 150, 158, 170, 182]],
  ["p-ess-01", "ch-online", [210, 215, 224, 238, 250, 262, 280, 296]],
  ["p-ess-01", "ch-hnb", [90, 92, 95, 99, 104, 108, 112, 118]],
  ["p-amp-50", "ch-direct", [80, 84, 90, 98, 120, 150, 185, 215]],
  ["p-amp-50", "ch-online", [110, 115, 122, 132, 155, 190, 230, 268]],
  ["p-amp-50", "ch-live", [40, 42, 45, 60, 95, 140, 180, 210]],
  ["p-crm-01", "ch-online", [150, 148, 152, 155, 151, 154, 156, 158]],
  ["p-crm-01", "ch-hnb", [95, 96, 94, 97, 98, 96, 99, 100]],
  ["p-crm-01", "ch-b2b", [60, 0, 0, 80, 0, 0, 70, 0]],
  ["p-cln-01", "ch-online", [130, 132, 128, 134, 136, 133, 138, 140]],
  ["p-cln-01", "ch-hnb", [70, 72, 71, 74, 73, 75, 76, 78]],
  ["p-ton-01", "ch-direct", [85, 88, 92, 95, 99, 104, 110, 116]],
  ["p-ton-01", "ch-online", [120, 124, 128, 133, 139, 145, 152, 160]],
  ["p-sun-01", "ch-online", [180, 172, 160, 148, 132, 118, 102, 90]],
  ["p-sun-01", "ch-hnb", [90, 86, 80, 73, 66, 58, 52, 46]],
  ["p-msk-01", "ch-online", [200, 205, 198, 210, 208, 214, 216, 220]],
  ["p-msk-01", "ch-live", [50, 48, 55, 52, 58, 56, 60, 62]],
  ["p-msk-01", "ch-export", [300, 0, 0, 350, 0, 0, 400, 0]],
  ["p-amp-30", "ch-direct", [45, 52, 60, 68, 76, 85, 94, 104]],
  ["p-amp-30", "ch-online", [60, 68, 78, 88, 98, 110, 122, 135]],
  ["p-crm-02", "ch-direct", [0, 0, 20, 35, 48, 60, 74, 90]],
  ["p-crm-02", "ch-b2b", [0, 0, 0, 50, 0, 60, 0, 70]],
  ["p-mst-01", "ch-online", [55, 52, 50, 48, 46, 45, 43, 42]],
];

/** 월별 현황 시연용: 최근 8주 앞에 44주를 덧붙여 약 12개월 (결정적 패턴, Demo) */
const HISTORY_WEEKS = 44;
function extend(weekly: number[]): number[] {
  const firstNonZero = weekly.find((u) => u > 0) ?? 0;
  const periodic = weekly.filter((u) => u === 0).length >= 3; // B2B·수출처럼 격주/3주 간격 납품
  if (weekly[0] === 0 && !periodic) return [...Array(HISTORY_WEEKS).fill(0), ...weekly]; // 신규 제품
  const past = Array.from({ length: HISTORY_WEEKS }, (_, w) => {
    if (periodic) return w % 3 === 0 ? Math.round(firstNonZero * (0.7 + (0.3 * w) / HISTORY_WEEKS)) : 0;
    const trend = 0.72 + (0.28 * w) / HISTORY_WEEKS;
    const season = 1 + 0.08 * Math.sin((w / 52) * 2 * Math.PI * 2);
    return Math.max(0, Math.round(firstNonZero * trend * season));
  });
  return [...past, ...weekly];
}

/** 주간 패턴을 판매 행으로 변환.
 *  일반 채널: 해당 주 7일에 나눠 일별 행 (월별 집계가 "그 달에 든 주 수"에 따라 출렁이지 않도록)
 *  B2B·수출처럼 간헐 납품: 납품일 1행 */
export function demoSales(): SalesRecord[] {
  const records: SalesRecord[] = [];
  for (const [productId, channelId, recent] of patterns) {
    const product = demoProducts.find((p) => p.id === productId)!;
    const channel = demoChannels.find((c) => c.id === channelId)!;
    const periodic = recent.filter((u) => u === 0).length >= 3;
    const weekly = extend(recent);
    const last = weekly.length - 1;
    const rev = (u: number) => Math.round(u * product.price * (1 - channel.avgDiscountRate));
    weekly.forEach((units, i) => {
      if (units <= 0) return;
      const weekEndAgo = (last - i) * 7; // 이 주의 마지막 날 (최근 주 = 오늘)
      if (periodic) {
        records.push({ id: `seed-${productId}-${channelId}-${i}`, productId, channelId, saleDate: daysAgoISO(weekEndAgo), units, revenue: rev(units), source: "seed" });
        return;
      }
      const base = Math.floor(units / 7);
      const extra = units % 7;
      for (let d = 0; d < 7; d++) {
        const u = base + (d < extra ? 1 : 0);
        if (u <= 0) continue;
        records.push({ id: `seed-${productId}-${channelId}-${i}-${d}`, productId, channelId, saleDate: daysAgoISO(weekEndAgo + d), units: u, revenue: rev(u), source: "seed" });
      }
    });
  }
  return records;
}
