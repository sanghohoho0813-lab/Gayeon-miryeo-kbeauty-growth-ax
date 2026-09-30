"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Handshake, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, InsightCard, KpiCard, StatusBadge } from "@/components/ax/Cards";
import { ChannelBars } from "@/components/ax/TrendChart";
import { Tabs } from "@/components/ax/Tabs";
import { EmptyState } from "@/components/ax/States";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { PermissionNotice } from "@/components/ax/PermissionNotice";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW, formatPct } from "@/lib/analytics";
import { formatDateKR } from "@/lib/date";

const TABS = [{ id: "analysis", label: "채널 분석" }, { id: "b2b", label: "B2B" }, { id: "export", label: "수출" }] as const;
type TabId = (typeof TABS)[number]["id"];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as TabId) || "analysis";
  const { role } = useSession();
  if (!can(role, "view_commercial")) return <PermissionNotice role={role} what="채널·B2B·수출" />;
  return (
    <div>
      <PageHeader title="채널·B2B·수출" description="판매 행(sales_records)으로 계산한 최근 4주 채널 성과와 B2B·수출 현황입니다." actions={<DataFreshness />} />
      <Tabs tabs={TABS} value={tab} onChange={(t) => router.replace(`/ax/channels?tab=${t}`, { scroll: false })} />
      {tab === "analysis" && <Analysis />}
      {tab === "b2b" && <B2B />}
      {tab === "export" && <Export />}
    </div>
  );
}
export default function ChannelsPage() {
  return <Suspense><Inner /></Suspense>;
}

