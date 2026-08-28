"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Globe2,
  Tags,
} from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ActionCard, DataCard, InsightCard, KpiCard, SeeAllLink, StatusBadge } from "@/components/ax/Cards";
import { ChannelDonut } from "@/components/ax/ChannelDonut";
import { WeeklyTrend } from "@/components/ax/TrendChart";
import { useAxData } from "@/lib/useAxData";
import { formatKRW, formatPct, matrixZone, productInsight, sum } from "@/lib/analytics";

export default function DashboardPage() {
  const data = useAxData();
  const { kpis, actions, channels, products, metrics } = data;

  // SKU 성장 랭킹 Top 5
  const ranking = [...products]
    .map((p) => ({ p, m: metrics.get(p.id)! }))
    .sort((a, b) => b.m.growthRate - a.m.growthRate)
    .slice(0, 5);

  // 재고 위험 Matrix 분류
  const zones: Record<string, typeof ranking> = {
    "성장·부족": [],
    안정: [],
    "느린 판매": [],
    과잉재고: [],
  };
  for (const p of products) {
    const m = metrics.get(p.id)!;
    zones[matrixZone(m)].push({ p, m });
  }

  // 가장 주목할 제품의 AI Insight (성장률 1위 + 재고 위험)
  const spotlight = ranking[0];
  const spotlightInsight = productInsight(spotlight.p, spotlight.m);
  const spotlightWeekly = Array.from({ length: 8 }, (_, i) =>
    sum(data.sales.filter((s) => s.productId === spotlight.p.id).map((r) => r.weeklyUnits[i] ?? 0))
  );

  const donutData = channels.map((c) => ({ name: c.name, value: c.monthRevenue }));

  return (
    <div className="reveal">
      <PageHeader
        title="오늘의 MIRYEO Growth Dashboard"
        description="매출·재고·채널·생산 흐름을 한눈에 확인하고, 지금 가장 먼저 해야 할 일을 확인합니다."
        actions={<StatusBadge tone="neutral">DEMO DATA · 2025.05 기준</StatusBadge>}
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="이번 달 매출"
          value={formatKRW(kpis.monthRevenue)}
          icon={<Banknote size={22} />}
          trend={kpis.monthGrowthRate}
          trendLabel="전월 대비"
          sub="목표 대비 92%"
        />
        <KpiCard
          label="판매 중 SKU"
          value={`${kpis.totalSku}개`}
          icon={<Tags size={22} />}
          sub={
            <>
              성장 {kpis.growingSku} · 부진 {kpis.decliningSku}
            </>
          }
        />
        <KpiCard
          label="재고 위험"
          value={`${kpis.stockRiskSku}개 SKU`}
          icon={<AlertTriangle size={22} />}
          tone={kpis.stockRiskSku > 0 ? "danger" : "default"}
          sub={
            <>
              품절 임박 {kpis.stockRiskSku} · 과잉 {kpis.overStockSku}
            </>
          }
        />
        <KpiCard
          label="이번 달 B2B·수출"
          value={formatKRW(kpis.b2bExportRevenue)}
          icon={<Globe2 size={22} />}
          trend={kpis.b2bExportGrowthRate}
          trendLabel="전월 대비"
          sub="B2B·수출 채널 합산"
        />
      </div>

      {/* 오늘의 Action + 채널별 매출 */}
      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <DataCard
          title={
            <>
              오늘의 Action{" "}
              <span className="ml-1 align-middle text-[0.9rem] font-semibold text-ink-soft">
                {actions.length}건
              </span>
            </>
          }
          action={<SeeAllLink href="/ax/growth" label="전체 Action 보기" />}
          className="xl:col-span-3"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {actions.slice(0, 4).map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </div>
        </DataCard>

        <DataCard title="채널별 매출" action={<SeeAllLink href="/ax/channels" />} className="xl:col-span-2">
          <ChannelDonut data={donutData} centerLabel="이번 달 매출" />
        </DataCard>
      </div>

      {/* SKU 랭킹 + 재고 Matrix */}
      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <DataCard title="SKU 성장 랭킹" action={<SeeAllLink href="/ax/products" label="전체 랭킹 보기" />} className="xl:col-span-2">
          <ol className="space-y-2.5">
            {ranking.map(({ p, m }, i) => (
              <li key={p.id}>
                <Link
                  href="/ax/products"
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-surface-muted"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[0.95rem] font-bold"
                    style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="text-[0.82rem] text-ink-soft">{p.sku}</div>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-0.5 font-bold"
                    style={{ color: m.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}
                  >
                    <ArrowUpRight size={16} className={m.growthRate < 0 ? "rotate-90" : ""} aria-hidden />
                    {formatPct(m.growthRate)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </DataCard>

        <DataCard
          title="재고 위험 Matrix"
          action={<SeeAllLink href="/ax/products?tab=inventory" label="상세 보기" />}
          className="xl:col-span-3"
        >
          <p className="mb-4 text-[0.9rem] text-ink-soft">
            판매속도와 재고일수 기준으로 SKU를 분류합니다. 성장·부족 구간이 가장 시급합니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { zone: "성장·부족", tone: "danger", desc: "판매 빠름 · 재고 부족" },
                { zone: "안정", tone: "success", desc: "판매·재고 균형" },
                { zone: "느린 판매", tone: "warning", desc: "판매 둔화 관찰 필요" },
                { zone: "과잉재고", tone: "info", desc: "재고 소진 전략 필요" },
              ] as const
            ).map(({ zone, tone, desc }) => (
              <div key={zone} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <StatusBadge tone={tone}>{zone}</StatusBadge>
                  <span className="text-[0.82rem] text-ink-soft">{desc}</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {zones[zone].length === 0 && (
                    <li className="text-[0.88rem] text-ink-soft">해당 SKU 없음</li>
                  )}
                  {zones[zone].map(({ p, m }) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-[0.92rem]">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-ink-soft">
                        {Number.isFinite(m.daysOfStock) ? `${Math.round(m.daysOfStock)}일분` : "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      {/* AI Growth Insight */}
      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <InsightCard
            summary={`${spotlight.p.name} — ${spotlightInsight.summary}`}
            evidence={spotlightInsight.evidence}
            action={
              <Link href="/ax/growth" className="btn-primary text-[0.95rem]">
                상세 분석 보기
              </Link>
            }
          />
        </div>
        <DataCard title={`${spotlight.p.name} 판매 추세 (최근 8주)`} className="xl:col-span-2">
          <WeeklyTrend weekly={spotlightWeekly} />
        </DataCard>
      </div>
    </div>
  );
}
