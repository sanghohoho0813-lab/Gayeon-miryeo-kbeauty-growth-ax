import type {
  CustomerAccount,
  CustomerPurchase,
  Settlement,
  ActionStatus,
  B2BAccount,
  Channel,
  CustomerEvent,
  CustomerEventType,
  CustomerProfile,
  GrowthAction,
  GrowthActionCandidate,
  Inventory,
  KpiSnapshot,
  Product,
  SalesRecord,
  SkinConcern,
} from "./types";
import { daysBetween, todayISO, addDaysISO } from "./date";
import { repurchaseDue, repurchaseSchedule } from "./repurchase";
import { summarizeReceivables } from "./settlements";

/* ==========================================================================
   MIRYEO Growth AX — Analytics Adapter (RULE / STATISTICAL)
   DB 행(sales_records, customer_events) → 화면이 쓰는 지표로 변환한다.
   계산 가능한 것은 모두 코드로 계산한다. LLM 없이 동작 (AI METHOD MATRIX 참조).
   ========================================================================== */

export type StockStatus = "안정" | "부족주의" | "품절위험" | "과잉" | "데이터 없음";

export interface ProductMetrics {
  productId: string;
  weekly: number[]; // 8주, index 0 = 가장 오래된 주
  currentStock: number;
  recent4wUnits: number;
  prev4wUnits: number;
  growthRate: number;
  dailyVelocity: number;
  daysOfStock: number;
  marginRate: number | null;
  recent4wRevenue: number;
  stockStatus: StockStatus;
  recommendedOrder: number;
}

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/** 판매 행을 오늘 기준 주 단위 버킷(0 = 최근 7일)으로 집계 → 오래된 순 8칸 배열 */
export function weeklyUnits(sales: SalesRecord[], filter: (s: SalesRecord) => boolean, today = todayISO()): number[] {
  const buckets = Array(8).fill(0) as number[];
  for (const s of sales) {
    if (!filter(s)) continue;
    const ago = daysBetween(s.saleDate, today);
    if (ago < 0 || ago >= 56) continue;
    buckets[7 - Math.floor(ago / 7)] += s.units;
  }
  return buckets;
}

function revenueBetween(sales: SalesRecord[], filter: (s: SalesRecord) => boolean, fromAgo: number, toAgo: number, today: string) {
  let total = 0;
  for (const s of sales) {
    if (!filter(s)) continue;
    const ago = daysBetween(s.saleDate, today);
    if (ago >= fromAgo && ago < toAgo) total += s.revenue;
  }
  return total;
}

export function computeProductMetrics(product: Product, inventory: Inventory | undefined, sales: SalesRecord[], today: string): ProductMetrics {
  const weekly = weeklyUnits(sales, (s) => s.productId === product.id, today);
  const recent4wUnits = sum(weekly.slice(4));
  const prev4wUnits = sum(weekly.slice(0, 4));
  const growthRate = prev4wUnits > 0 ? (recent4wUnits - prev4wUnits) / prev4wUnits : recent4wUnits > 0 ? 1 : 0;
  const dailyVelocity = recent4wUnits / 28;
  const currentStock = inventory?.currentStock ?? 0;
  const daysOfStock = dailyVelocity > 0 ? currentStock / dailyVelocity : Infinity;
  const marginRate = product.cost != null && product.price > 0 ? (product.price - product.cost) / product.price : null;
  const recent4wRevenue = revenueBetween(sales, (s) => s.productId === product.id, 0, 28, today);

  let stockStatus: StockStatus = "안정";
  if (!inventory) stockStatus = "데이터 없음";
  else if (daysOfStock <= 10) stockStatus = "품절위험";
  else if (daysOfStock <= 21) stockStatus = "부족주의";
  else if (daysOfStock > 120 && currentStock > (inventory.safetyStock ?? 0) * 3) stockStatus = "과잉";

  const projected6w = dailyVelocity * 42 * (1 + Math.max(-0.3, Math.min(growthRate, 1)) * 0.5);
  const recommendedOrder = inventory
    ? Math.max(0, Math.round((projected6w - currentStock - (inventory.incomingStock ?? 0)) / 50) * 50)
    : 0;

  return { productId: product.id, weekly, currentStock, recent4wUnits, prev4wUnits, growthRate, dailyVelocity, daysOfStock, marginRate, recent4wRevenue, stockStatus, recommendedOrder };
}

