"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Banknote, ChevronRight, Globe2, Heart, Lightbulb, ListChecks, Tags, Users } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { InfoTip } from "@/components/ax/InfoTip";
import { ActionRow, DataCard, InsightCard, KpiCard, MiniBar, SeeAllLink, StatusBadge } from "@/components/ax/Cards";
import { Tabs } from "@/components/ax/Tabs";
import { ChannelDonut } from "@/components/ax/ChannelDonut";
import { WeeklyTrend } from "@/components/ax/TrendChart";
import { ActionDrawer } from "@/components/ax/ActionDrawer";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { EmptyState } from "@/components/ax/States";
import { BriefingCard } from "@/components/ax/BriefingCard";
import { buildBriefing, type BriefTone } from "@/lib/briefing";
import { buildStartGuide, guideProgress } from "@/lib/start-guide";
import { CircleAlert, Rocket } from "lucide-react";
import { buildWeeklyRoutine, routineProgress } from "@/lib/weekly-routine";
import { change, marginRate, monthlySummary } from "@/lib/monthly";
import { targetProgress } from "@/lib/targets";
import { receivableAging, summarizeReceivables } from "@/lib/settlements";
import { AgingMiniBar } from "@/components/ax/AgingBar";
import { CalendarRange, Presentation, Wallet } from "lucide-react";
import { useModel } from "@/components/providers/DataProvider";
import { daysBetween, formatDateKR } from "@/lib/date";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { formatKRW, formatPct, matrixZone, OPEN_STATUSES, productInsight, weeklyRevenue } from "@/lib/analytics";
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
        <PageHeader title="오늘의 Growth Dashboard" actions={<DataFreshness />} />
        <EmptyState title="아직 등록된 상품이 없습니다" desc="첫 실제 상품 1~2개와 재고·판매를 입력하면 대시보드가 계산됩니다. 판매 파일 하나로 바로 시작할 수 있습니다." action={<Link href="/ax/data" className="btn-primary">판매 파일로 시작</Link>} />
      </>
    );
  }

  const openActions = m.actions.filter((a) => OPEN_STATUSES.includes(a.status));
  // 숫자 칸 추세선 — 최근 8주 매출 (뒤 4칸 합 = '최근 4주' 매출, 채널별 기준일 그대로 · PASS 30)
  const spark = useMemo(() => {
    const known = new Set(m.snapshot.channels.map((c) => c.id));
    const be = new Set(m.snapshot.channels.filter((c) => c.type === "B2B" || c.type === "수출").map((c) => c.id));
    return {
      revenue: weeklyRevenue(m.snapshot.sales, (s) => known.has(s.channelId), m.asOfFor),
      be: weeklyRevenue(m.snapshot.sales, (s) => be.has(s.channelId), m.asOfFor),
    };
  }, [m]);
  const sparkLabel = (name: string, d: number[]) => `${name} 최근 8주 추세: 8주 전 ${formatKRW(d[0])} → 이번 주 ${formatKRW(d[7])}`;

  /* 화면 순서 (PASS 12): 핵심 숫자 → 오늘 먼저 할 일 + 브리핑 → 분석(탭 하나) — 길이 절반, 판단에 필요한 것부터 */
  return (
    <div>
      <PageHeader title="오늘의 Growth Dashboard" description="핵심 숫자와 오늘 먼저 할 일. 분석 기준: 최근 4주 vs 이전 4주." actions={<><Link href="/ax/present" className="btn-secondary !min-h-[40px] !px-3 text-[0.86rem]" data-testid="open-present" aria-label="보고 모드"><Presentation size={16} aria-hidden /> 보고<span className="hidden @md:inline"> 모드</span></Link><DataFreshness /></>} />
      {daysBetween(m.salesAsOf, m.today) >= 2 && (
        <p className="-mt-2 mb-3 flex items-center gap-1 text-[0.86rem] text-ink-soft" data-testid="sales-asof">
          판매 입력 {formatDateKR(m.salesAsOf)}까지 — &lsquo;최근 4주&rsquo;는 그날까지로 계산
          <InfoTip text={<>입력 전 {daysBetween(m.salesAsOf, m.today)}일을 판매 0으로 보지 않도록 마지막 판매일까지로 계산합니다. 재고·착수 마감은 오늘 기준입니다.</>} label="판매 기준일 설명" />
        </p>
      )}
      <LaggingChannels />
      <TodayLine fin={fin} />

      {/* 핵심 숫자 7개를 한 패널로 묶음 — 최근 4주 | 이번 달 (PASS 21, D-075) */}
      <section aria-label="핵심 숫자" className="ax-card p-2 @md:p-2.5" data-tour="kpis">
        <div className="grid gap-y-1 @5xl:grid-cols-[minmax(0,4fr)_minmax(0,3fr)] @5xl:divide-x" style={{ borderColor: "var(--border)" }}>
        <div className="min-w-0">
        <div className="px-3 pt-1 text-[0.76rem] font-bold tracking-wide text-ink-soft">최근 4주<span className="font-semibold @md:hidden"> · 증감은 이전 4주 대비</span></div>
        <div className="grid grid-cols-2 @3xl:grid-cols-4">
          {fin ? (
            <KpiCard bare label="매출" value={kpis.revenue28} format={formatKRW} icon={<Banknote />} iconTone="#3B82F6" trend={kpis.revenueGrowth} trendLabel="이전 4주 대비" href="/ax/channels" spark={{ data: spark.revenue, label: sparkLabel("매출", spark.revenue) }} />
          ) : (
            <KpiCard bare label="처리할 Action" value={openActions.length} format={(v) => `${Math.round(v)}건`} icon={<ListChecks />} iconTone="#5965D8" sub="오늘의 Mission 포함" href="/ax/growth" />
          )}
          <KpiCard bare label="판매 중 SKU" value={kpis.totalSku} format={(v) => `${Math.round(v)}개`} icon={<Tags />} iconTone="#7C5CE7" sub={`성장 ${kpis.growingSku} · 부진 ${kpis.decliningSku}`} href="/ax/products" />
          <KpiCard bare label="재고 위험 SKU" value={kpis.stockRiskSku} format={(v) => `${Math.round(v)}개`} icon={<AlertTriangle />} iconTone="#D99016" sub={`과잉 ${kpis.overStockSku}개 별도`} href="/ax/products?tab=inventory" />
          {fin ? (
            <KpiCard bare label="B2B·수출" value={kpis.b2bExportRevenue28} format={formatKRW} icon={<Globe2 />} iconTone="#148C8C" trend={kpis.b2bExportGrowth} trendLabel="이전 4주 대비" href="/ax/channels?tab=b2b" spark={{ data: spark.be, label: sparkLabel("B2B·수출", spark.be) }} />
          ) : (
            <KpiCard bare label="Finder 완료 (7일)" value={customer.recent.finder_complete} format={(v) => `${Math.round(v)}건`} icon={<Users />} iconTone="#C76C86" sub="고객 화면 행동" href="/ax/customers" />
          )}
        </div>
        </div>
        {fin && <FinanceRow />}
        </div>
      </section>

      {can(role, "edit_master") && <StartGuideBanner />}

      <div className="mt-5 grid gap-5 @4xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] @4xl:items-start [&>*]:min-w-0">
        <DataCard
          title={<>오늘 먼저 할 일 <span className="ml-1 text-[0.86rem] font-semibold text-ink-soft">열린 Action {openActions.length}건</span></>}
          action={<SeeAllLink href="/ax/growth" label="AI Growth Center" />}
          tourId="missions"
        >
          {m.missions.length === 0 ? (
            <EmptyState title="지금 처리할 Action이 없습니다" desc="RULE이 새 위험·기회를 감지하면 이곳에 나타납니다." />
          ) : (
            <ol className="space-y-2.5">
              {m.missions.map((a, i) => <li key={a.id}><ActionRow action={a} rank={i + 1} onOpen={() => setOpen(a)} /></li>)}
            </ol>
          )}
          {openActions.length > m.missions.length && (
            <Link href="/ax/growth" className="mt-3 inline-flex min-h-[40px] items-center gap-1 rounded-lg px-1.5 text-[0.88rem] font-semibold text-ink-soft hover:bg-surface-muted hover:text-ink">
              나머지 {openActions.length - m.missions.length}건은 AI Growth Center에서 <ChevronRight size={15} aria-hidden />
            </Link>
          )}
        </DataCard>
        <BriefingCard limit={5} />
      </div>

      <DashboardAnalysis fin={fin} />

      <Link href="/ax/why" className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-1 py-2 text-[0.9rem] text-ink-soft hover:text-ink">
        <Lightbulb size={17} style={{ color: "var(--grp-ax)" }} aria-hidden />
        <span><b className="font-semibold">왜 이 AX를 만들었나요?</b> 기획의도 — 흩어진 데이터 → 판단 → 실행 → 실증</span>
        <ChevronRight size={15} aria-hidden />
      </Link>

      <ActionDrawer action={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* 분석 — 제품 성장·재고 위험·채널·고객 행동을 탭 하나로 (마지막으로 본 탭을 이 브라우저에 기억) */
type AnalysisTab = "growth" | "stock" | "channel" | "customer";
const ANALYSIS_KEY = "miryeo-dash-analysis";
function DashboardAnalysis({ fin }: { fin: boolean }) {
  const m = useModel();
  const tabs = [
    { id: "growth" as const, label: "제품 성장" },
    { id: "stock" as const, label: "재고 위험" },
    ...(fin ? [{ id: "channel" as const, label: "채널 매출" }] : []),
    { id: "customer" as const, label: "고객 행동" },
  ];
  const [tab, setTabState] = useState<AnalysisTab>(() => {
    try { const v = localStorage.getItem(ANALYSIS_KEY) as AnalysisTab | null; return v && tabs.some((t) => t.id === v) ? v : "growth"; } catch { return "growth"; }
  });
  const setTab = (t: AnalysisTab) => { setTabState(t); try { localStorage.setItem(ANALYSIS_KEY, t); } catch { /* 저장 안 돼도 동작 */ } };
  const current = tabs.some((t) => t.id === tab) ? tab : "growth";
  const products = m.snapshot.products;
  const { customer } = m;
  const ranking = products.map((p) => ({ p, mm: m.metrics.get(p.id)! })).sort((a, b) => b.mm.growthRate - a.mm.growthRate).slice(0, 5);
  const zones: Record<string, typeof ranking> = { "성장·부족": [], 안정: [], "느린 판매": [], 과잉재고: [] };
  products.forEach((p) => { const mm = m.metrics.get(p.id)!; zones[matrixZone(mm)].push({ p, mm }); });
  const spotlight = ranking[0];
  const insight = productInsight(spotlight.mm);
  const donut = m.channelStats.filter((c) => c.recentRevenue > 0).map((c) => ({ name: c.channel.name, value: c.recentRevenue }));

  return (
    <section className="ax-card mt-5 min-w-0 p-4 @md:p-5 @3xl:p-6" aria-labelledby="dash-analysis-title" data-testid="dash-analysis">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="dash-analysis-title" className="text-[1.08rem] font-bold @md:text-[1.15rem] @3xl:text-[1.25rem]">분석 <span className="text-[0.86rem] font-semibold text-ink-soft">최근 4주</span></h2>
      </div>
      <Tabs tabs={tabs} value={current} onChange={setTab} className="mb-4" panelId="dash-analysis-panel" label="분석 보기" />
      <div id="dash-analysis-panel" role="tabpanel" aria-labelledby={`dash-analysis-panel-tab-${current}`} tabIndex={0} className="outline-none">
        {current === "growth" && (
          <div className="grid gap-5 @4xl:grid-cols-2 [&>*]:min-w-0">
            <div>
              <div className="mb-2 flex items-center justify-between"><h3 className="font-bold">SKU 성장 랭킹 (4주)</h3><SeeAllLink href="/ax/products" /></div>
              <ol className="space-y-2">
                {ranking.map(({ p, mm }, i) => (
                  <li key={p.id}>
                    <Link href={`/ax/products?tab=inventory&p=${encodeURIComponent(p.id)}`} className="row-hover flex items-center gap-3 rounded-xl border p-2.5 @md:p-3" style={{ borderColor: "var(--border)" }}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.9rem] font-bold" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block text-[0.8rem] text-ink-soft">{p.sku}</span>
                      </span>
                      <span className="tabular inline-flex shrink-0 items-center gap-0.5 font-bold" style={{ color: mm.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
                        <ArrowUpRight size={16} className={mm.growthRate < 0 ? "rotate-90" : ""} aria-hidden />
                        {formatPct(mm.growthRate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              <InsightCard title={`AI Product Insight — ${spotlight.p.name}`} summary={insight.summary} evidence={insight.evidence} compact action={<Link href="/ax/growth" className="btn-primary !min-h-[42px] text-[0.9rem]">Growth Center에서 처리</Link>} />
              <div>
                <h3 className="mb-1 text-[0.95rem] font-bold">{spotlight.p.name} 판매 추세 (8주)</h3>
                <WeeklyTrend weekly={spotlight.mm.weekly} />
              </div>
            </div>
          </div>
        )}
        {current === "stock" && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.88rem] text-ink-soft">판매속도 × 재고일수 기준 분류 (RULE). 성장·부족 구간이 가장 시급합니다.</p>
              <SeeAllLink href="/ax/products?tab=inventory" label="재고 상세" />
            </div>
            <div className="grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-4 [&>*]:min-w-0">
              {([["성장·부족", "danger", "판매 빠름 · 재고 부족"], ["안정", "success", "판매·재고 균형"], ["느린 판매", "warning", "판매 둔화"], ["과잉재고", "info", "소진 전략 필요"]] as const).map(([zone, tone, desc]) => (
                <div key={zone} className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between gap-2"><StatusBadge tone={tone}>{zone} {zones[zone].length}</StatusBadge><span className="text-[0.76rem] text-ink-soft">{desc}</span></div>
                  <ul className="mt-2.5 space-y-1.5">
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
          </>
        )}
        {current === "channel" && fin && (
          donut.length === 0 ? <EmptyState title="최근 4주 채널 매출이 없습니다" /> : (
            <div className="grid gap-6 @4xl:grid-cols-5 [&>*]:min-w-0">
              <div className="@4xl:col-span-3">
                <div className="mb-2 flex items-center justify-between"><h3 className="font-bold">채널별 매출 (4주)</h3><SeeAllLink href="/ax/channels" /></div>
                <ChannelDonut data={donut} centerLabel="최근 4주" />
              </div>
              <div className="@4xl:col-span-2">
                <h3 className="mb-3 font-bold">채널 수익성 지수</h3>
                <ul className="space-y-3">
                  {m.channelStats.map((c) => (
                    <li key={c.channel.id}>
                      <div className="mb-1 flex justify-between text-[0.88rem]"><span className="truncate">{c.channel.name}</span><span className="tabular font-semibold">{Math.round(c.profitIndex * 100)}</span></div>
                      <MiniBar ratio={c.profitIndex / 0.68} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[0.78rem] text-ink-soft">지수 = 기준 마진 68% − 채널 평균 할인율 (RULE, 실제 원가 연동 전 참고값)</p>
              </div>
            </div>
          )
        )}
        {current === "customer" && (
          <div className="grid gap-4 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
            <div>
              <div className="mb-2 flex items-center justify-between"><h3 className="font-bold">고객 행동 → AX <span className="text-[0.84rem] font-semibold text-ink-soft">최근 7일</span></h3><SeeAllLink href="/ax/customers" /></div>
              <div className="grid grid-cols-2 gap-2.5 @3xl:grid-cols-4">
                {[
                  ["Finder 완료", customer.recent.finder_complete],
                  ["Passport 저장", customer.recent.passport_save],
                  ["찜 추가", customer.recent.wishlist_add],
                  ["구매채널 이동", customer.recent.outbound_purchase_click],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-surface-muted p-3">
                    <div className="text-[0.8rem] text-ink-soft">{l}</div>
                    <div className="text-[1.35rem] font-bold">{(v as number).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="self-end">
              <div className="flex items-center justify-between rounded-xl border p-3 text-[0.9rem]" style={{ borderColor: "var(--border)" }}>
                <span className="flex items-center gap-1.5"><Heart size={15} style={{ color: "#C76C86" }} aria-hidden /> Finder → Passport 전환</span>
                <span className="tabular font-bold">{customer.conversionRecent == null ? "-" : formatPct(customer.conversionRecent, false)}</span>
              </div>
              <p className="mt-2 text-[0.8rem] text-ink-soft">
                {customer.liveCount > 0 ? `실제 발생 이벤트 ${customer.liveCount}건 포함` : "아직 실제 발생 이벤트 없음"}{m.snapshot.customerEvents.some((e) => e.origin === "seed") ? " · 나머지는 DEMO 기준값" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** 경영 수치 — 이번 달 매출·매출총이익·받을 돈 (계약 별지 제1호 ①) */
function FinanceRow() {
  const m = useModel();
  const [prev, cur] = monthlySummary(m.snapshot.sales, m.snapshot.products, m.snapshot.channels, m.today, 2);
  const tp = targetProgress(cur.month, cur.revenue, m.snapshot.monthlyTargets ?? [], m.today);
  const mr = marginRate(cur);
  const rs = summarizeReceivables(m.snapshot.settlements, m.today);
  const day = Number(m.today.slice(8, 10));
  return (
    <div className="min-w-0 border-t pt-1 @5xl:border-t-0 @5xl:pl-1 @5xl:pt-0" style={{ borderColor: "var(--border)" }}>
    <div className="px-3 pt-1 text-[0.76rem] font-bold tracking-wide text-ink-soft">이번 달 ({day}일까지)</div>
    <div className="grid grid-cols-2 @3xl:grid-cols-3 [&>*:last-child]:col-span-2 @3xl:[&>*:last-child]:col-span-1" data-testid="finance-row">
      <KpiCard bare label="이번 달 매출" value={cur.revenue} format={formatKRW} icon={<CalendarRange />} iconTone="#2563EB" sub={tp.rate != null ? `목표 대비 ${Math.round(tp.rate * 100)}% · 월 경과 ${Math.round(tp.elapsed * 100)}%` : `지난달 전체 ${formatKRW(prev.revenue)} · 목표 미입력`} href="/ax/monthly" />
      <KpiCard bare label="매출총이익" value={cur.grossProfit} format={formatKRW} icon={<Banknote />} iconTone="#16A34A" sub={mr == null ? "원가 미입력" : <>이익률 {Math.round(mr * 100)}%<span className="hidden @md:inline"> · 원가 입력 제품 기준</span></>} trend={change(cur.grossProfit, prev.grossProfit) != null && day >= 28 ? change(cur.grossProfit, prev.grossProfit) : null} href="/ax/monthly" />
      <KpiCard bare label="받을 돈 (미수금)" value={rs.outstanding} format={formatKRW} icon={<Wallet />} iconTone={rs.overdueCount ? "#DC2626" : "#0F766E"} sub={rs.overdueCount ? `연체 ${rs.overdueCount}건 · ${formatKRW(rs.overdueAmount)}` : `${rs.openCount}건 · 연체 없음`} href="/ax/channels?tab=settlements" foot={<AgingMiniBar rows={receivableAging(m.snapshot.settlements, m.today)} />} />
    </div>
    </div>
  );
}

/* 오늘의 한 줄 (PASS 30, D-096) — 좁은 화면에서는 브리핑이 '오늘 먼저 할 일' 아래로 내려가 첫 화면에 결론이 없다.
   브리핑 헤드라인(같은 RULE 문장)을 맨 위에 한 줄로 두고 누르면 브리핑으로 이동. 넓은 화면은 브리핑이 첫 화면에 보이므로 숨김 */
const LINE_TONE: Record<BriefTone, { bg: string; fg: string }> = {
  risk: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  warn: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  good: { bg: "var(--success-soft)", fg: "var(--success)" },
  info: { bg: "var(--surface)", fg: "var(--text-secondary)" },
};
function TodayLine({ fin }: { fin: boolean }) {
  const m = useModel();
  const b = buildBriefing(m, { financial: fin });
  if (b.lines.length === 0) return null;
  const order: BriefTone[] = ["risk", "warn", "good", "info"];
  const tone = [...b.lines].sort((x, y) => order.indexOf(x.tone) - order.indexOf(y.tone))[0].tone;
  const t = LINE_TONE[tone];
  return (
    <a href="#briefing" className="mb-3 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 @4xl:hidden" style={{ background: t.bg, borderColor: `color-mix(in srgb, ${t.fg} 22%, transparent)` }} data-testid="today-line" data-tone={tone}>
      {tone === "risk" || tone === "warn" ? <CircleAlert size={18} className="shrink-0" style={{ color: t.fg }} aria-hidden /> : <Lightbulb size={18} className="shrink-0" style={{ color: t.fg }} aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.74rem] font-bold" style={{ color: t.fg }}>오늘의 한 줄</span>
        <span className="block text-[0.95rem] font-bold leading-snug">{b.headline}</span>
      </span>
      <span className="shrink-0 text-[0.8rem] font-semibold text-ink-soft">브리핑 <ChevronRight size={14} className="inline rotate-90" aria-hidden /></span>
    </a>
  );
}

/** 실데이터 시작 가이드 진행 — 필수 단계가 끝나면 숨김 */
function StartGuideBanner() {
  const m = useModel();
  const p = guideProgress(buildStartGuide(m.snapshot, m.today));
  if (p.done >= p.total) return <RoutineBanner />;
  return (
    <Link href="/ax/start" data-testid="start-banner" className="ax-card ax-card-hover mt-3 flex items-center gap-3 px-3.5 py-2.5">
      <Rocket size={18} className="shrink-0" style={{ color: "var(--primary)" }} aria-hidden />
      <span className="min-w-0 flex-1 text-[0.92rem]">
        <b>실데이터 시작 가이드 {p.done}/{p.total}</b>
        <span className="text-ink-soft"> · 다음: {p.next?.title}</span>
      </span>
      <span className="hidden h-2 w-40 shrink-0 overflow-hidden rounded-full bg-surface-muted @md:block" aria-hidden><span className="block h-full rounded-full" style={{ width: `${Math.round(p.ratio * 100)}%`, background: "var(--primary)" }} /></span>
    </Link>
  );
}

/* 시작 가이드를 마친 뒤: 주간 운영 점검 요약 (모두 정상이면 숨김) */
function RoutineBanner() {
  const m = useModel();
  const r = routineProgress(buildWeeklyRoutine(m.snapshot, m.today, { allowPractice: !isLive }));
  if (r.done >= r.total) return null;
  return (
    <Link href="/ax/start#routine" data-testid="routine-banner" className="ax-card ax-card-hover mt-3 flex items-center gap-3 px-3.5 py-2.5">
      <CircleAlert size={18} className="shrink-0" style={{ color: "var(--warning)" }} aria-hidden />
      <span className="min-w-0 flex-1 text-[0.92rem]">
        <b>이번 주 운영 점검 {r.done}/{r.total}</b>
        <span className="text-ink-soft"> · 확인 필요: {r.next?.title} — {r.next?.detail}</span>
      </span>
    </Link>
  );
}

/* 몰아서 입력하는 채널 안내 (PASS 27, R-24) — 채널 설정 '판매 입력 주기'가 주·월이고 조직 기준일보다 2일 이상 앞에서 끊었거나, 주기를 넘겨 입력이 없을 때만 */
function LaggingChannels() {
  const m = useModel();
  const md = (iso: string) => formatDateKR(iso).slice(5);
  const items = m.snapshot.channels
    .filter((c) => c.active)
    .map((c) => ({ c, a: m.channelAsOf.get(c.id) }))
    .filter((x): x is { c: typeof x.c; a: NonNullable<typeof x.a> } => !!x.a && (x.a.stale || x.a.lagDays >= 2));
  if (items.length === 0) return null;
  return (
    <p className="-mt-2 mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.86rem] text-ink-soft" data-testid="channel-asof">
      <span>몰아서 입력하는 채널은 각자 입력 기준일까지:</span>
      {items.map(({ c, a }) => (
        <span key={c.id} className="tabular" style={a.stale ? { color: "var(--warning)", fontWeight: 600 } : undefined}>
          {c.name} {a.stale ? `입력 확인 (마지막 ${a.lastSale ? md(a.lastSale) : "-"})` : `${md(a.asOf)}까지`}
        </span>
      ))}
      <InfoTip text={<>데이터 관리 &gt; 채널에서 &lsquo;판매 입력 주기&rsquo;를 주 1회·월 1회로 정한 채널은, 아직 올리지 않은 날을 판매 0으로 보지 않도록 그 채널의 마지막 입력 기준으로 최근 4주를 계산합니다. 주기를 넘겨 입력이 없으면 &lsquo;입력 확인&rsquo;으로 표시합니다.</>} label="채널별 판매 기준일 설명" />
      <Link href="/ax/channels" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>채널 보기</Link>
    </p>
  );
}
