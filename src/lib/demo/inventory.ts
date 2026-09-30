import type { Inventory, ProductionPlan } from "../types";
import { daysAgoISO } from "../date";

/** DEMO DATA — 재고/생산. 날짜는 오늘 기준 상대값. */
export function demoInventory(): Inventory[] {
  return [
    { productId: "p-ess-01", currentStock: 3240, safetyStock: 1200, incomingStock: 2000, incomingDate: daysAgoISO(-6) },
    { productId: "p-amp-50", currentStock: 890, safetyStock: 900, incomingStock: 0 }, // 판매 급증 → 품절 위험 시나리오
    { productId: "p-crm-01", currentStock: 2650, safetyStock: 900, incomingStock: 0 },
    { productId: "p-cln-01", currentStock: 1980, safetyStock: 700, incomingStock: 0 },
    { productId: "p-ton-01", currentStock: 1450, safetyStock: 800, incomingStock: 1500, incomingDate: daysAgoISO(-13) },
    { productId: "p-sun-01", currentStock: 5850, safetyStock: 800, incomingStock: 0 }, // 판매 하락 + 과잉
    { productId: "p-msk-01", currentStock: 4100, safetyStock: 1500, incomingStock: 0 },
    { productId: "p-amp-30", currentStock: 980, safetyStock: 500, incomingStock: 1000, incomingDate: daysAgoISO(-9) },
    { productId: "p-crm-02", currentStock: 720, safetyStock: 400, incomingStock: 0 },
    { productId: "p-mst-01", currentStock: 2400, safetyStock: 300, incomingStock: 0 }, // 과잉
  ];
}

export function demoProduction(): ProductionPlan[] {
  return [
    { id: "pr-01", productId: "p-amp-50", partner: "OEM 파트너 A (Demo)", lastProducedAt: daysAgoISO(45), quantity: 3000, status: "완료" },
    { id: "pr-02", productId: "p-ess-01", partner: "OEM 파트너 A (Demo)", lastProducedAt: daysAgoISO(30), quantity: 2000, expectedArrival: daysAgoISO(-6), status: "입고예정" },
    { id: "pr-03", productId: "p-ton-01", partner: "OEM 파트너 B (Demo)", lastProducedAt: daysAgoISO(22), quantity: 1500, expectedArrival: daysAgoISO(-13), status: "입고예정" },
    { id: "pr-04", productId: "p-amp-30", partner: "OEM 파트너 A (Demo)", lastProducedAt: daysAgoISO(17), quantity: 1000, expectedArrival: daysAgoISO(-9), status: "생산중" },
    { id: "pr-05", productId: "p-crm-01", partner: "OEM 파트너 C (Demo)", lastProducedAt: daysAgoISO(65), quantity: 2500, status: "완료", nextRecommendedAt: daysAgoISO(-30) },
  ];
}