export type MatrixZone = "성장·부족" | "안정" | "느린 판매" | "과잉재고";
export function matrixZone(m: ProductMetrics): MatrixZone {
  const fast = m.growthRate > 0.1 || m.dailyVelocity >= 15;
  if (fast && m.daysOfStock <= 21) return "성장·부족";
  if (!fast && m.stockStatus === "과잉") return "과잉재고";
  if (!fast && m.growthRate < -0.05) return "느린 판매";
  return "안정";
}

/* ---------- 채널 ---------- */
export interface ChannelStats {
  channel: Channel;
  recentRevenue: number;
  prevRevenue: number;
  growthRate: number;
  recentUnits: number;
  profitIndex: number; // 기준 마진 68% - 평균 할인율 (Demo 규칙)
  topProductIds: string[];
}

export function computeChannelStats(channels: Channel[], sales: SalesRecord[], today: string): ChannelStats[] {
  return channels.map((channel) => {
    const f = (s: SalesRecord) => s.channelId === channel.id;
    const recentRevenue = revenueBetween(sales, f, 0, 28, today);
    const prevRevenue = revenueBetween(sales, f, 28, 56, today);
    const byProduct = new Map<string, number>();
    let recentUnits = 0;
    for (const s of sales) {
      if (!f(s) || daysBetween(s.saleDate, today) >= 28) continue;
      recentUnits += s.units;
      byProduct.set(s.productId, (byProduct.get(s.productId) ?? 0) + s.revenue);
    }
    return {
      channel,
      recentRevenue,
      prevRevenue,
      growthRate: prevRevenue > 0 ? (recentRevenue - prevRevenue) / prevRevenue : 0,
      recentUnits,
      profitIndex: Math.max(0, 0.68 - channel.avgDiscountRate),
      topProductIds: [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id),
    };
  });
}

/* ---------- 고객 행동 (Customer Event Bridge) ---------- */
export const EVENT_LABEL: Record<CustomerEventType, string> = {
  view_product: "제품 조회",
  wishlist_add: "찜 추가",
  wishlist_remove: "찜 해제",
  finder_start: "Finder 시작",
  finder_complete: "Finder 완료",
  passport_save: "Passport 저장",
  recommendation_view: "추천 노출",
  outbound_purchase_click: "구매채널 이동",
};

/** 관심점수 가중치 — RULE. 전환에 가까운 행동일수록 높게 */
const INTEREST_WEIGHT: Partial<Record<CustomerEventType, number>> = {
  view_product: 0.2,
  wishlist_add: 2,
  wishlist_remove: -2,
  recommendation_view: 1,
  passport_save: 3,
  outbound_purchase_click: 2,
};
export const INTEREST_THRESHOLD = 20;
export const INTEREST_GROWTH_MIN = 0.3;

export interface ProductInterest {
  productId: string;
  recentScore: number;
  prevScore: number;
  growth: number | null;
  recentCounts: Partial<Record<CustomerEventType, number>>;
}

export interface CustomerInsight {
  recent: Record<CustomerEventType, number>;
  prev: Record<CustomerEventType, number>;
  finderSessionsRecent: number;
  passportSessionsRecent: number;
  conversionRecent: number | null;
  conversionPrev: number | null;
  productInterest: ProductInterest[];
  concerns: { concern: SkinConcern; count: number }[];
  daily: { date: string; finder: number; passport: number; wishlist: number; outbound: number }[];
  liveEvents: CustomerEvent[];
  liveCount: number;
  totalCount: number;
}

const emptyCounts = () =>
  Object.fromEntries(Object.keys(EVENT_LABEL).map((k) => [k, 0])) as Record<CustomerEventType, number>;

function eventProductIds(e: CustomerEvent): string[] {
  if (e.productId) return [e.productId];
  const ids = (e.payload?.productIds as string[] | undefined) ?? [];
  return Array.isArray(ids) ? ids : [];
}

