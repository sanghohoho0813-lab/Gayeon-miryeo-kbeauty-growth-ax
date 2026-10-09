import type { DataSnapshot } from "./data/source";
import type { Channel } from "./types";
import { monthlySummary, recentMonths, change, marginRate, type MonthRow } from "./monthly";
import { BASELINE_SOURCE_LABEL, lastDays, measureMoneyKpis, type MoneyKpiMeasure, inDateRange } from "./evidence";
import { realScope } from "./start-guide";

/* 사업화 실적 자료 (계약 별지 제2호 3단계 "정책자금·보증용 사업화자료", 제8조 벤처 신청자료 연결)
   — 시스템에 기록된 데이터만 집계한다. 평가·전망·회사 소개 문장은 만들지 않는다 (회사 사실을 지어내지 않는다).
   — Live: Demo 표시 상품·시드 데이터를 제외. Demo: 전부 시연용(제출 불가)으로 표시. */

export interface Share { name: string; revenue: number; share: number }
/** 기간 — 신청 양식마다 기준이 달라 최근 12개월·올해·작년을 고른다 */
export type ReportPeriod = "last12" | "thisYear" | "lastYear";
export const REPORT_PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "last12", label: "최근 12개월" },
  { id: "thisYear", label: "올해" },
  { id: "lastYear", label: "작년" },
];
export function periodRange(p: ReportPeriod, today: string): { end: string; n: number; label: string } {
  const y = Number(today.slice(0, 4)), mo = Number(today.slice(5, 7));
  if (p === "thisYear") return { end: today, n: mo, label: `${y}년 1~${mo}월` };
  if (p === "lastYear") return { end: `${y - 1}-12-31`, n: 12, label: `${y - 1}년` };
  return { end: today, n: 12, label: "최근 12개월" };
}

export interface BusinessReport {
  live: boolean;
  period: ReportPeriod;
  periodLabel: string;
  months: string[];
  from: string;
  to: string;
  excluded: { demoProducts: number; seedSales: number };
  coverage: { salesRows: number; firstSale: string | null; lastSale: string | null; monthsWithSales: number; bySource: { manual: number; csv: number; api: number; seed: number } };
  sales: {
    monthly: MonthRow[];
    total: number;
    units: number;
    avgMonthly: number;
    /** 완료된 달 기준 (진행 중인 이번 달 제외) */
    recent3: number;
    prev3: number;
    growth3: number | null;
    recentLabel: string;
    /** 진행 중인 달 (월 말일이 아니면 이번 달) — 표에 '진행 중' 표시 */
    partialMonth: string | null;
    grossMargin: number | null;
    costedShare: number | null;
  };
  channels: { byType: { type: Channel["type"]; revenue: number; share: number }[]; top: Share[]; activeCount: number };
  b2b: { accounts: number; active: number; cumulativeRevenue: number };
  exports: { regions: number; cumulativeRevenue: number; list: { region: string; revenue: number }[] };
  products: { skus: number; published: number; top: Share[] };
  customers: { finderSessions: number; recommendationViews: number; outboundClicks: number; passportSaves: number; members: number; purchasesRecorded: number };
  ax: { created: number; done: number; dismissed: number; open: number; proofsRecorded: number; proofsConfirmed: number; kpis: MoneyKpiMeasure[]; pilotStartedOn: string | null; axOwner: string | null };
}

const share = (v: number, total: number) => (total > 0 ? v / total : 0);

