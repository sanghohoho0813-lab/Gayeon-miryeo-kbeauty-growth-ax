"use client";

import { useMemo } from "react";
import { demoRepository } from "./repository";
import {
  computeAllMetrics,
  computeChannelMetrics,
  computeDashboardKpis,
  generateGrowthActions,
  type ChannelMetrics,
  type DashboardKpis,
  type ProductMetrics,
} from "./analytics";
import type {
  B2BAccount,
  Channel,
  CustomerEvent,
  CustomerProfile,
  ExportRecord,
  GrowthAction,
  Inventory,
  Product,
  ProductionPlan,
  SalesRecord,
} from "./types";

export interface AxData {
  products: Product[];
  sales: SalesRecord[];
  inventory: Inventory[];
  production: ProductionPlan[];
  channels: Channel[];
  b2bAccounts: B2BAccount[];
  exports: ExportRecord[];
  customers: CustomerProfile[];
  customerEvents: CustomerEvent[];
  metrics: Map<string, ProductMetrics>;
  channelMetrics: Map<string, ChannelMetrics>;
  kpis: DashboardKpis;
  actions: GrowthAction[];
}

/** Business AX 화면 공용 데이터 훅.
    현재는 Demo Repository 기반 — Supabase 연동 시 repository async 호출로 교체. */
export function useAxData(): AxData {
  return useMemo(() => {
    const {
      products, sales, inventory, production, channels,
      b2bAccounts, exports: exportRecords, customers, customerEvents,
    } = demoRepository;

    const metrics = computeAllMetrics(products, inventory, sales);
    const channelMetrics = new Map(
      channels.map((c) => [c.id, computeChannelMetrics(c)])
    );
    const kpis = computeDashboardKpis(products, metrics, channels);

    const nextB2B = b2bAccounts
      .filter((b) => b.nextDelivery)
      .sort((a, b) => (a.nextDelivery! < b.nextDelivery! ? -1 : 1))[0];

    const actions = generateGrowthActions(products, metrics, channels, {
      b2bNextDelivery: nextB2B ? { name: nextB2B.name, date: nextB2B.nextDelivery! } : undefined,
      repurchaseCount: customers.filter((c) => c.repurchaseDue).length,
    });

    return {
      products, sales, inventory, production, channels,
      b2bAccounts, exports: exportRecords, customers, customerEvents,
      metrics, channelMetrics, kpis, actions,
    };
  }, []);
}