export function computeCustomerInsight(events: CustomerEvent[], now: number = Date.now()): CustomerInsight {
  const day = 86_400_000;
  const recent = emptyCounts();
  const prev = emptyCounts();
  const finderRecent = new Set<string>();
  const passportRecent = new Set<string>();
  const finderPrev = new Set<string>();
  const passportPrev = new Set<string>();
  const scores = new Map<string, ProductInterest>();
  const concernCount = new Map<SkinConcern, number>();
  const today = todayISO(new Date(now));
  const daily = Array.from({ length: 14 }, (_, i) => ({ date: addDaysISO(today, i - 13), finder: 0, passport: 0, wishlist: 0, outbound: 0 }));

  for (const e of events) {
    const age = now - Date.parse(e.createdAt);
    if (age < 0 || age >= 14 * day) continue;
    const isRecent = age < 7 * day;
    const counts = isRecent ? recent : prev;
    counts[e.eventType] += 1;
    if (e.eventType === "finder_complete") (isRecent ? finderRecent : finderPrev).add(e.sessionId + e.id);
    if (e.eventType === "passport_save") (isRecent ? passportRecent : passportPrev).add(e.sessionId + e.id);
    if (e.eventType === "finder_complete" && isRecent) {
      for (const c of (e.payload?.concerns as SkinConcern[] | undefined) ?? []) concernCount.set(c, (concernCount.get(c) ?? 0) + 1);
    }
    const w = INTEREST_WEIGHT[e.eventType] ?? 0;
    if (w !== 0) {
      for (const pid of eventProductIds(e)) {
        const pi = scores.get(pid) ?? { productId: pid, recentScore: 0, prevScore: 0, growth: null, recentCounts: {} };
        if (isRecent) {
          pi.recentScore += w;
          pi.recentCounts[e.eventType] = (pi.recentCounts[e.eventType] ?? 0) + 1;
        } else pi.prevScore += w;
        scores.set(pid, pi);
      }
    }
    const d = daily.find((x) => x.date === todayISO(new Date(Date.parse(e.createdAt))));
    if (d) {
      if (e.eventType === "finder_complete") d.finder += 1;
      if (e.eventType === "passport_save") d.passport += 1;
      if (e.eventType === "wishlist_add") d.wishlist += 1;
      if (e.eventType === "outbound_purchase_click") d.outbound += 1;
    }
  }
  const productInterest = [...scores.values()]
    .map((p) => ({ ...p, recentScore: Math.round(p.recentScore * 10) / 10, prevScore: Math.round(p.prevScore * 10) / 10, growth: p.prevScore > 0 ? (p.recentScore - p.prevScore) / p.prevScore : null }))
    .sort((a, b) => b.recentScore - a.recentScore);
  const live = events.filter((e) => e.origin === "live");
  return {
    recent,
    prev,
    finderSessionsRecent: finderRecent.size,
    passportSessionsRecent: passportRecent.size,
    conversionRecent: finderRecent.size > 0 ? passportRecent.size / finderRecent.size : null,
    conversionPrev: finderPrev.size > 0 ? passportPrev.size / finderPrev.size : null,
    productInterest,
    concerns: [...concernCount.entries()].map(([concern, count]) => ({ concern, count })).sort((a, b) => b.count - a.count),
    daily,
    liveEvents: live.slice(-30).reverse(),
    liveCount: live.length,
    totalCount: events.length,
  };
}

/* ---------- KPI ---------- */
export interface DashboardKpis {
  revenue28: number;
  revenueGrowth: number | null;
  totalSku: number;
  growingSku: number;
  decliningSku: number;
  stockRiskSku: number;
  overStockSku: number;
  b2bExportRevenue28: number;
  b2bExportGrowth: number | null;
  salesRowCount: number;
  lastSaleDate: string | null;
}

export function computeKpis(products: Product[], metrics: Map<string, ProductMetrics>, channelStats: ChannelStats[], sales: SalesRecord[]): DashboardKpis {
  const revenue28 = sum(channelStats.map((c) => c.recentRevenue));
  const prev = sum(channelStats.map((c) => c.prevRevenue));
  const be = channelStats.filter((c) => c.channel.type === "B2B" || c.channel.type === "수출");
  const beRecent = sum(be.map((c) => c.recentRevenue));
  const bePrev = sum(be.map((c) => c.prevRevenue));
  let growing = 0, declining = 0, risk = 0, over = 0;
  for (const p of products) {
    const m = metrics.get(p.id);
    if (!m) continue;
    if (m.growthRate > 0.1) growing++;
    if (m.growthRate < -0.1) declining++;
    if (m.stockStatus === "품절위험" || m.stockStatus === "부족주의") risk++;
    if (m.stockStatus === "과잉") over++;
  }
  const last = sales.reduce<string | null>((acc, s) => (!acc || s.saleDate > acc ? s.saleDate : acc), null);
  return {
    revenue28,
    revenueGrowth: prev > 0 ? (revenue28 - prev) / prev : null,
    totalSku: products.length,
    growingSku: growing,
    decliningSku: declining,
    stockRiskSku: risk,
    overStockSku: over,
    b2bExportRevenue28: beRecent,
    b2bExportGrowth: bePrev > 0 ? (beRecent - bePrev) / bePrev : null,
    salesRowCount: sales.length,
    lastSaleDate: last,
  };
}