export function buildBusinessReport(s0: DataSnapshot, today: string, live: boolean, period: ReportPeriod = "last12"): BusinessReport {
  const { end, n, label: periodLabel } = periodRange(period, today);
  // Live는 실데이터 범위만 (Demo 표시 상품·시드 판매 제외). Demo는 그대로 두고 화면에 '제출 불가' 표시.
  const real = realScope(s0);
  const demoIds = new Set(s0.products.filter((p) => p.isDemo).map((p) => p.id));
  const s: DataSnapshot = live
    ? { ...s0, products: real.products, sales: s0.sales.filter((x) => x.source !== "seed" && !demoIds.has(x.productId)), proofEvents: real.proofs, customerEvents: s0.customerEvents.filter((e) => e.origin !== "seed") }
    : s0;
  const months = recentMonths(end, n);
  const from = `${months[0]}-01`;
  const to = end;
  const inPeriod = (d: string) => d >= from && d <= to;
  const sales = s.sales.filter((x) => inPeriod(x.saleDate));
  const monthly = monthlySummary(s.sales, s.products, s.channels, end, n);
  const total = monthly.reduce((a, r) => a + r.revenue, 0);
  const units = monthly.reduce((a, r) => a + r.units, 0);
  const costed = monthly.reduce((a, r) => a + r.costedRevenue, 0);
  const gross = monthly.reduce((a, r) => a + r.grossProfit, 0);
  const sum = (rows: MonthRow[]) => rows.reduce((a, r) => a + r.revenue, 0);
  // 이번 달이 끝나지 않았으면 비교에서 뺀다 (며칠치 매출로 '감소'처럼 보이는 왜곡 방지)
  const lastDay = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
  const partialMonth = Number(today.slice(8, 10)) < lastDay && months.includes(today.slice(0, 7)) ? today.slice(0, 7) : null;
  const complete = partialMonth ? monthly.filter((r) => r.month !== partialMonth) : monthly;
  const recentRows = complete.slice(-3);
  const recent3 = sum(recentRows);
  const prev3 = sum(complete.slice(-6, -3));
  const recentLabel = recentRows.length ? `${recentRows[0].month.replace("-", ".")}~${recentRows[recentRows.length - 1].month.replace("-", ".")}` : "";
  const monthsWithSales = monthly.filter((r) => r.revenue > 0).length;

  const chById = new Map(s.channels.map((c) => [c.id, c]));
  const byCh = new Map<string, number>();
  const byType = new Map<Channel["type"], number>();
  const byProd = new Map<string, number>();
  for (const x of sales) {
    byCh.set(x.channelId, (byCh.get(x.channelId) ?? 0) + x.revenue);
    const t = chById.get(x.channelId)?.type;
    if (t) byType.set(t, (byType.get(t) ?? 0) + x.revenue);
    byProd.set(x.productId, (byProd.get(x.productId) ?? 0) + x.revenue);
  }
  const top = (m: Map<string, number>, name: (k: string) => string, k = 5): Share[] =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([key, revenue]) => ({ name: name(key), revenue, share: share(revenue, total) }));
  const prodName = new Map(s.products.map((p) => [p.id, p.name]));

  const sortedDates = s.sales.map((x) => x.saleDate).sort();
  const src = { manual: 0, csv: 0, api: 0, seed: 0 };
  for (const x of s.sales) src[x.source]++;

  const range = { from, to };
  const ev = s.customerEvents.filter((e) => inDateRange(e.createdAt, range));
  const sessions = (t: string) => new Set(ev.filter((e) => e.eventType === t).map((e) => e.sessionId)).size;
  const actions = s.actions.filter((a) => inDateRange(a.createdAt, range));
  const aev = s.actionEvents.filter((e) => inDateRange(e.createdAt, range));

  return {
    live,
    period,
    periodLabel,
    months,
    from,
    to,
    excluded: { demoProducts: live ? demoIds.size : 0, seedSales: live ? s0.sales.length - s.sales.length : 0 },
    coverage: { salesRows: s.sales.length, firstSale: sortedDates[0] ?? null, lastSale: sortedDates[sortedDates.length - 1] ?? null, monthsWithSales, bySource: src },
    sales: {
      monthly,
      total,
      units,
      avgMonthly: monthsWithSales ? Math.round(total / monthsWithSales) : 0,
      recent3,
      prev3,
      growth3: change(recent3, prev3),
      recentLabel,
      partialMonth,
      grossMargin: marginRate({ costedRevenue: costed, grossProfit: gross }),
      costedShare: total > 0 ? costed / total : null,
    },
    channels: {
      byType: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, revenue]) => ({ type, revenue, share: share(revenue, total) })),
      top: top(byCh, (k) => chById.get(k)?.name ?? "삭제된 채널"),
      activeCount: new Set(sales.map((x) => x.channelId)).size,
    },
    b2b: { accounts: s.b2b.length, active: s.b2b.filter((b) => b.status === "거래중").length, cumulativeRevenue: s.b2b.reduce((a, b) => a + (b.totalRevenue || 0), 0) },
    exports: {
      regions: s.exports.length,
      cumulativeRevenue: s.exports.reduce((a, e) => a + (e.totalRevenue || 0), 0),
      list: [...s.exports].sort((a, b) => b.totalRevenue - a.totalRevenue).map((e) => ({ region: e.region, revenue: e.totalRevenue })),
    },
    products: { skus: s.products.length, published: s.products.filter((p) => p.isPublished).length, top: top(byProd, (k) => prodName.get(k) ?? "삭제된 상품") },
    customers: {
      finderSessions: sessions("finder_complete"),
      recommendationViews: sessions("recommendation_view"),
      outboundClicks: ev.filter((e) => e.eventType === "outbound_purchase_click").length,
      passportSaves: sessions("passport_save"),
      members: s.customerAccounts.length,
      purchasesRecorded: s.customerPurchases.length,
    },
    ax: {
      created: actions.length,
      done: aev.filter((e) => e.toStatus === "DONE").length,
      dismissed: aev.filter((e) => e.toStatus === "DISMISSED").length,
      open: s.actions.filter((a) => a.status === "NEW" || a.status === "REVIEWED" || a.status === "IN_PROGRESS").length,
      proofsRecorded: s.proofEvents.filter((p) => inDateRange(p.createdAt, range)).length,
      proofsConfirmed: s.proofEvents.filter((p) => p.resultConfirmedAt && inDateRange(p.resultConfirmedAt, range)).length,
      kpis: measureMoneyKpis(s, lastDays(28, today)),
      pilotStartedOn: s.org.pilotStartedOn ?? null,
      axOwner: s.org.axOwnerName ?? null,
    },
  };
}

