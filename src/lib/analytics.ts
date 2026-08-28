import type {
  Channel,
  GrowthAction,
  Inventory,
  Product,
  SalesRecord,
} from "./types";

/* ==========================================================================
   MIRYEO Growth AX — 규칙 기반 분석 엔진
   계산 가능한 지표(성장률·재고일수·마진율·위험점수)는 모두 코드로 계산한다.
   LLM 연결 전에도 Demo Mode에서 동일하게 동작한다.
   ========================================================================== */

export type StockStatus = "안정" | "부족주의" | "품절위험" | "과잉";

export interface ProductMetrics {
  productId: string;
  /** 최근 4주 판매수량 */
  recent4wUnits: number;
  /** 이전 4주 판매수량 */
  prev4wUnits: number;
  /** 최근 4주 vs 이전 4주 성장률 (-1 ~ n) */
  growthRate: number;
  /** 일 평균 판매속도 (최근 4주 기준) */
  dailyVelocity: number;
  /** 예상 재고 소진일수 */
  daysOfStock: number;
  /** 마진율 (0~1) */
  marginRate: number;
  /** 최근 4주 매출 (원) */
  recent4wRevenue: number;
  stockStatus: StockStatus;
  /** 추천 발주/생산량 (다음 6주 판매 예상 - 현재고 - 입고예정) */
  recommendedOrder: number;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function computeProductMetrics(
  product: Product,
  inventory: Inventory | undefined,
  sales: SalesRecord[]
): ProductMetrics {
  const records = sales.filter((s) => s.productId === product.id);
  const weekly = Array.from({ length: 8 }, (_, i) =>
    sum(records.map((r) => r.weeklyUnits[i] ?? 0))
  );
  const recent4wUnits = sum(weekly.slice(4));
  const prev4wUnits = sum(weekly.slice(0, 4));
  const growthRate = prev4wUnits > 0 ? (recent4wUnits - prev4wUnits) / prev4wUnits : recent4wUnits > 0 ? 1 : 0;
  const dailyVelocity = recent4wUnits / 28;
  const currentStock = inventory?.currentStock ?? 0;
  const daysOfStock = dailyVelocity > 0 ? currentStock / dailyVelocity : Infinity;
  const marginRate = product.price > 0 ? (product.price - product.cost) / product.price : 0;
  const recent4wRevenue = recent4wUnits * product.price;

  let stockStatus: StockStatus = "안정";
  if (daysOfStock <= 10) stockStatus = "품절위험";
  else if (daysOfStock <= 21) stockStatus = "부족주의";
  else if (daysOfStock > 120 && currentStock > (inventory?.safetyStock ?? 0) * 3) stockStatus = "과잉";

  // 다음 6주 예상 판매(성장률 절반 반영) 대비 부족분
  const projected6w = dailyVelocity * 42 * (1 + Math.max(-0.3, Math.min(growthRate, 1)) * 0.5);
  const incoming = inventory?.incomingStock ?? 0;
  const recommendedOrder = Math.max(0, Math.round((projected6w - currentStock - incoming) / 50) * 50);

  return {
    productId: product.id,
    recent4wUnits,
    prev4wUnits,
    growthRate,
    dailyVelocity,
    daysOfStock,
    marginRate,
    recent4wRevenue,
    stockStatus,
    recommendedOrder,
  };
}

export function computeAllMetrics(
  products: Product[],
  inventory: Inventory[],
  sales: SalesRecord[]
): Map<string, ProductMetrics> {
  const map = new Map<string, ProductMetrics>();
  for (const p of products) {
    map.set(
      p.id,
      computeProductMetrics(p, inventory.find((i) => i.productId === p.id), sales)
    );
  }
  return map;
}

/* ---------- 재고 위험 Matrix 분류 ---------- */
export type MatrixZone = "성장·부족" | "안정" | "느린 판매" | "과잉재고";

export function matrixZone(m: ProductMetrics): MatrixZone {
  const fastSelling = m.growthRate > 0.1 || m.dailyVelocity >= 15;
  const lowStock = m.daysOfStock <= 21;
  if (fastSelling && lowStock) return "성장·부족";
  if (!fastSelling && m.stockStatus === "과잉") return "과잉재고";
  if (!fastSelling && m.growthRate < -0.05) return "느린 판매";
  return "안정";
}

/* ---------- 채널 지표 ---------- */
export interface ChannelMetrics {
  channelId: string;
  growthRate: number;
  avgOrderValue: number;
  /** 할인율 반영 추정 마진 지수 (0~1) */
  profitIndex: number;
}

export function computeChannelMetrics(ch: Channel): ChannelMetrics {
  const growthRate =
    ch.prevMonthRevenue > 0 ? (ch.monthRevenue - ch.prevMonthRevenue) / ch.prevMonthRevenue : 0;
  const avgOrderValue = ch.orders > 0 ? ch.monthRevenue / ch.orders : 0;
  // 기준 마진 68%에서 채널 평균 할인율을 차감한 단순 지수 (Demo 규칙)
  const profitIndex = Math.max(0, 0.68 - ch.avgDiscountRate);
  return { channelId: ch.id, growthRate, avgOrderValue, profitIndex };
}

/* ---------- AI Product Insight (규칙 기반 문장 생성) ---------- */
export function productInsight(p: Product, m: ProductMetrics): { summary: string; evidence: string[] } {
  const growthPct = Math.round(m.growthRate * 100);
  const days = Number.isFinite(m.daysOfStock) ? Math.round(m.daysOfStock) : null;

  let summary: string;
  if (m.stockStatus === "품절위험" && m.growthRate > 0.1) {
    summary = `최근 4주 판매속도가 이전 4주보다 ${growthPct}% 증가했습니다. 현재 재고는 약 ${days}일분으로 추정되어 품절 위험이 높습니다. 추가 생산 확보 검토를 권장합니다.`;
  } else if (m.stockStatus === "과잉") {
    summary = `판매속도 대비 재고가 약 ${days}일분으로 과잉 상태입니다. 할인 프로모션 또는 B2B·수출 채널 소진 전략 검토를 권장합니다.`;
  } else if (m.growthRate > 0.15) {
    summary = `최근 4주 판매량이 이전 대비 ${growthPct}% 증가하며 성장 흐름입니다. 현재 재고 운용은 안정적이나 성장 지속 시 생산 일정 앞당김을 검토하세요.`;
  } else if (m.growthRate < -0.1) {
    summary = `최근 4주 판매량이 이전 대비 ${Math.abs(growthPct)}% 감소했습니다. 채널 프로모션 조정 또는 재고 소진 전략 검토를 권장합니다.`;
  } else {
    summary = `판매와 재고가 안정 구간입니다. 현재 운영 기조를 유지하면서 주간 판매속도 변화를 관찰하세요.`;
  }

  const evidence = [
    `최근 4주 판매 ${m.recent4wUnits.toLocaleString()}개 (이전 4주 ${m.prev4wUnits.toLocaleString()}개, ${growthPct >= 0 ? "+" : ""}${growthPct}%)`,
    days !== null ? `현재 재고 소진 예상 약 ${days}일` : "판매 데이터 없음",
    `마진율 약 ${Math.round(m.marginRate * 100)}%`,
  ];
  return { summary, evidence };
}

/* ---------- AI Growth Actions (규칙 기반 생성) ---------- */
export function generateGrowthActions(
  products: Product[],
  metrics: Map<string, ProductMetrics>,
  channels: Channel[],
  extra: { b2bNextDelivery?: { name: string; date: string }; repurchaseCount: number }
): GrowthAction[] {
  const actions: GrowthAction[] = [];

  for (const p of products) {
    const m = metrics.get(p.id);
    if (!m) continue;
    const growthPct = Math.round(m.growthRate * 100);
    const days = Number.isFinite(m.daysOfStock) ? Math.round(m.daysOfStock) : 999;

    if (m.stockStatus === "품절위험" && m.growthRate > 0.1) {
      actions.push({
        id: `act-stock-${p.id}`,
        category: "재고",
        priority: "우선",
        title: `${p.name} 재고 확보 권장`,
        judgement: `판매 급증으로 재고가 약 ${days}일분만 남았습니다. 품절 가능성이 높습니다.`,
        evidence: [
          `최근 4주 판매 +${growthPct}%`,
          `남은 재고 약 ${days}일분`,
          `주요 ${p.mainChannels.length}개 채널 동시 판매 중`,
        ],
        impact: ["품절로 인한 판매기회 손실 방지", "성장 채널 모멘텀 유지"],
        recommendation: `추가 생산 ${m.recommendedOrder.toLocaleString()}개 수준의 발주를 검토하세요.`,
        linkedProductId: p.id,
        href: "/ax/products?tab=inventory",
        status: "대기",
      });
    } else if (m.growthRate > 0.25 && m.stockStatus !== "과잉") {
      actions.push({
        id: `act-prod-${p.id}`,
        category: "생산",
        priority: "높음",
        title: `${p.name} 생산량 확대 검토`,
        judgement: `최근 4주 판매량이 ${growthPct}% 증가했습니다. 다음 생산 계획 상향을 검토할 시점입니다.`,
        evidence: [
          `최근 4주 판매 +${growthPct}%`,
          `재고 소진 예상 약 ${days}일`,
          `일 평균 판매 ${m.dailyVelocity.toFixed(1)}개`,
        ],
        impact: ["품절 위험 사전 차단", "성장 SKU 매출 극대화"],
        recommendation: `다음 생산수량을 기존 계획보다 15~20% 높여 검토하세요.`,
        linkedProductId: p.id,
        href: "/ax/products?tab=production",
        status: "대기",
      });
    } else if (m.stockStatus === "과잉") {
      actions.push({
        id: `act-over-${p.id}`,
        category: "재고",
        priority: "중간",
        title: `${p.name} 과잉재고 소진 전략`,
        judgement: `현재 판매속도 기준 재고가 약 ${days}일분으로 과잉 상태입니다.`,
        evidence: [
          `재고 소진 예상 약 ${days}일`,
          `최근 4주 판매 ${growthPct >= 0 ? "+" : ""}${growthPct}%`,
        ],
        impact: ["재고 비용 절감", "현금 흐름 개선"],
        recommendation: "프로모션 기획 또는 B2B·수출 채널 소진 물량 배정을 검토하세요.",
        linkedProductId: p.id,
        href: "/ax/products?tab=inventory",
        status: "대기",
      });
    } else if (m.growthRate < -0.2) {
      actions.push({
        id: `act-slow-${p.id}`,
        category: "채널",
        priority: "중간",
        title: `${p.name} 판매 둔화 확인`,
        judgement: `최근 4주 판매량이 ${Math.abs(growthPct)}% 감소했습니다. 원인 확인이 필요합니다.`,
        evidence: [
          `최근 4주 판매 ${growthPct}%`,
          `주요 채널: ${p.mainChannels.length}개`,
        ],
        impact: ["부진 원인 조기 파악", "재고 과잉 사전 방지"],
        recommendation: "채널별 노출·가격·시즌 요인을 점검하고 생산 계획을 보수적으로 조정하세요.",
        linkedProductId: p.id,
        href: "/ax/channels",
        status: "대기",
      });
    }
  }

  // 채널 액션
  for (const ch of channels) {
    const cm = computeChannelMetrics(ch);
    if (cm.growthRate > 0.3) {
      actions.push({
        id: `act-ch-${ch.id}`,
        category: "채널",
        priority: "높음",
        title: `${ch.name} 성장 대응`,
        judgement: `이번 달 매출이 전월 대비 ${Math.round(cm.growthRate * 100)}% 증가했습니다. 물량·프로모션 확대를 검토하세요.`,
        evidence: [
          `전월 대비 +${Math.round(cm.growthRate * 100)}%`,
          `이번 달 매출 ${(ch.monthRevenue / 100_000_000).toFixed(1)}억 원`,
        ],
        impact: ["성장 채널 기회 극대화"],
        recommendation: "해당 채널 주력 SKU의 재고 배정과 노출 강화를 검토하세요.",
        href: "/ax/channels",
        status: "대기",
      });
    }
  }

  // B2B 납품 액션
  if (extra.b2bNextDelivery) {
    actions.push({
      id: "act-b2b-delivery",
      category: "B2B",
      priority: "높음",
      title: `${extra.b2bNextDelivery.name} 납품 준비 확인`,
      judgement: `${extra.b2bNextDelivery.date} 납품 예정 건이 있습니다. 재고 배정과 출고 일정을 확인하세요.`,
      evidence: [`다음 납품일 ${extra.b2bNextDelivery.date}`],
      impact: ["납기 준수로 거래처 신뢰 유지"],
      recommendation: "납품 수량 대비 가용 재고를 확인하고 출고 일정을 확정하세요.",
      href: "/ax/channels?tab=b2b",
      status: "대기",
    });
  }

  // 재구매 액션
  if (extra.repurchaseCount > 0) {
    actions.push({
      id: "act-repurchase",
      category: "재구매",
      priority: "중간",
      title: `재구매 예상 고객 ${extra.repurchaseCount}명 관리`,
      judgement: `구매 주기 기준 재구매 시점이 도래한 고객이 ${extra.repurchaseCount}명 있습니다.`,
      evidence: [
        `재구매 예상 고객 ${extra.repurchaseCount}명`,
        "구매 주기·마지막 주문일 기반 추정 (Demo)",
      ],
      impact: ["재구매 전환으로 안정 매출 확보"],
      recommendation: "재구매 대상 고객에게 맞춤 루틴 제안 캠페인을 검토하세요.",
      href: "/ax/growth",
      status: "대기",
    });
  }

  const order: Record<string, number> = { 우선: 0, 높음: 1, 중간: 2 };
  return actions.sort((a, b) => order[a.priority] - order[b.priority]);
}

/* ---------- 대시보드 KPI 집계 ---------- */
export interface DashboardKpis {
  monthRevenue: number;
  monthGrowthRate: number;
  totalSku: number;
  growingSku: number;
  decliningSku: number;
  stockRiskSku: number;
  overStockSku: number;
  b2bExportRevenue: number;
  b2bExportGrowthRate: number;
}

export function computeDashboardKpis(
  products: Product[],
  metrics: Map<string, ProductMetrics>,
  channels: Channel[]
): DashboardKpis {
  const monthRevenue = sum(channels.map((c) => c.monthRevenue));
  const prevRevenue = sum(channels.map((c) => c.prevMonthRevenue));
  const b2bExport = channels.filter((c) => c.type === "B2B" || c.type === "수출");
  const b2bExportRevenue = sum(b2bExport.map((c) => c.monthRevenue));
  const b2bExportPrev = sum(b2bExport.map((c) => c.prevMonthRevenue));

  let growing = 0;
  let declining = 0;
  let risk = 0;
  let over = 0;
  for (const p of products) {
    const m = metrics.get(p.id);
    if (!m) continue;
    if (m.growthRate > 0.1) growing++;
    if (m.growthRate < -0.1) declining++;
    if (m.stockStatus === "품절위험" || m.stockStatus === "부족주의") risk++;
    if (m.stockStatus === "과잉") over++;
  }

  return {
    monthRevenue,
    monthGrowthRate: prevRevenue > 0 ? (monthRevenue - prevRevenue) / prevRevenue : 0,
    totalSku: products.length,
    growingSku: growing,
    decliningSku: declining,
    stockRiskSku: risk,
    overStockSku: over,
    b2bExportRevenue,
    b2bExportGrowthRate: b2bExportPrev > 0 ? (b2bExportRevenue - b2bExportPrev) / b2bExportPrev : 0,
  };
}

/* ---------- 포맷 헬퍼 ---------- */
export function formatKRW(value: number): string {
  if (value >= 100_000_000) {
    const eok = value / 100_000_000;
    return `${eok >= 10 ? eok.toFixed(1) : eok.toFixed(1)}억 원`;
  }
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만 원`;
  return `${value.toLocaleString()}원`;
}

export function formatPct(rate: number, signed = true): string {
  const pct = Math.round(rate * 1000) / 10;
  return `${signed && pct > 0 ? "+" : ""}${pct}%`;
}

export function formatPrice(value: number): string {
  return `₩${value.toLocaleString()}`;
}
