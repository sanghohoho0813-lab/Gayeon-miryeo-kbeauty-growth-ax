import type { Inventory, ProductionPlan } from "../types";

/** DEMO DATA — 재고 현황 */
export const demoInventory: Inventory[] = [
  { productId: "p-ess-01", currentStock: 3240, safetyStock: 1200, incomingStock: 2000, incomingDate: "2025-06-05" },
  // 인텐시브 앰플 — 판매 급증으로 품절 위험 시나리오
  { productId: "p-amp-50", currentStock: 890, safetyStock: 900, incomingStock: 0 },
  { productId: "p-crm-01", currentStock: 2650, safetyStock: 900, incomingStock: 0 },
  { productId: "p-cln-01", currentStock: 1980, safetyStock: 700, incomingStock: 0 },
  { productId: "p-ton-01", currentStock: 1450, safetyStock: 800, incomingStock: 1500, incomingDate: "2025-06-12" },
  // 선크림 — 판매 하락 + 재고 과잉 시나리오
  { productId: "p-sun-01", currentStock: 5850, safetyStock: 800, incomingStock: 0 },
  { productId: "p-msk-01", currentStock: 4100, safetyStock: 1500, incomingStock: 0 },
  { productId: "p-amp-30", currentStock: 980, safetyStock: 500, incomingStock: 1000, incomingDate: "2025-06-08" },
  { productId: "p-crm-02", currentStock: 720, safetyStock: 400, incomingStock: 0 },
  // 미스트 — 과잉재고 시나리오
  { productId: "p-mst-01", currentStock: 2400, safetyStock: 300, incomingStock: 0 },
];

/** DEMO DATA — OEM 생산 현황 */
export const demoProduction: ProductionPlan[] = [
  {
    id: "pr-01",
    productId: "p-amp-50",
    partner: "OEM 파트너 A (Demo)",
    lastProducedAt: "2025-04-18",
    quantity: 3000,
    expectedArrival: "2025-06-02",
    status: "생산중",
    nextRecommendedAt: "2025-06-20",
  },
  {
    id: "pr-02",
    productId: "p-ess-01",
    partner: "OEM 파트너 A (Demo)",
    lastProducedAt: "2025-05-02",
    quantity: 2000,
    expectedArrival: "2025-06-05",
    status: "입고예정",
    nextRecommendedAt: "2025-07-10",
  },
  {
    id: "pr-03",
    productId: "p-ton-01",
    partner: "OEM 파트너 B (Demo)",
    lastProducedAt: "2025-05-10",
    quantity: 1500,
    expectedArrival: "2025-06-12",
    status: "입고예정",
  },
  {
    id: "pr-04",
    productId: "p-amp-30",
    partner: "OEM 파트너 A (Demo)",
    lastProducedAt: "2025-05-15",
    quantity: 1000,
    expectedArrival: "2025-06-08",
    status: "생산중",
  },
  {
    id: "pr-05",
    productId: "p-crm-01",
    partner: "OEM 파트너 C (Demo)",
    lastProducedAt: "2025-03-28",
    quantity: 2500,
    status: "완료",
    nextRecommendedAt: "2025-07-01",
  },
  {
    id: "pr-06",
    productId: "p-crm-02",
    partner: "OEM 파트너 C (Demo)",
    lastProducedAt: "2025-04-25",
    quantity: 1200,
    status: "완료",
    nextRecommendedAt: "2025-06-25",
  },
];