/** CSV용 평탄화 — 구분·항목·기간·값·단위·근거 */
export function businessReportRows(r: BusinessReport) {
  const period = `${r.from}~${r.to}`;
  const rows: { 구분: string; 항목: string; 기간: string; 값: number | string; 단위: string; 근거: string }[] = [];
  const add = (구분: string, 항목: string, 값: number | string, 단위: string, 근거: string, 기간 = period) => rows.push({ 구분, 항목, 기간, 값, 단위, 근거 });
  for (const m of r.sales.monthly) add("월별 매출", m.month, m.revenue, "원", "sales_records 합계", m.month);
  add("매출", "기간 합계", r.sales.total, "원", "sales_records");
  add("매출", "판매 수량", r.sales.units, "개", "sales_records");
  add("매출", `최근 완료 3개월 (${r.sales.recentLabel})`, r.sales.recent3, "원", "sales_records — 진행 중인 달 제외");
  add("매출", "그 직전 3개월", r.sales.prev3, "원", "sales_records");
  if (r.sales.growth3 != null) add("매출", "최근 3개월 증감률", Math.round(r.sales.growth3 * 1000) / 10, "%", "(최근 완료 3개월 − 직전 3개월) ÷ 직전 3개월");
  if (r.sales.grossMargin != null) add("매출", "매출총이익률 (원가 입력 상품)", Math.round(r.sales.grossMargin * 1000) / 10, "%", `원가 입력 매출 비중 ${Math.round((r.sales.costedShare ?? 0) * 100)}%`);
  for (const c of r.channels.byType) add("채널 유형", c.type, c.revenue, "원", `비중 ${Math.round(c.share * 100)}%`);
  for (const c of r.channels.top) add("채널", c.name, c.revenue, "원", `비중 ${Math.round(c.share * 100)}%`);
  for (const p of r.products.top) add("상품", p.name, p.revenue, "원", `비중 ${Math.round(p.share * 100)}%`);
  add("B2B", "거래처 수 (거래중)", `${r.b2b.accounts} (${r.b2b.active})`, "곳", "b2b_accounts", "현재");
  add("B2B", "누적 거래액 (입력값)", r.b2b.cumulativeRevenue, "원", "b2b_accounts.total_revenue", "누적");
  for (const e of r.exports.list) add("수출", e.region, e.revenue, "원", "export_records.total_revenue (입력값)", "누적");
  add("고객 반응", "AI 추천 완료 세션", r.customers.finderSessions, "세션", "customer_events finder_complete");
  add("고객 반응", "구매처 이동", r.customers.outboundClicks, "건", "customer_events outbound_purchase_click");
  add("고객 반응", "회원 수", r.customers.members, "명", "customer_accounts", "현재");
  add("AX 운영", "RULE 감지 Action", r.ax.created, "건", "growth_actions");
  add("AX 운영", "완료 Action", r.ax.done, "건", "action_events DONE");
  add("AX 운영", "확정 Proof", r.ax.proofsConfirmed, "건", "proof_events RESULT_CONFIRMED");
  for (const k of r.ax.kpis) add("Money KPI (최근 28일)", k.name, k.current ?? "측정값 없음", k.unit, k.baseline ? `Baseline ${k.baseline.value}${k.unit} (${BASELINE_SOURCE_LABEL[k.baseline.source]})` : "Baseline 없음", "최근 28일");
  return rows;
}
