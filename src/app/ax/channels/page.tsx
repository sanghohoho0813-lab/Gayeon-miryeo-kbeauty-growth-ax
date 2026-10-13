"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Handshake, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, InsightCard, KpiCard, StatusBadge } from "@/components/ax/Cards";
import { RankBars } from "@/components/ax/RankBars";
import { Tabs } from "@/components/ax/Tabs";
import { EmptyState } from "@/components/ax/States";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { PermissionNotice } from "@/components/ax/PermissionNotice";
import { Settlements } from "@/components/ax/Settlements";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW, formatPct } from "@/lib/analytics";
import { formatDateKR } from "@/lib/date";
import { useNarrow } from "@/lib/use-narrow";

const TABS = [{ id: "analysis", label: "채널 분석" }, { id: "b2b", label: "B2B" }, { id: "export", label: "수출" }, { id: "settlements", label: "정산·미수금" }] as const;
type TabId = (typeof TABS)[number]["id"];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as TabId) || "analysis";
  const { role } = useSession();
  if (!can(role, "view_commercial")) return <PermissionNotice role={role} what="채널·B2B·수출" />;
  return (
    <div>
      <PageHeader title="채널·B2B·수출" description="판매 행(sales_records)으로 계산한 최근 4주 채널 성과, B2B·수출 현황, 거래처 정산·미수금입니다." actions={<DataFreshness />} />
      <Tabs tabs={TABS} value={tab} onChange={(t) => router.replace(`/ax/channels?tab=${t}`, { scroll: false })} />
      {tab === "analysis" && <Analysis />}
      {tab === "b2b" && <B2B />}
      {tab === "export" && <Export />}
      {tab === "settlements" && <Settlements />}
    </div>
  );
}
export default function ChannelsPage() {
  return <Suspense><Inner /></Suspense>;
}

