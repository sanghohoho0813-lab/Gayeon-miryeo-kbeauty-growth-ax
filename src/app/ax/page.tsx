"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Banknote, Globe2, Heart, Lightbulb, ListChecks, Tags, Users } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ActionSummaryCard, DataCard, InsightCard, KpiCard, MiniBar, SeeAllLink, StatusBadge } from "@/components/ax/Cards";
import { ChannelDonut } from "@/components/ax/ChannelDonut";
import { WeeklyTrend } from "@/components/ax/TrendChart";
import { ActionDrawer } from "@/components/ax/ActionDrawer";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { EmptyState } from "@/components/ax/States";
import { BriefingCard } from "@/components/ax/BriefingCard";
import { buildStartGuide, guideProgress } from "@/lib/start-guide";
import { CircleAlert, Rocket } from "lucide-react";
import { buildWeeklyRoutine, routineProgress } from "@/lib/weekly-routine";
import { change, marginRate, monthlySummary } from "@/lib/monthly";
import { summarizeReceivables } from "@/lib/settlements";
import { CalendarRange, Wallet } from "lucide-react";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW, formatPct, matrixZone, OPEN_STATUSES, productInsight } from "@/lib/analytics";
import type { GrowthAction } from "@/lib/types";

export default function DashboardPage() {
  const m = useModel();
  const { role } = useSession();
  const [open, setOpen] = useState<GrowthAction | null>(null);
  const fin = can(role, "view_financials");
  const { kpis, customer } = m;
  const products = m.snapshot.products;

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="오늘의 MIRYEO Growth Dashboard" actions={<DataFreshness />} />
        <EmptyState title="아직 등록된 상품이 없습니다" desc="첫 실제 상품 1~2개와 재고·판매를 입력하면 대시보드가 계산됩니다." action={<Link href="/ax/data" className="btn-primary">데이터 입력 시작</Link>} />
      </>
    );
  }

  const ranking = products.map((p) => ({ p, mm: m.metrics.get(p.id)! })).sort((a, b) => b.mm.growthRate - a.mm.growthRate).slice(0, 5);
  const zones: Record<string, typeof ranking> = { "성장·부족": [], 안정: [], "느린 판매": [], 과잉재고: [] };
  products.forEach((p) => { const mm = m.metrics.get(p.id)!; zones[matrixZone(mm)].push({ p, mm }); });
  const spotlight = ranking[0];
  const insight = productInsight(spotlight.mm);
  const openActions = m.actions.filter((a) => OPEN_STATUSES.includes(a.status));
  const donut = m.channelStats.filter((c) => c.recentRevenue > 0).map((c) => ({ name: c.channel.name, value: c.recentRevenue }));

  return (
    <div>
      <PageHeader title="오늘의 MIRYEO Growth Dashboard" description="매출·재고·채널·고객 흐름을 확인하고, 지금 먼저 할 일을 처리합니다. 분석 기준: 최근 4주 vs 이전 4주." actions={<DataFreshness />} />

      <div className="stagger grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-4" data-tour="kpis">
        {fin ? (
          <KpiCard label="최근 4주 매출" value={kpis.revenue28} format={formatKRW} icon={<Banknote size={22} />} iconTone="#3B82F6" trend={kpis.revenueGrowth} trendLabel="이전 4주 대비" sub="목표: 미설정" href="/ax/channels" />
        ) : (
          <KpiCard label="처리할 Action" value={openActions.length} format={(v) => `${Math.round(v)}건`} icon={<ListChecks size={22} />} iconTone="#5965D8" sub="오늘의 Mission 포함" href="/ax/growth" />
        )}
        <KpiCard label="판매 중 SKU" value={kpis.totalSku} format={(v) => `${Math.round(v)}개`} icon={<Tags size={22} />} iconTone="#7C5CE7" sub={`성장 ${kpis.growingSku} · 부진 ${kpis.decliningSku}`} href="/ax/products" />
        <KpiCard label="재고 위험 SKU" value={kpis.stockRiskSku} format={(v) => `${Math.round(v)}개`} icon={<AlertTriangle size={22} />} iconTone="#D99016" sub={`과잉 ${kpis.overStockSku}개 별도`} href="/ax/products?tab=inventory" />
        {fin ? (
          <KpiCard label="B2B·수출 (4주)" value={kpis.b2bExportRevenue28} format={formatKRW} icon={<Globe2 size={22} />} iconTone="#148C8C" trend={kpis.b2bExportGrowth} trendLabel="이전 4주 대비" href="/ax/channels?tab=b2b" />
        ) : (
          <KpiCard label="Finder 완료 (7일)" value={customer.recent.finder_complete} format={(v) => `${Math.round(v)}건`} icon={<Users size={22} />} iconTone="#C76C86" sub="고객 화면 행동" href="/ax/customers" />
        )}
      </div>

      {fin && <FinanceRow />}

      {can(role, "edit_master") && <StartGuideBanner />}

      <div className="mt-6"><BriefingCard /></div>

      <div className="mt-6">
        <DataCard title={<>오늘 먼저 할 일 <span className="ml-1 text-[0.88rem] font-semibold text-ink-soft">열린 Action {openActions.length}건</span></>} action={<SeeAllLink href="/ax/growth" label="AI Growth Center" />} tourId="missions">
          {m.missions.length === 0 ? (
            <EmptyState title="지금 처리할 Action이 없습니다" desc="RULE이 새 위험·기회를 감지하면 이곳에 나타납니다." />
          ) : (
            <div className="stagger grid gap-5 pt-2 @3xl:grid-cols-3">
              {m.missions.map((a, i) => <ActionSummaryCard key={a.id} action={a} rank={i + 1} onOpen={() => setOpen(a)} />)}
            </div>
          )}
        </DataCard>

      </div>

      <div className="mt-6 grid gap-6 @4xl:grid-cols-5">
        <DataCard title="고객 행동 → AX" action={<SeeAllLink href="/ax/customers" />} className="@4xl:col-span-2">
          <p className="text-[0.88rem] text-ink-soft">MIRYEO AI Beauty에서 들어온 최근 7일 행동</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              ["Finder 완료", customer.recent.finder_complete],
              ["Passport 저장", customer.recent.passport_save],
              ["찜 추가", customer.recent.wishlist_add],
              ["구매채널 이동", customer.recent.outbound_purchase_click],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-surface-muted p-3">
                <div className="text-[0.8rem] text-ink-soft">{l}</div>
                <div className="tabular text-[1.35rem] font-bold">{(v as number).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border p-3 text-[0.9rem]" style={{ borderColor: "var(--border)" }}>
            <span className="flex items-center gap-1.5"><Heart size={15} style={{ color: "#C76C86" }} aria-hidden /> Finder → Passport 전환</span>
            <span className="tabular font-bold">{customer.conversionRecent == null ? "-" : formatPct(customer.conversionRecent, false)}</span>
          </div>
          <p className="mt-2 text-[0.8rem] text-ink-soft">
            {customer.liveCount > 0 ? `실제 발생 이벤트 ${customer.liveCount}건 포함` : "아직 실제 발생 이벤트 없음"}{m.snapshot.customerEvents.some((e) => e.origin === "seed") ? " · 나머지는 DEMO 기준값" : ""}
          </p>
        </DataCard>
        <DataCard title="재고 위험 Matrix" action={<SeeAllLink href="/ax/products?tab=inventory" label="재고 상세" />} className="@4xl:col-span-3">
          <p className="mb-4 text-[0.88rem] text-ink-soft">판매속도 × 재고일수 기준 분류 (RULE). 성장·부족 구간이 가장 시급합니다.</p>
          <div className="grid gap-3 @xl:grid-cols-2">
            {([["성장·부족", "danger", "판매 빠름 · 재고 부족"], ["안정", "success", "판매·재고 균형"], ["느린 판매", "warning", "판매 둔화"], ["과잉재고", "info", "소진 전략 필요"]] as const).map(([zone, tone, desc]) => (
              <div key={zone} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-2"><StatusBadge tone={tone}>{zone}</StatusBadge><span className="text-[0.78rem] text-ink-soft">{desc}</span></div>
                <ul className="mt-3 space-y-1.5">
                  {zones[zone].length === 0 && <li className="text-[0.86rem] text-ink-soft">해당 SKU 없음</li>}
                  {zones[zone].map(({ p, mm }) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-[0.9rem]">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="tabular shrink-0 text-ink-soft">{Number.isFinite(mm.daysOfStock) ? `${Math.round(mm.daysOfStock)}일분` : "-"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      <div className="mt-6 grid gap-6 @4xl:grid-cols-5">
        <DataCard title="SKU 성장 랭킹 (4주)" action={<SeeAllLink href="/ax/products" />} className="@4xl:col-span-2">
          <ol className="space-y-2.5">
            {ranking.map(({ p, mm }, i) => (
              <li key={p.id}>
                <Link href="/ax/products" className="row-hover flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.9rem] font-bold" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="text-[0.8rem] text-ink-soft">{p.sku}</div>
                  </div>
                  <span className="tabular inline-flex shrink-0 items-center gap-0.5 font-bold" style={{ color: mm.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
                    <ArrowUpRight size={16} className={mm.growthRate < 0 ? "rotate-90" : ""} aria-hidden />
                    {formatPct(mm.growthRate)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </DataCard>

        <div className="space-y-6 @4xl:col-span-3">
        <div>
          <InsightCard title={`AI Product Insight — ${spotlight.p.name}`} summary={insight.summary} evidence={insight.evidence} action={<Link href="/ax/growth" className="btn-primary text-[0.92rem]">Growth Center에서 처리</Link>} />
        </div>
        <DataCard title={`${spotlight.p.name} 판매 추세 (8주)`} >
          <WeeklyTrend weekly={spotlight.mm.weekly} />
        </DataCard>
        </div>
      </div>

      {fin && donut.length > 0 && (
        <div className="mt-6 grid gap-6 @4xl:grid-cols-5">
          <DataCard title="채널별 매출 (4주)" action={<SeeAllLink href="/ax/channels" />} className="@4xl:col-span-3">
            <ChannelDonut data={donut} centerLabel="최근 4주" />
          </DataCard>
          <DataCard title="채널 수익성 지수" className="@4xl:col-span-2">
            <ul className="space-y-3">
              {m.channelStats.map((c) => (
                <li key={c.channel.id}>
                  <div className="mb-1 flex justify-between text-[0.88rem]"><span className="truncate">{c.channel.name}</span><span className="tabular font-semibold">{Math.round(c.profitIndex * 100)}</span></div>
                  <MiniBar ratio={c.profitIndex / 0.68} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.78rem] text-ink-soft">지수 = 기준 마진 68% − 채널 평균 할인율 (RULE, 실제 원가 연동 전 참고값)</p>
          </DataCard>
        </div>
      )}

      <Link href="/ax/why" className="ax-card ax-card-hover mt-6 flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--grp-ax) 15%, #fff)", color: "var(--grp-ax)" }} aria-hidden><Lightbulb size={21} /></span>
        <span className="min-w-[12rem] flex-1"><span className="block font-bold">왜 이 AX를 만들었나요?</span><span className="text-[0.9rem] text-ink-soft">기획의도 — 흩어진 데이터 → 판단 → 실행 → 실증</span></span>
        <span className="btn-secondary !min-h-[40px] text-[0.88rem]">기획의도 보기</span>
      </Link>

      <ActionDrawer action={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** 경영 수치 — 이번 달 매출·매출총이익·받을 돈 (계약 별지 제1호 ①) */
function FinanceRow() {
  const m = useModel();
  const [prev, cur] = monthlySummary(m.snapshot.sales, m.snapshot.products, m.snapshot.channels, m.today, 2);
  const mr = marginRate(cur);
  const rs = summarizeReceivables(m.snapshot.settlements, m.today);
  const day = Number(m.today.slice(8, 10));
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 @md:grid-cols-3" data-testid="finance-row">
      <KpiCard label={`이번 달 매출 (${day}일까지)`} value={cur.revenue} format={formatKRW} icon={<CalendarRange size={22} />} iconTone="#2563EB" sub={`지난달 전체 ${formatKRW(prev.revenue)}`} href="/ax/monthly" />
      <KpiCard label="이번 달 매출총이익" value={cur.grossProfit} format={formatKRW} icon={<Banknote size={22} />} iconTone="#16A34A" sub={mr == null ? "원가 미입력" : `이익률 ${Math.round(mr * 100)}% · 원가 입력 제품 기준`} trend={change(cur.grossProfit, prev.grossProfit) != null && day >= 28 ? change(cur.grossProfit, prev.grossProfit) : null} href="/ax/monthly" />
      <KpiCard label="받을 돈 (미수금)" value={rs.outstanding} format={formatKRW} icon={<Wallet size={22} />} iconTone={rs.overdueCount ? "#DC2626" : "#0F766E"} sub={rs.overdueCount ? `연체 ${rs.overdueCount}건 · ${formatKRW(rs.overdueAmount)}` : `${rs.openCount}건 · 연체 없음`} href="/ax/channels?tab=settlements" />
    </div>
  );
}

/** 실데이터 시작 가이드 진행 — 필수 단계가 끝나면 숨김 */
function StartGuideBanner() {
  const m = useModel();
  const p = guideProgress(buildStartGuide(m.snapshot, m.today));
  if (p.done >= p.total) return <RoutineBanner />;
  return (
    <Link href="/ax/start" data-testid="start-banner" className="ax-card ax-card-hover mt-4 flex flex-wrap items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} aria-hidden><Rocket size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">실데이터 시작 가이드 {p.done}/{p.total}</span>
        <span className="text-[0.88rem] text-ink-soft">다음 단계: {p.next?.title}</span>
      </span>
      <span className="h-2 w-40 overflow-hidden rounded-full bg-surface-muted" aria-hidden><span className="block h-full rounded-full" style={{ width: `${Math.round(p.ratio * 100)}%`, background: "var(--primary)" }} /></span>
    </Link>
  );
}

/* 시작 가이드를 마친 뒤: 주간 운영 점검 요약 (모두 정상이면 숨김) */
function RoutineBanner() {
  const m = useModel();
  const r = routineProgress(buildWeeklyRoutine(m.snapshot, m.today));
  if (r.done >= r.total) return null;
  return (
    <Link href="/ax/start#routine" data-testid="routine-banner" className="ax-card ax-card-hover mt-4 flex flex-wrap items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--warning-soft)", color: "var(--warning)" }} aria-hidden><CircleAlert size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">이번 주 운영 점검 {r.done}/{r.total}</span>
        <span className="text-[0.88rem] text-ink-soft">확인 필요: {r.next?.title} — {r.next?.detail}</span>
      </span>
    </Link>
  );
}