/* ---------- AI Product Insight (규칙 기반 문장) ---------- */
export function productInsight(m: ProductMetrics): { summary: string; evidence: string[] } {
  const g = Math.round(m.growthRate * 100);
  const days = Number.isFinite(m.daysOfStock) ? Math.round(m.daysOfStock) : null;
  let summary: string;
  if (m.stockStatus === "데이터 없음") summary = "재고 데이터가 아직 입력되지 않았습니다. 재고를 입력하면 소진일과 발주 추천이 계산됩니다.";
  else if (m.stockStatus === "품절위험" && m.growthRate > 0.1) summary = `최근 4주 판매가 이전 4주보다 ${g}% 증가했고, 현재 재고는 약 ${days}일분입니다. 추가 생산 확보 검토가 필요합니다.`;
  else if (m.stockStatus === "과잉") summary = `판매속도 대비 재고가 약 ${days}일분으로 과잉입니다. 프로모션 또는 B2B·수출 소진 전략 검토가 필요합니다.`;
  else if (m.growthRate > 0.15) summary = `최근 4주 판매가 ${g}% 증가했습니다. 성장이 이어지면 생산 일정을 앞당길지 검토하세요.`;
  else if (m.growthRate < -0.1) summary = `최근 4주 판매가 ${Math.abs(g)}% 감소했습니다. 채널·가격·시즌 요인을 점검하세요.`;
  else summary = "판매와 재고가 안정 구간입니다. 주간 판매속도 변화를 관찰하세요.";
  return {
    summary,
    evidence: [
      `최근 4주 판매 ${m.recent4wUnits.toLocaleString()}개 (이전 4주 ${m.prev4wUnits.toLocaleString()}개, ${g >= 0 ? "+" : ""}${g}%)`,
      days !== null ? `재고 소진 예상 약 ${days}일 (일 평균 ${m.dailyVelocity.toFixed(1)}개)` : "판매 데이터 없음 — 소진일 계산 불가",
      m.marginRate != null ? `마진율 약 ${Math.round(m.marginRate * 100)}%` : "원가 미입력 — 마진 계산 불가",
    ],
  };
}