function Analysis() {
  const m = useModel();
  const narrow = useNarrow();
  const rows = m.channelStats;
  if (rows.length === 0) return <EmptyState title="채널이 없습니다" action={<Link href="/ax/data?tab=channels" className="btn-primary">채널 등록</Link>} />;
  const withPrev = rows.filter((r) => r.prevRevenue > 0);
  const best = [...withPrev].sort((a, b) => b.growthRate - a.growthRate)[0];
  const lowProfit = [...rows].sort((a, b) => a.profitIndex - b.profitIndex)[0];
  const total = rows.reduce((a, r) => a + r.recentRevenue, 0);
  const byRevenue = [...rows].sort((a, b) => b.recentRevenue - a.recentRevenue);
  return (
    <div className="space-y-6">
      {/* 축 라벨이 겹치던 가로 막대 차트 → 이름·값을 글자로 쓰는 순위 막대 (PASS 14) */}
      <DataCard title="채널 비교 — 최근 4주 매출" subtitle={`합계 ${formatKRW(total)} · 큰 순서`}>
        <RankBars label="채널별 최근 4주 매출" items={rows.map((r) => ({ id: r.channel.id, label: r.channel.name, value: r.recentRevenue, prev: r.prevRevenue, valueText: formatKRW(r.recentRevenue), change: r.prevRevenue > 0 ? r.growthRate : null }))} />
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
        {narrow ? (
          <ul className="space-y-2.5" data-testid="channel-cards">
            {byRevenue.map((r) => (
              <li key={r.channel.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} data-channel-card={r.channel.id}>
                <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{r.channel.name}</span><StatusBadge tone="neutral">{r.channel.type}</StatusBadge></div>
                <dl className="tabular mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.88rem]">
                  <div><dt className="text-[0.76rem] text-ink-soft">최근 4주 매출</dt><dd className="font-semibold">{formatKRW(r.recentRevenue)} <span className="text-[0.78rem] font-normal text-ink-soft">({total > 0 ? Math.round((r.recentRevenue / total) * 100) : 0}%)</span></dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">이전 4주 대비</dt><dd className="font-semibold" style={{ color: r.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>{r.prevRevenue > 0 ? formatPct(r.growthRate) : "-"}</dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">판매 수량</dt><dd>{r.recentUnits.toLocaleString()}개</dd></div>
                  <div><dt className="text-[0.76rem] text-ink-soft">평균 할인율</dt><dd>{Math.round(r.channel.avgDiscountRate * 100)}%</dd></div>
                </dl>
                <p className="mt-2 text-[0.8rem] text-ink-soft">주요 SKU: {r.topProductIds.map((id) => m.productById.get(id)?.name ?? "-").join(", ") || "-"}</p>
              </li>
            ))}
          </ul>
        ) : (
        <div tabIndex={0} className="table-scroll">
          <table className="text-[0.93rem]">
            <thead>
              <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-2.5 pr-4 font-semibold">채널</th><th className="py-2.5 pr-4 font-semibold">유형</th><th className="py-2.5 pr-4 font-semibold">최근 4주 매출</th><th className="py-2.5 pr-4 font-semibold">이전 4주 대비</th><th className="py-2.5 pr-4 font-semibold">판매 수량</th><th className="py-2.5 pr-4 font-semibold">평균 할인율</th><th className="py-2.5 font-semibold">주요 SKU</th>
              </tr>
            </thead>
            <tbody>
              {byRevenue.map((r) => (
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
        )}
      </DataCard>
    </div>
  );
}

function B2B() {
  const m = useModel();
  const narrow = useNarrow();
  const list = m.snapshot.b2b;
  const tone = (s: string) => (s === "거래중" ? "success" : s === "협의중" ? "info" : "neutral") as "success";
  return (
    <div className="space-y-6">
      <div className="stagger grid grid-cols-2 gap-3 @md:gap-4 @3xl:grid-cols-3 [&>*:last-child]:col-span-2 @3xl:[&>*:last-child]:col-span-1">
        <KpiCard label="거래중 거래처" value={list.filter((b) => b.status === "거래중").length} format={(v) => `${Math.round(v)}곳`} icon={<Handshake size={22} />} iconTone="#148C8C" sub={`전체 ${list.length}곳`} />
        <KpiCard label="B2B 누적 매출" value={list.reduce((a, b) => a + b.totalRevenue, 0)} format={formatKRW} icon={<TrendingUp size={22} />} iconTone="#148C8C" sub="입력된 누적값" />
        <KpiCard label="14일 내 납품" value={list.filter((b) => b.nextDelivery && b.nextDelivery >= m.today && b.nextDelivery <= addDays(m.today, 14)).length} format={(v) => `${Math.round(v)}건`} icon={<Globe2 size={22} />} iconTone="#148C8C" href="/ax/growth" />
      </div>
      <DataCard title="B2B 거래처" action={<Link href="/ax/data?tab=b2b" className="btn-secondary !min-h-[40px] text-[0.86rem]">거래처 입력</Link>}>
        {list.length === 0 ? <EmptyState title="등록된 거래처가 없습니다" /> : narrow ? (
          <ul className="space-y-2.5" data-testid="b2b-cards">
            {list.map((b) => (
              <li key={b.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} data-b2b-card={b.id}>
                <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{b.name}</span><StatusBadge tone={tone(b.status)}>{b.status}</StatusBadge></div>
                <dl className="tabular mt-2 grid grid-cols-3 gap-x-2 text-[0.86rem]">
                  <div><dt className="text-[0.74rem] text-ink-soft">누적 매출</dt><dd className="font-semibold">{formatKRW(b.totalRevenue)}</dd></div>
                  <div><dt className="text-[0.74rem] text-ink-soft">최근 거래</dt><dd>{formatDateKR(b.lastOrderAt)}</dd></div>
                  <div><dt className="text-[0.74rem] text-ink-soft">다음 납품</dt><dd>{formatDateKR(b.nextDelivery)}</dd></div>
                </dl>
                <p className="mt-2 text-[0.8rem] text-ink-soft">주요 상품: {b.mainProductIds.map((id) => m.productById.get(id)?.name ?? "-").join(", ") || "-"}{b.note ? ` · ${b.note}` : ""}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div tabIndex={0} className="table-scroll">
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
  const narrow = useNarrow();
  const list = m.snapshot.exports;
  return (
    <div className="space-y-6">
      <DataCard title="권역별 수출 현황">
        {list.length === 0 ? <EmptyState title="수출 기록이 없습니다" /> : narrow ? (
          <ul className="space-y-2.5" data-testid="export-cards">
            {list.map((e) => (
              <li key={e.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} data-export-card={e.id}>
                <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{e.region}</span><span className="text-[0.8rem] text-ink-soft">{e.channel ?? "-"}</span></div>
                <dl className="tabular mt-2 grid grid-cols-3 gap-x-2 text-[0.86rem]">
                  <div><dt className="text-[0.74rem] text-ink-soft">누적 매출</dt><dd className="font-semibold">{formatKRW(e.totalRevenue)}</dd></div>
                  <div><dt className="text-[0.74rem] text-ink-soft">성장률</dt><dd className="font-semibold" style={{ color: (e.growthRate ?? 0) >= 0 ? "var(--success)" : "var(--danger)" }}>{formatPct(e.growthRate)}</dd></div>
                  <div><dt className="text-[0.74rem] text-ink-soft">최근 거래</dt><dd>{formatDateKR(e.lastOrderAt)}</dd></div>
                </dl>
                <p className="mt-2 text-[0.8rem] text-ink-soft">주요 제품: {e.mainProductIds.map((id) => m.productById.get(id)?.name ?? "-").join(", ") || "-"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div tabIndex={0} className="table-scroll">
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
