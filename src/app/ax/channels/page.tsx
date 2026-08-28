"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, InsightCard, KpiCard, StatusBadge } from "@/components/ax/Cards";
import { ChannelBars } from "@/components/ax/TrendChart";
import { useAxData } from "@/lib/useAxData";
import { computeChannelMetrics, formatKRW, formatPct } from "@/lib/analytics";
import { Globe2, Handshake, TrendingUp } from "lucide-react";

const TABS = [
  { id: "analysis", label: "채널 분석" },
  { id: "b2b", label: "B2B" },
  { id: "export", label: "수출" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ChannelsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || "analysis";

  return (
    <div className="reveal">
      <PageHeader
        title="채널·B2B·수출"
        description="채널별 성과와 B2B·수출 흐름을 비교하고, 수익성 관점에서 채널 전략을 판단합니다."
        actions={<StatusBadge tone="neutral">DEMO DATA</StatusBadge>}
      />

      <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl border bg-surface p-1.5" style={{ borderColor: "var(--border)" }} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => router.replace(`/ax/channels?tab=${t.id}`, { scroll: false })}
            className="min-h-[46px] shrink-0 rounded-xl px-5 text-[0.98rem] font-semibold transition-colors"
            style={tab === t.id ? { background: "var(--primary)", color: "#fff" } : { color: "var(--text-secondary)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "analysis" && <AnalysisTab />}
      {tab === "b2b" && <B2BTab />}
      {tab === "export" && <ExportTab />}
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense>
      <ChannelsPageInner />
    </Suspense>
  );
}

/* ---------- 채널 분석 ---------- */
function AnalysisTab() {
  const { channels, products } = useAxData();
  const rows = channels.map((c) => ({ c, m: computeChannelMetrics(c) }));
  const best = [...rows].sort((a, b) => b.m.growthRate - a.m.growthRate)[0];
  const lowProfit = [...rows].sort((a, b) => a.m.profitIndex - b.m.profitIndex)[0];

  return (
    <div className="space-y-6">
      <DataCard title="채널 비교 (이번 달 매출)">
        <ChannelBars
          data={channels.map((c) => ({ name: c.name, value: Math.round((c.monthRevenue / 100_000_000) * 10) / 10 }))}
          height={260}
        />
      </DataCard>

      <InsightCard
        title="AI Channel Insight"
        summary={`${best.c.name}의 성장률이 ${formatPct(best.m.growthRate)}로 가장 높습니다. 반면 ${lowProfit.c.name}은 평균 할인율 ${Math.round(lowProfit.c.avgDiscountRate * 100)}%로 매출 대비 수익성이 낮아, 물량 배분 시 마진 구조를 함께 검토하는 것이 좋습니다.`}
        evidence={[
          `${best.c.name} 이번 달 매출 ${formatKRW(best.c.monthRevenue)} (${formatPct(best.m.growthRate)})`,
          `${lowProfit.c.name} 수익성 지수 ${Math.round(lowProfit.m.profitIndex * 100)} (할인율 반영, Demo 규칙)`,
        ]}
      />

      <DataCard title="채널별 상세">
        <div className="table-scroll">
          <table className="text-[0.95rem]">
            <thead>
              <tr className="border-b text-left text-[0.85rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-3 pr-4 font-semibold">채널</th>
                <th className="py-3 pr-4 font-semibold">유형</th>
                <th className="py-3 pr-4 font-semibold">이번 달 매출</th>
                <th className="py-3 pr-4 font-semibold">성장률</th>
                <th className="py-3 pr-4 font-semibold">주문/판매</th>
                <th className="py-3 pr-4 font-semibold">객단가</th>
                <th className="py-3 pr-4 font-semibold">평균 할인율</th>
                <th className="py-3 font-semibold">주요 SKU</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, m }) => (
                <tr key={c.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3.5 pr-4 font-semibold">{c.name}</td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge tone="neutral">{c.type}</StatusBadge>
                  </td>
                  <td className="py-3.5 pr-4 font-semibold">{formatKRW(c.monthRevenue)}</td>
                  <td className="py-3.5 pr-4 font-semibold" style={{ color: m.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {formatPct(m.growthRate)}
                  </td>
                  <td className="py-3.5 pr-4">{c.orders.toLocaleString()}건</td>
                  <td className="py-3.5 pr-4">{formatKRW(Math.round(m.avgOrderValue))}</td>
                  <td className="py-3.5 pr-4">{Math.round(c.avgDiscountRate * 100)}%</td>
                  <td className="py-3.5 text-[0.88rem] text-ink-soft">
                    {c.topSkus.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}

/* ---------- B2B ---------- */
function B2BTab() {
  const { b2bAccounts, products } = useAxData();
  const active = b2bAccounts.filter((b) => b.status === "거래중").length;
  const total = b2bAccounts.reduce((a, b) => a + b.totalRevenue, 0);
  const nextDeliveries = b2bAccounts.filter((b) => b.nextDelivery);

  const tone = (s: string) => (s === "거래중" ? "success" : s === "협의중" ? "info" : "neutral");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="거래중 거래처" value={`${active}곳`} icon={<Handshake size={22} />} sub={`전체 ${b2bAccounts.length}곳`} />
        <KpiCard label="B2B 누적 매출" value={formatKRW(total)} icon={<TrendingUp size={22} />} sub="전체 거래처 합산" />
        <KpiCard label="예정 납품" value={`${nextDeliveries.length}건`} icon={<Globe2 size={22} />} sub="이번 달 납품 일정" />
      </div>

      <DataCard title="B2B 거래처">
        <div className="table-scroll">
          <table className="text-[0.95rem]">
            <thead>
              <tr className="border-b text-left text-[0.85rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-3 pr-4 font-semibold">거래처</th>
                <th className="py-3 pr-4 font-semibold">상태</th>
                <th className="py-3 pr-4 font-semibold">최근 거래</th>
                <th className="py-3 pr-4 font-semibold">누적 매출</th>
                <th className="py-3 pr-4 font-semibold">주요 상품</th>
                <th className="py-3 pr-4 font-semibold">다음 납품</th>
                <th className="py-3 font-semibold">비고</th>
              </tr>
            </thead>
            <tbody>
              {b2bAccounts.map((b) => (
                <tr key={b.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3.5 pr-4 font-semibold">{b.name}</td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge tone={tone(b.status) as "success"}>{b.status}</StatusBadge>
                  </td>
                  <td className="py-3.5 pr-4">{b.lastOrderAt}</td>
                  <td className="py-3.5 pr-4 font-semibold">{formatKRW(b.totalRevenue)}</td>
                  <td className="py-3.5 pr-4 text-[0.88rem] text-ink-soft">
                    {b.mainProducts.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}
                  </td>
                  <td className="py-3.5 pr-4">{b.nextDelivery ?? "-"}</td>
                  <td className="py-3.5 text-[0.88rem] text-ink-soft">{b.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}

/* ---------- 수출 ---------- */
function ExportTab() {
  const { exports: exportRecords, products } = useAxData();
  const total = exportRecords.reduce((a, b) => a + b.totalRevenue, 0);
  const growing = exportRecords.filter((e) => e.growthRate > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="수출 누적 매출" value={formatKRW(total)} icon={<Globe2 size={22} />} sub="전체 권역 합산" />
        <KpiCard label="수출 권역" value={`${exportRecords.length}개`} icon={<TrendingUp size={22} />} sub={`성장 권역 ${growing}개`} />
        <KpiCard
          label="최고 성장 권역"
          value={[...exportRecords].sort((a, b) => b.growthRate - a.growthRate)[0].region}
          icon={<TrendingUp size={22} />}
          sub={formatPct([...exportRecords].sort((a, b) => b.growthRate - a.growthRate)[0].growthRate) + " (전분기 대비)"}
        />
      </div>

      <DataCard title="권역별 수출 현황">
        <div className="table-scroll">
          <table className="text-[0.95rem]">
            <thead>
              <tr className="border-b text-left text-[0.85rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-3 pr-4 font-semibold">국가/권역</th>
                <th className="py-3 pr-4 font-semibold">채널</th>
                <th className="py-3 pr-4 font-semibold">누적 매출</th>
                <th className="py-3 pr-4 font-semibold">성장률</th>
                <th className="py-3 pr-4 font-semibold">최근 거래</th>
                <th className="py-3 font-semibold">주요 제품</th>
              </tr>
            </thead>
            <tbody>
              {exportRecords.map((e) => (
                <tr key={e.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3.5 pr-4 font-semibold">{e.region}</td>
                  <td className="py-3.5 pr-4">{e.channel}</td>
                  <td className="py-3.5 pr-4 font-semibold">{formatKRW(e.totalRevenue)}</td>
                  <td className="py-3.5 pr-4 font-semibold" style={{ color: e.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {formatPct(e.growthRate)}
                  </td>
                  <td className="py-3.5 pr-4">{e.lastOrderAt}</td>
                  <td className="py-3.5 text-[0.88rem] text-ink-soft">
                    {e.mainProducts.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      <p className="text-[0.88rem] text-ink-soft">
        관세·통관 관리 등 세부 수출 운영 기능은 2차 범위입니다. 현재는 권역별 성과 파악에 집중합니다.
      </p>
    </div>
  );
}