/* ---------- Growth Action 후보 (RULE) ---------- */
export function generateCandidates(input: {
  products: Product[];
  metrics: Map<string, ProductMetrics>;
  channelStats: ChannelStats[];
  interest: ProductInterest[];
  b2b: B2BAccount[];
  customers: CustomerProfile[];
  today: string;
  /** 2단계: 회원 구매기록 기반 재구매 · 정산 연체 (대표·관리자 데이터 — STAFF는 빈 배열) */
  accounts?: CustomerAccount[];
  purchases?: CustomerPurchase[];
  settlements?: Settlement[];
}): GrowthActionCandidate[] {
  const out: GrowthActionCandidate[] = [];
  const { products, metrics, channelStats, interest, b2b, customers, today, accounts = [], purchases = [], settlements = [] } = input;
  const daysText = (m: ProductMetrics) => (Number.isFinite(m.daysOfStock) ? `${Math.round(m.daysOfStock)}일` : "-");

  for (const p of products) {
    const m = metrics.get(p.id);
    if (!m || m.stockStatus === "데이터 없음") continue;
    const g = Math.round(m.growthRate * 100);
    const snap: KpiSnapshot[] = [
      { label: "재고 소진 예상", value: daysText(m) },
      { label: "현재 재고", value: `${m.currentStock.toLocaleString()}개` },
      { label: "4주 판매 성장률", value: `${g >= 0 ? "+" : ""}${g}%` },
    ];
    if (m.stockStatus === "품절위험" && m.growthRate > 0.1) {
      out.push({ ruleKey: `stock:${p.id}`, category: "재고", priority: "우선", title: `${p.name} 재고 확보`, judgement: `판매 증가로 재고가 약 ${daysText(m)}분만 남았습니다.`, evidence: [`최근 4주 판매 +${g}%`, `재고 소진 예상 ${daysText(m)}`, `추천 발주량 ${m.recommendedOrder.toLocaleString()}개 (6주 예측)`], impact: ["품절로 인한 판매기회 손실 방지"], recommendation: `추가 생산 약 ${m.recommendedOrder.toLocaleString()}개 발주를 검토하세요.`, decisionMethod: "RULE", linkedProductId: p.id, href: "/ax/products?tab=inventory", proofType: "INVENTORY_RISK_RESPONSE", snapshot: snap });
    } else if (m.growthRate > 0.25 && m.stockStatus !== "과잉") {
      out.push({ ruleKey: `prod:${p.id}`, category: "생산", priority: "높음", title: `${p.name} 생산량 확대 검토`, judgement: `최근 4주 판매가 ${g}% 증가했습니다.`, evidence: [`최근 4주 판매 +${g}%`, `재고 소진 예상 ${daysText(m)}`, `일 평균 ${m.dailyVelocity.toFixed(1)}개`], impact: ["품절 위험 사전 차단"], recommendation: "다음 생산수량 상향(예: 15~20%)을 OEM 일정과 함께 검토하세요.", decisionMethod: "STATISTICAL", linkedProductId: p.id, href: "/ax/products?tab=production", proofType: "PRODUCTION_ADJUSTMENT", snapshot: snap });
    } else if (m.stockStatus === "과잉") {
      out.push({ ruleKey: `over:${p.id}`, category: "재고", priority: "중간", title: `${p.name} 과잉재고 소진`, judgement: `판매속도 기준 재고가 약 ${daysText(m)}분입니다.`, evidence: [`재고 소진 예상 ${daysText(m)}`, `최근 4주 판매 ${g >= 0 ? "+" : ""}${g}%`], impact: ["재고 비용·현금 흐름 개선"], recommendation: "프로모션 또는 B2B·수출 채널 소진 물량 배정을 검토하세요.", decisionMethod: "RULE", linkedProductId: p.id, href: "/ax/products?tab=inventory", proofType: "INVENTORY_RISK_RESPONSE", snapshot: snap });
    } else if (m.growthRate < -0.2) {
      out.push({ ruleKey: `slow:${p.id}`, category: "채널", priority: "중간", title: `${p.name} 판매 둔화 점검`, judgement: `최근 4주 판매가 ${Math.abs(g)}% 감소했습니다.`, evidence: [`최근 4주 판매 ${g}%`, `주요 채널 ${p.mainChannelIds.length}개`], impact: ["부진 원인 조기 파악", "과잉재고 사전 방지"], recommendation: "채널별 노출·가격·시즌 요인을 점검하고 생산 계획을 보수적으로 조정하세요.", decisionMethod: "STATISTICAL", linkedProductId: p.id, href: "/ax/channels", proofType: "CHANNEL_STRATEGY", snapshot: snap });
    }
  }

  // 고객 관심 상승 — Customer Event Bridge
  for (const pi of interest) {
    const p = products.find((x) => x.id === pi.productId);
    if (!p) continue;
    const rising = pi.recentScore >= INTEREST_THRESHOLD && (pi.growth === null || pi.growth >= INTEREST_GROWTH_MIN);
    if (!rising) continue;
    const m = metrics.get(p.id);
    const growthText = pi.growth === null ? "신규" : `+${Math.round(pi.growth * 100)}%`;
    out.push({
      ruleKey: `interest:${p.id}`,
      category: "고객 관심",
      priority: m && (m.stockStatus === "품절위험" || m.stockStatus === "부족주의") ? "우선" : "높음",
      title: `${p.name} 고객 관심 상승 대응`,
      judgement: `MIRYEO AI Beauty에서 최근 7일 관심점수가 ${pi.recentScore}점 (${growthText})으로 올랐습니다.`,
      evidence: [
        `7일 관심점수 ${pi.recentScore} / 이전 7일 ${pi.prevScore}`,
        `Passport 저장 ${pi.recentCounts.passport_save ?? 0} · 찜 ${pi.recentCounts.wishlist_add ?? 0} · 구매채널 이동 ${pi.recentCounts.outbound_purchase_click ?? 0}`,
        m ? `재고 소진 예상 ${daysText(m)}` : "재고 데이터 없음",
      ],
      impact: ["고객 수요 신호를 재고·노출 판단에 반영", "Finder → 구매 전환 기회 확대"],
      recommendation: "재고 여유를 확인하고, 고객 화면 추천 노출·구매채널 안내를 강화할지 결정하세요.",
      decisionMethod: "RULE",
      linkedProductId: p.id,
      href: "/ax/customers",
      proofType: "CUSTOMER_INTEREST_RESPONSE",
      snapshot: [
        { label: "7일 관심점수", value: `${pi.recentScore}` },
        { label: "Passport 저장(7일)", value: `${pi.recentCounts.passport_save ?? 0}` },
        { label: "재고 소진 예상", value: m ? daysText(m) : "-" },
      ],
    });
  }

  for (const cs of channelStats) {
    if (cs.growthRate > 0.3 && cs.prevRevenue > 0) {
      const g = Math.round(cs.growthRate * 100);
      out.push({ ruleKey: `ch:${cs.channel.id}`, category: "채널", priority: "높음", title: `${cs.channel.name} 성장 대응`, judgement: `최근 4주 매출이 이전 4주 대비 ${g}% 증가했습니다.`, evidence: [`최근 4주 매출 +${g}%`, `평균 할인율 ${Math.round(cs.channel.avgDiscountRate * 100)}%`], impact: ["성장 채널 기회 확보"], recommendation: "해당 채널 주력 SKU의 재고 배정과 수익성을 함께 검토하세요.", decisionMethod: "STATISTICAL", href: "/ax/channels", proofType: "CHANNEL_STRATEGY", snapshot: [{ label: "4주 매출 성장률", value: `+${g}%` }] });
    }
  }

  for (const b of b2b) {
    if (!b.nextDelivery) continue;
    const d = daysBetween(today, b.nextDelivery);
    if (d >= 0 && d <= 14) {
      out.push({ ruleKey: `b2b:${b.id}`, category: "B2B", priority: d <= 5 ? "우선" : "높음", title: `${b.name} 납품 준비`, judgement: `${d}일 후 납품 예정입니다.`, evidence: [`다음 납품일 ${b.nextDelivery}`], impact: ["납기 준수"], recommendation: "납품 수량 대비 가용 재고를 확인하고 출고 일정을 확정하세요.", decisionMethod: "RULE", href: "/ax/channels?tab=b2b", proofType: "B2B_FOLLOWUP", snapshot: [{ label: "납품까지", value: `${d}일` }] });
    }
  }

  // 재구매: 회원 구매기록(사용기간 기준 예상일)이 있으면 그것을 우선, 없으면 기존 고객 목록 기준
  if (accounts.length > 0 && purchases.length > 0) {
    const productById = new Map(products.map((p) => [p.id, p]));
    const dueItems = repurchaseDue(repurchaseSchedule(purchases, productById, today));
    const consent = new Set(accounts.filter((a) => a.marketingConsent).map((a) => a.userId));
    const members = new Set(dueItems.map((i) => i.purchase.customerUserId));
    const contactable = [...members].filter((id) => consent.has(id)).length;
    if (members.size > 0) {
      out.push({ ruleKey: "repurchase-members", category: "재구매", priority: "중간", title: `재구매 시점 회원 ${members.size}명 (안내 동의 ${contactable}명)`, judgement: `구매 기록과 제품 사용기간으로 계산한 재구매 예상일이 7일 이내이거나 최근 지난 회원이 ${members.size}명입니다.`, evidence: [`대상 제품 ${dueItems.length}건`, `마케팅 수신 동의 ${contactable}명 / 미동의 ${members.size - contactable}명`, "예상일 = 구매일 + 사용기간 × 수량 (사용기간 미입력 제품은 종류별 추정)"], impact: ["재구매 전환 기회"], recommendation: "수신 동의한 회원에게만 재구매 안내를 검토하고, 미동의 회원은 마이페이지 표시로만 안내하세요.", decisionMethod: "RULE", href: "/ax/customers#members", proofType: "REPURCHASE_OUTREACH", snapshot: [{ label: "재구매 대상 회원", value: `${members.size}명` }, { label: "안내 가능(동의)", value: `${contactable}명` }] });
    }
  } else {
    const due = customers.filter((c) => c.orderCount >= 2 && c.lastOrderAt && daysBetween(c.lastOrderAt, today) >= 60);
    if (due.length > 0) {
      out.push({ ruleKey: "repurchase", category: "재구매", priority: "중간", title: `재구매 시점 고객 ${due.length}명`, judgement: `2회 이상 구매했고 마지막 주문 후 60일이 지난 고객이 ${due.length}명입니다.`, evidence: [`대상 ${due.length}명 (구매 2회+, 60일 경과)`, "기준: 구매 주기 RULE (Demo)"], impact: ["재구매 전환 기회"], recommendation: "고객 동의 범위 안에서 맞춤 루틴 안내를 검토하세요.", decisionMethod: "RULE", href: "/ax/customers", proofType: "REPURCHASE_OUTREACH", snapshot: [{ label: "재구매 대상", value: `${due.length}명` }] });
    }
  }

  // 정산: 기한 지난 미수금
  const rs = summarizeReceivables(settlements, today);
  if (rs.overdueCount > 0) {
    out.push({ ruleKey: "settlement-overdue", category: "정산", priority: rs.maxOverdueDays >= 30 ? "우선" : "높음", title: `연체 미수금 ${rs.overdueCount}건 회수`, judgement: `입금 기한이 지난 받을 돈이 ${formatKRW(rs.overdueAmount)} 있습니다 (최장 ${rs.maxOverdueDays}일 경과).`, evidence: [`연체 ${rs.overdueCount}건 · ${formatKRW(rs.overdueAmount)}`, `전체 미수금 ${formatKRW(rs.outstanding)}`], impact: ["현금 흐름 확보", "거래처 신용 관리"], recommendation: "연체 건별로 거래처에 입금 일정을 확인하고, 입금되면 정산 화면에 기록하세요.", decisionMethod: "RULE", href: "/ax/channels?tab=settlements", proofType: "SETTLEMENT_FOLLOWUP", snapshot: [{ label: "연체 미수금", value: formatKRW(rs.overdueAmount) }, { label: "연체 건수", value: `${rs.overdueCount}건` }] });
  }
  return out;
}

