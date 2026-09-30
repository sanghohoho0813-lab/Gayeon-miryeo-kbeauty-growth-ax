import type { SalesRecord } from "../types";
import { daysAgoISO } from "../date";
import { demoProducts } from "./products";
import { demoChannels } from "./channels";

/**
 * DEMO DATA — 최근 8주 주간 판매 패턴 (index 0 = 8주 전, 7 = 최근 1주).
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

export function demoSales(): SalesRecord[] {
  const records: SalesRecord[] = [];
  for (const [productId, channelId, weekly] of patterns) {
    const product = demoProducts.find((p) => p.id === productId)!;
    const channel = demoChannels.find((c) => c.id === channelId)!;
    weekly.forEach((units, i) => {
      if (units <= 0) return;
      // 주간 집계 1행: 해당 주의 마지막 날짜로 기록 (최근 주 = 오늘)
      const saleDate = daysAgoISO((7 - i) * 7);
      records.push({
        id: `seed-${productId}-${channelId}-${i}`,
        productId,
        channelId,
        saleDate,
        units,
        revenue: Math.round(units * product.price * (1 - channel.avgDiscountRate)),
        source: "seed",
      });
    });
  }
  return records;
}
