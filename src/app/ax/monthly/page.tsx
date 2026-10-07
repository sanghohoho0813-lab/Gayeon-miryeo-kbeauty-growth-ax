"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, KpiCard } from "@/components/ax/Cards";
import { EmptyState } from "@/components/ax/States";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { PermissionNotice } from "@/components/ax/PermissionNotice";
import { ExportButton } from "@/components/ax/ExportButton";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW, formatPct, formatPrice } from "@/lib/analytics";
import { change, marginRate, monthLabel, monthlySummary, type Breakdown } from "@/lib/monthly";
import { summarizeReceivables } from "@/lib/settlements";

/* 월별 실적 — 계약 별지 제1호 ① "월별·판매채널별·제품별 매출, 이익" */
function Inner() {
  const m = useModel();
  const { role } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  if (!can(role, "view_financials")) return <PermissionNotice role={role} what="월별 매출·이익" />;
  const rows = monthlySummary(m.snapshot.sales, m.snapshot.products, m.snapshot.channels, m.today, 12);
  const current = rows[rows.length - 1].month;
  const sel = rows.find((r) => r.month === params.get("m")) ?? rows[rows.length - 1];
  const idx = rows.indexOf(sel);
  const prev = idx > 0 ? rows[idx - 1] : null;
  const rs = summarizeReceivables(m.snapshot.settlements, m.today);
  const hasData = rows.some((r) => r.revenue > 0);
  const mr = marginRate(sel);
  const coverage = sel.revenue > 0 ? sel.costedRevenue / sel.revenue : null;

  return (
    <div>
      <PageHeader title="월별 실적" description="최근 12개월 월별 매출·매출총이익과 채널별·제품별 구성입니다. 이익은 원가가 입력된 제품만 계산하며 판관비는 포함하지 않습니다." actions={<DataFreshness />} />
      {!hasData ? <EmptyState title="판매 데이터가 없습니다" action={<Link href="/ax/data" className="btn-primary">판매 입력</Link>} /> : (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="월 선택">
            {rows.map((r) => (
              <button key={r.month} role="radio" aria-checked={r.month === sel.month} onClick={() => router.replace(`/ax/monthly?m=${r.month}`, { scroll: false })} className="pressable tabular min-h-[38px] rounded-xl border px-3 text-[0.84rem] font-semibold" style={r.month === sel.month ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {monthLabel(r.month)}{r.month === current ? " (진행 중)" : ""}
              </button>
            ))}
          </div>

          <div className="stagger grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-4" data-testid="monthly-kpis">
            <KpiCard label={`${monthLabel(sel.month)} 매출`} value={sel.revenue} format={formatKRW} trend={prev ? change(sel.revenue, prev.revenue) : null} trendLabel="전월 대비" />
            <KpiCard label="매출총이익" value={sel.grossProfit} format={formatKRW} sub={coverage == null ? "-" : `원가 입력 매출 ${Math.round(coverage * 100)}% 기준`} trend={prev ? change(sel.grossProfit, prev.grossProfit) : null} trendLabel="전월 대비" />
            <KpiCard label="매출총이익률" value={(mr ?? 0) * 100} format={(v) => (mr == null ? "원가 미입력" : `${v.toFixed(1)}%`)} sub="(매출 − 수량×원가) ÷ 매출" />
            <KpiCard label="받을 돈 (현재)" value={rs.outstanding} format={formatKRW} sub={rs.overdueCount ? `연체 ${rs.overdueCount}건 ${formatKRW(rs.overdueAmount)}` : "연체 없음"} href="/ax/channels?tab=settlements" />
          </div>

          <DataCard className="mt-6" title="12개월 매출·매출총이익" action={<ExportButton name="월별_실적" file="monthly" rows={rows.map((r) => ({ 월: monthLabel(r.month), 매출: r.revenue, 판매수량: r.units, 매출총이익: r.grossProfit, 원가입력매출: r.costedRevenue, "이익률(%)": marginRate(r) == null ? "" : Math.round((marginRate(r) ?? 0) * 1000) / 10 }))} />}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows.map((r) => ({ month: monthLabel(r.month).slice(2), 매출: Math.round(r.revenue / 1e6), 매출총이익: Math.round(r.grossProfit / 1e6) }))} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: "0.75rem", fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: "0.85rem" }} formatter={(v, n) => [`${Number(v).toLocaleString()}백만 원`, n]} />
                  <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                  <Bar dataKey="매출" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Line dataKey="매출총이익" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[0.78rem] text-ink-soft">단위 백만 원 · 이번 달은 진행 중 · 판매 행의 날짜(주간 집계는 집계일) 기준</p>
          </DataCard>

          <div className="mt-6 grid grid-cols-1 gap-6 @4xl:grid-cols-2">
            <BreakdownTable file={`monthly_channels_${sel.month}`} title={`${monthLabel(sel.month)} 채널별`} rows={sel.byChannel} total={sel.revenue} testId="monthly-channels" />
            <BreakdownTable file={`monthly_products_${sel.month}`} title={`${monthLabel(sel.month)} 제품별`} rows={sel.byProduct} total={sel.revenue} testId="monthly-products" />
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownTable({ title, file, rows, total, testId }: { title: string; file: string; rows: Breakdown[]; total: number; testId: string }) {
  return (
    <DataCard title={title} action={<ExportButton name={title.replace(/[ .]/g, "_")} file={file} rows={rows.map((r) => ({ 이름: r.name, 매출: r.revenue, "비중(%)": total ? Math.round((r.revenue / total) * 1000) / 10 : 0, 판매수량: r.units, 매출총이익: r.profit ?? "" }))} />}>
      {rows.length === 0 ? <p className="text-[0.9rem] text-ink-soft">해당 월 판매가 없습니다.</p> : (
        <div tabIndex={0} className="table-scroll">
          <table className="!min-w-[480px] text-[0.9rem]" data-testid={testId}>
            <thead><tr className="border-b text-left text-[0.8rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>{["이름", "매출", "비중", "수량", "매출총이익"].map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2.5 pr-3 font-semibold">{r.name}</td>
                  <td className="tabular py-2.5 pr-3">{formatPrice(r.revenue)}</td>
                  <td className="tabular py-2.5 pr-3 text-ink-soft">{total ? formatPct(r.revenue / total, false) : "-"}</td>
                  <td className="tabular py-2.5 pr-3">{r.units.toLocaleString()}</td>
                  <td className="tabular py-2.5 pr-3">{r.profit == null ? <span className="text-ink-soft">원가 미입력</span> : formatPrice(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataCard>
  );
}

export default function MonthlyPage() {
  return <Suspense><Inner /></Suspense>;
}