/* ---------- Action 정렬 / 오늘의 Mission ---------- */
const PRIORITY_ORDER = { 우선: 0, 높음: 1, 중간: 2 } as const;
const STATUS_ORDER: Record<ActionStatus, number> = { IN_PROGRESS: 0, NEW: 1, REVIEWED: 2, DONE: 3, DISMISSED: 4 };
export const OPEN_STATUSES: ActionStatus[] = ["NEW", "REVIEWED", "IN_PROGRESS"];
export const ACTION_COOLDOWN_DAYS = 14;

export function sortActions(actions: GrowthAction[]): GrowthAction[] {
  return [...actions].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.createdAt.localeCompare(b.createdAt)
  );
}

export function todayMissions(actions: GrowthAction[]): GrowthAction[] {
  return [...actions]
    .filter((a) => OPEN_STATUSES.includes(a.status))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 3);
}

/** 저장되지 않은 후보 중 새로 저장해야 할 것 (열린 Action 없음 + 최근 종료 쿨다운 경과) */
export function candidatesToMaterialize(candidates: GrowthActionCandidate[], stored: GrowthAction[], now = Date.now()): GrowthActionCandidate[] {
  return candidates.filter((c) => {
    const same = stored.filter((a) => a.ruleKey === c.ruleKey);
    if (same.some((a) => OPEN_STATUSES.includes(a.status))) return false;
    return !same.some((a) => now - Date.parse(a.updatedAt) < ACTION_COOLDOWN_DAYS * 86_400_000);
  });
}

/* ---------- 포맷 ---------- */
export function formatKRW(value: number): string {
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억 원`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만 원`;
  return `${value.toLocaleString()}원`;
}
export function formatPct(rate: number | null | undefined, signed = true): string {
  if (rate == null || !Number.isFinite(rate)) return "-";
  const pct = Math.round(rate * 1000) / 10;
  return `${signed && pct > 0 ? "+" : ""}${pct}%`;
}
export function formatPrice(value: number): string {
  return `₩${value.toLocaleString()}`;
}
