import type { DataSnapshot } from "./data/source";
import type { GrowthAction, GrowthActionCandidate, Product } from "./types";
import {
  computeChannelStats, computeCustomerInsight, computeKpis, computeProductMetrics, generateCandidates,
  sortActions, todayMissions, type ChannelStats, type CustomerInsight, type DashboardKpis, type ProductMetrics,
} from "./analytics";
import { todayISO } from "./date";

/* Snapshot(DB 행) → 화면 Model. 모든 AX 화면은 이 Model만 사용한다. */

export interface AxModel {
  snapshot: DataSnapshot;
  today: string;
  productById: Map<string, Product>;
  metrics: Map<string, ProductMetrics>;
  channelStats: ChannelStats[];
  kpis: DashboardKpis;
  customer: CustomerInsight;
  candidates: GrowthActionCandidate[];
  actions: GrowthAction[];
  missions: GrowthAction[];
  candidateByRule: Map<string, GrowthActionCandidate>;
}

export function buildModel(snapshot: DataSnapshot): AxModel {
  const today = todayISO();
  const productById = new Map(snapshot.products.map((p) => [p.id, p]));
  const metrics = new Map(
    snapshot.products.map((p) => [p.id, computeProductMetrics(p, snapshot.inventory.find((i) => i.productId === p.id), snapshot.sales, today)])
  );
  const channelStats = computeChannelStats(snapshot.channels.filter((c) => c.active), snapshot.sales, today);
  const kpis = computeKpis(snapshot.products, metrics, channelStats, snapshot.sales);
  const customer = computeCustomerInsight(snapshot.customerEvents);
  const candidates = generateCandidates({
    products: snapshot.products, metrics, channelStats, interest: customer.productInterest,
    b2b: snapshot.b2b, customers: snapshot.customers, today,
  });
  const actions = sortActions(snapshot.actions);
  return {
    snapshot, today, productById, metrics, channelStats, kpis, customer, candidates, actions,
    missions: todayMissions(actions),
    candidateByRule: new Map(candidates.map((c) => [c.ruleKey, c])),
  };
}
