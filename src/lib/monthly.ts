import type { Channel, Product, SalesRecord } from "./types";

/* 월별 매출·매출총이익 — 판매 행 기준. 이익 = 매출 − 판매수량 × 원가 (원가 입력된 제품만, 판관비 제외) */
export interface Breakdown { key: string; name: string; revenue: number; units: number; profit: number | null }
export interface MonthRow {
  month: string; // YYYY-MM
  revenue: number;
  units: number;
  /** 원가가 입력된 제품 매출 */
  costedRevenue: number;
  grossProfit: number; // costedRevenue 기준
  byChannel: Breakdown[];
  byProduct: Breakdown[];
}

export const monthKey = (iso: string) => iso.slice(0, 7);
export function recentMonths(today: string, n: number): string[] {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}
export const monthLabel = (ym: string) => `${ym.slice(0, 4)}.${ym.slice(5, 7)}`;

export function monthlySummary(sales: SalesRecord[], products: Product[], channels: Channel[], today: string, n = 12): MonthRow[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const channelById = new Map(channels.map((c) => [c.id, c]));
  const months = recentMonths(today, n);
  const rows = new Map(months.map((mo) => [mo, { month: mo, revenue: 0, units: 0, costedRevenue: 0, grossProfit: 0, ch: new Map<string, Breakdown>(), pr: new Map<string, Breakdown>() }]));
  for (const s of sales) {
    const r = rows.get(monthKey(s.saleDate));
    if (!r) continue;
    const p = productById.get(s.productId);
    const cost = p?.cost;
    const profit = cost != null ? s.revenue - s.units * cost : null;
    r.revenue += s.revenue;
    r.units += s.units;
    if (profit != null) { r.costedRevenue += s.revenue; r.grossProfit += profit; }
    const add = (map: Map<string, Breakdown>, key: string, name: string) => {
      const b = map.get(key) ?? { key, name, revenue: 0, units: 0, profit: 0 };
      b.revenue += s.revenue;
      b.units += s.units;
      b.profit = b.profit == null || profit == null ? null : b.profit + profit;
      map.set(key, b);
    };
    add(r.ch, s.channelId, channelById.get(s.channelId)?.name ?? "삭제된 채널");
    add(r.pr, s.productId, p?.name ?? "삭제된 상품");
  }
  return months.map((mo) => {
    const r = rows.get(mo)!;
    const sort = (m: Map<string, Breakdown>) => [...m.values()].sort((a, b) => b.revenue - a.revenue);
    return { month: mo, revenue: r.revenue, units: r.units, costedRevenue: r.costedRevenue, grossProfit: r.grossProfit, byChannel: sort(r.ch), byProduct: sort(r.pr) };
  });
}

export const marginRate = (r: { costedRevenue: number; grossProfit: number }) => (r.costedRevenue > 0 ? r.grossProfit / r.costedRevenue : null);
export const change = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : null);