function Analysis() {
  const m = useModel();
  const rows = m.channelStats;
  if (rows.length === 0) return <EmptyState title="채널이 없습니다" action={<Link href="/ax/data?tab=channels" className="btn-primary">채널 등록</Link>} />;
  const withPrev = rows.filter((r) => r.prevRevenue > 0);
  const best = [...withPrev].sort((a, b) => b.growthRate - a.growthRate)[0];
  const lowProfit = [...rows].sort((a, b) => a.profitIndex - b.profitIndex)[0];
  return (
    <div className="space-y-6">
      <DataCard title="채널 비교 — 최근 4주 매출 (억 원)">
        <ChannelBars data={rows.map((r) => ({ name: r.channel.name, value: Math.round((r.recentRevenue / 100_000_000) * 100) / 100 }))} height={Math.max(200, rows.length * 44)} />
      </DataCard>
      {best && (
        <InsightCard
          title="AI Channel Insight"
          method="STATISTICAL"
          summary={`${best.channel.name}의 최근 4주 매출이 ${formatPct(best.growthRate)}로 가장 크게 늘었습니다. ${lowProfit.channel.name}은 평균 할인율 ${Math.round(lowProfit.channel.avgDiscountRate * 100)}%로 수익성 지수가 가장 낮아, 물량 배분 시 마진을 함께 검토하는 것이 좋습니다.`}
          evidence={[`${best.channel.name} 최근 4주 ${formatKRW(best.recentRevenue)} (이전 ${formatKRW(best.prevRevenue)})`, `${lowProfit.channel.name} 수익성 지수 ${Math.round(lowProfit.profitIndex * 100)} (할인율 반영 RULE)`]}
        />
      )}
      <DataCard title="채널별 상세">
        <div className="table-scroll">
          <table className="text-[0.93rem]">
            <thead>
              <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-2.5 pr-4 font-semibold">채널</th><th className="py-2.5 pr-4 font-semibold">유형</th><th className="py-2.5 pr-4 font-semibold">최근 4주 매출</th><th className="py-2.5 pr-4 font-semibold">이전 4주 대비</th><th className="py-2.5 pr-4 font-semibold">판매 수량</th><th className="py-2.5 pr-4 font-semibold">평균 할인율</th><th className="py-2.5 font-semibold">주요 SKU</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.channel.id} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3 pr-4 font-semibold">{r.channel.name}</td>
                  <td className="py-3 pr-4"><StatusBadge tone="neutral">{r.channel.type}</StatusBadge></td>
                  <td className="tabular py-3 pr-4 font-semibold">{formatKRW(r.recentRevenue)}</td>
                  <td className="tabular py-3 pr-4 font-semibold" style={{ color: r.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>{r.prevRevenue > 0 ? formatPct(r.growthRate) : "-"}</td>
                  <td className="tabular py-3 pr-4">{r.recentUnits.toLocaleString()}개</td>
                  <td className="tabular py-3 pr-4">{Math.round(r.channel.avgDiscountRate * 100)}%</td>
                  <td className="py-3 text-[0.86rem] text-ink-soft">{r.topProductIds.map((id) => m.productById.get(id)?.name ?? "-").join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}

function B2B() {
  const m = useModel();
  const list = m.snapshot.b2b;
  const tone = (s: string) => (s === "거래중" ? "success" : s === "협의중" ? "info" : "neutral") as "success";
  return (
    <div className="space-y-6">
      <div className="stagger grid gap-4 @md:grid-cols-3">
        <KpiCard label="거래중 거래처" value={list.filter((b) => b.status === "거래중").length} format={(v) => `${Math.round(v)}곳`} icon={<Handshake size={22} />} iconTone="#148C8C" sub={`전체 ${list.length}곳`} />
        <KpiCard label="B2B 누적 매출" value={list.reduce((a, b) => a + b.totalRevenue, 0)} format={formatKRW} icon={<TrendingUp size={22} />} iconTone="#148C8C" sub="입력된 누적값" />
        <KpiCard label="14일 내 납품" value={list.filter((b) => b.nextDelivery && b.nextDelivery >= m.today && b.nextDelivery <= addDays(m.today, 14)).length} format={(v) => `${Math.round(v)}건`} icon={<Globe2 size={22} />} iconTone="#148C8C" href="/ax/growth" />
      </div>
      <DataCard title="B2B 거래처" action={<Link href="/ax/data?tab=b2b" className="btn-secondary !min-h-[40px] text-[0.86rem]">거래처 입력</Link>}>
        {list.length === 0 ? <EmptyState title="등록된 거래처가 없습니다" /> : (
          <div className="table-scroll">
            <table className="text-[0.93rem]">
              <thead><tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}><th className="py-2.5 pr-4 font-semibold">거래처</th><th className="py-2.5 pr-4 font-semibold">상태</th><th className="py-2.5 pr-4 font-semibold">최근 거래</th><th className="py-2.5 pr-4 font-semibold">누적 매출</th><th className="py-2.5 pr-4 font-semibold">주요 상품</th><th className="py-2.5 pr-4 font-semibold">다음 납품</th><th className="py-2.5 font-semibold">비고</th></tr></thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 pr-4 font-semibold">{b.name}</td>
                    <td className="py-3 pr-4"><StatusBadge tone={tone(b.status)}>{b.status}</StatusBadge></td>
                    <td className="tabular py-3 pr-4">{formatDateKR(b.lastOrderAt)}</td>
                    <td className="tabular py-3 pr-4 font-semibold">{formatKRW(b.totalRevenue)}</td>
                    <td className="py-3 pr-4 text-[0.86rem] text-ink-soft">{b.mainProductIds.map((id) => m.productById.get(id)?.name ?? "-").join(", ")}</td>
                    <td className="tabular py-3 pr-4">{formatDateKR(b.nextDelivery)}</td>
                    <td className="py-3 text-[0.86rem] text-ink-soft">{b.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
}

function addDays(iso: string, d: number) {
  const x = new Date(`${iso}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
}

function Export() {
  const m = useModel();
  const list = m.snapshot.exports;
  return (
    <div className="space-y-6">
      <DataCard title="권역별 수출 현황">
        {list.length === 0 ? <EmptyState title="수출 기록이 없습니다" /> : (
          <div className="table-scroll">
            <table className="text-[0.93rem]">
              <thead><tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}><th className="py-2.5 pr-4 font-semibold">국가/권역</th><th className="py-2.5 pr-4 font-semibold">채널</th><th className="py-2.5 pr-4 font-semibold">누적 매출</th><th className="py-2.5 pr-4 font-semibold">성장률</th><th className="py-2.5 pr-4 font-semibold">최근 거래</th><th className="py-2.5 font-semibold">주요 제품</th></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 pr-4 font-semibold">{e.region}</td>
                    <td className="py-3 pr-4">{e.channel ?? "-"}</td>
                    <td className="tabular py-3 pr-4 font-semibold">{formatKRW(e.totalRevenue)}</td>
                    <td className="tabular py-3 pr-4 font-semibold" style={{ color: (e.growthRate ?? 0) >= 0 ? "var(--success)" : "var(--danger)" }}>{formatPct(e.growthRate)}</td>
                    <td className="tabular py-3 pr-4">{formatDateKR(e.lastOrderAt)}</td>
                    <td className="py-3 text-[0.86rem] text-ink-soft">{e.mainProductIds.map((id) => m.productById.get(id)?.name ?? "-").join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
      <p className="text-[0.86rem] text-ink-soft">관세·통관 관리는 이번 단계 범위 밖입니다 (NOT BUILDING). 권역별 성과 파악에 집중합니다.</p>
    </div>
  );
}
