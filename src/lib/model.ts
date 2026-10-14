import type { DataSnapshot } from "./data/source";
import { resolvePlanning } from "./planning";
import type { GrowthAction, GrowthActionCandidate, PlanningSettings, Product } from "./types";
import {
  computeChannelStats, computeCustomerInsight, computeKpis, computeProductMetrics, generateCandidates,
  sortActions, todayMissions, type ChannelStats, type CustomerInsight, type DashboardKpis, type ProductMetrics,
} from "./analytics";
import { todayISO } from "./date";

/* Snapshot(DB 행) → 화면 Model. 모든 AX 화면은 이 Model만 사용한다. */

export interface AxModel {
  snapshot: DataSnapshot;
  today: string;
  /** 판매 분석 기준일 — 마지막 판매일(오늘 이후 날짜 제외). 판매를 몰아 올려 최근 며칠이 비면 '최근 4주'를 여기서 끊는다 (D-053) */
  salesAsOf: string;
  productById: Map<string, Product>;
  metrics: Map<string, ProductMetrics>;
  channelStats: ChannelStats[];
  kpis: DashboardKpis;
  customer: CustomerInsight;
  candidates: GrowthActionCandidate[];
  actions: GrowthAction[];
  missions: GrowthAction[];
  candidateByRule: Map<string, GrowthActionCandidate>;
  /** 운영 기준값 (조직 설정 + 기본값) — 생산 계획·사후 성과 측정 (PASS 15) */
  planning: PlanningSettings;
}

export function buildModel(snapshot: DataSnapshot): AxModel {
  const today = todayISO();
  // 판매를 며칠씩 몰아 올리면 아직 입력하지 않은 날이 0으로 세어져 판매속도·성장률이 낮게 나온다 → 마지막 판매일 기준 4주 (D-053)
  const lastSale = snapshot.sales.reduce((a, s) => (s.saleDate <= today && s.saleDate > a ? s.saleDate : a), "");
  const salesAsOf = lastSale && lastSale < today ? lastSale : today;
  const productById = new Map(snapshot.products.map((p) => [p.id, p]));
  const planning = resolvePlanning(snapshot.org);
  const metrics = new Map(
    snapshot.products.map((p) => [p.id, computeProductMetrics(p, snapshot.inventory.find((i) => i.productId === p.id), snapshot.sales, today, salesAsOf, planning)])
  );
  const channelStats = computeChannelStats(snapshot.channels.filter((c) => c.active), snapshot.sales, salesAsOf);
  const kpis = computeKpis(snapshot.products, metrics, channelStats, snapshot.sales);
  const customer = computeCustomerInsight(snapshot.customerEvents);
  const candidates = generateCandidates({
    products: snapshot.products, metrics, channelStats, interest: customer.productInterest,
    b2b: snapshot.b2b, customers: snapshot.customers, today, production: snapshot.production,
    accounts: snapshot.customerAccounts, purchases: snapshot.customerPurchases, settlements: snapshot.settlements,
    plan: planning,
  });
  const actions = sortActions(snapshot.actions);
  return {
    snapshot, today, salesAsOf, productById, metrics, channelStats, kpis, customer, candidates, actions,
    missions: todayMissions(actions),
    candidateByRule: new Map(candidates.map((c) => [c.ruleKey, c])),
    planning,
  };
}
