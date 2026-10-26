"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Radio } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ActionRow, DataCard, KpiCard, MiniBar } from "@/components/ax/Cards";
import { DailyEvents } from "@/components/ax/TrendChart";
import { ActionDrawer } from "@/components/ax/ActionDrawer";
import { CustomerMembers } from "@/components/ax/CustomerMembers";
import { AiReadyButton, AI_SPECS } from "@/components/ax/AiReady";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { EmptyState } from "@/components/ax/States";
import { useModel } from "@/components/providers/DataProvider";
import { actionWaitDays, customerFunnel, EVENT_LABEL, formatPct, INTEREST_GROWTH_MIN, INTEREST_THRESHOLD } from "@/lib/analytics";
import { relativeKR } from "@/lib/date";
import type { GrowthAction } from "@/lib/types";
import { useNarrow } from "@/lib/use-narrow";
import { Tabs } from "@/components/ax/Tabs";
import { useHashTab } from "@/lib/use-hash-tab";

/* 고객 인사이트 — 핵심 숫자 아래를 탭 4개로 묶음 (PASS 21, D-075) */
const TABS = [
  { id: "behavior", label: "고객 행동" },
  { id: "interest", label: "제품 관심·Action" },
  { id: "live", label: "실시간 이벤트" },
  { id: "members", label: "회원·재구매" },
] as const;
type CustTab = (typeof TABS)[number]["id"];
const TAB_IDS = TABS.map((t) => t.id);

/* 고객 전환 흐름 (PASS 32, D-104) — 최근 7일 고객 화면 행동을 4단계로: Finder 시작 → 완료 → Passport 저장 → 구매채널 이동.
   각 단계 = 행동 수(사람 수 아님). 단계 사이 % = 앞 단계 대비, 옆 증감 = 이전 7일 대비. 새 숫자 없이 기존 이벤트 집계만 */
function CustomerFunnel() {
  const m = useModel();
  const steps = customerFunnel(m.customer);
  const top = Math.max(1, ...steps.map((x) => x.n));
  const first = steps[0].n;
  const last = steps[steps.length - 1].n;
  return (
    <DataCard title="고객 전환 흐름 (최근 7일)" info="고객 화면에서 일어난 행동 수입니다(사람 수가 아닌 행동 횟수). 단계 사이 %는 앞 단계 대비, 오른쪽 증감은 이전 7일 대비입니다." testId="customer-funnel">
      {first === 0 && last === 0 ? <EmptyState title="최근 7일 고객 행동이 없습니다" desc="고객 화면에서 Finder·Passport·구매채널 이동이 생기면 계산됩니다." /> : (
        <>
          <ol className="grid gap-2 @3xl:grid-cols-4 @3xl:gap-3">
            {steps.map((st, i) => {
              const { rate, delta } = st;
              return (
                <li key={st.key} className="min-w-0" data-funnel-step={st.key}>
                  {i > 0 && (
                    <p className="tabular mb-1 flex items-center gap-1 text-[0.78rem] font-semibold text-ink-soft @3xl:hidden" aria-hidden>
                      <span>↓</span> {rate == null ? "-" : `${Math.round(rate * 100)}%`} 이어짐
                    </p>
                  )}
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.84rem] font-semibold text-ink-soft">{i + 1}. {st.label}</span>
                      {delta != null && <span className="tabular text-[0.76rem] font-semibold" style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)" }}>{delta >= 0 ? "+" : ""}{Math.round(delta * 100)}%</span>}
                    </div>
                    <div className="tabular mt-1 text-[1.35rem] font-extrabold leading-tight">{st.n.toLocaleString()}<span className="ml-0.5 text-[0.85rem] font-semibold text-ink-soft">건</span></div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden><div className="h-full rounded-full" style={{ width: `${Math.max(3, (st.n / top) * 100)}%`, background: `color-mix(in srgb, var(--chart-1) ${100 - i * 18}%, var(--chart-3))` }} /></div>
                    <p className="tabular mt-1.5 text-[0.76rem] text-ink-soft">{i === 0 ? `이전 7일 ${st.prev.toLocaleString()}건` : <>앞 단계의 <b className="text-ink">{rate == null ? "-" : `${Math.round(rate * 100)}%`}</b> · 이전 7일 {st.prev.toLocaleString()}건</>}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[0.86rem] text-ink-soft" data-testid="funnel-summary">Finder 시작 {first.toLocaleString()}건 중 구매채널 이동 <b className="tabular text-ink">{last.toLocaleString()}건</b>{first > 0 ? ` (${Math.round((last / first) * 100)}%)` : ""} — 실제 구매 여부는 외부 쇼핑몰에서 일어나므로 이 화면에서는 알 수 없습니다.</p>
        </>
      )}
    </DataCard>
  );
}

export default function CustomersPage() {
  const m = useModel();
  const [open, setOpen] = useState<GrowthAction | null>(null);
  const narrow = useNarrow();
  const c = m.customer;
  const interestActions = m.actions.filter((a) => a.category === "고객 관심" || a.category === "재구매");
  const maxScore = Math.max(1, ...c.productInterest.map((p) => p.recentScore));
  const concernTotal = c.concerns.reduce((s, x) => s + x.count, 0);
  const [tab, setTab] = useHashTab<CustTab>(TAB_IDS, {}, "behavior");

  return (
    <div>
      <PageHeader
        title="고객 인사이트"
        description="MIRYEO AI Beauty에서 고객이 한 행동(익명 세션)이 이곳에 쌓이고, 관심이 오르면 Growth Action으로 이어집니다 (Customer Event Bridge)."
        actions={<><AiReadyButton spec={AI_SPECS.customer} /><DataFreshness /></>}
      />

      <div className="stagger grid grid-cols-2 gap-3 @md:gap-4 @4xl:grid-cols-4" data-tour="customer-bridge">
        <KpiCard label="Finder 시작 (7일)" value={c.recent.finder_start} format={(v) => `${Math.round(v)}건`} sub={`이전 7일 ${c.prev.finder_start}`} />
        <KpiCard label="Finder 완료 (7일)" value={c.recent.finder_complete} format={(v) => `${Math.round(v)}건`} sub={`이전 7일 ${c.prev.finder_complete}`} />
        <KpiCard label="Passport 저장 (7일)" value={c.recent.passport_save} format={(v) => `${Math.round(v)}건`} sub="핵심 전환 행동" />
        <KpiCard label="Finder → Passport 전환" value={(c.conversionRecent ?? 0) * 100} format={(v) => (c.conversionRecent == null ? "-" : `${v.toFixed(1)}%`)} sub={`이전 7일 ${formatPct(c.conversionPrev, false)} · Baseline 미확정`} href="/ax/reports" />
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-4 mt-5" panelId="cust-panel" label="고객 인사이트 보기" />
      <div id="cust-panel" role="tabpanel" aria-labelledby={`cust-panel-tab-${tab}`}>
      {tab === "behavior" && (
      <>
      <CustomerFunnel />
      <div className="mt-5 grid gap-5 @4xl:grid-cols-5">
        <DataCard title="일별 고객 행동 (14일)" className="@4xl:col-span-3">
          <DailyEvents data={c.daily} />
          <div className="mt-2 flex flex-wrap gap-3 text-[0.8rem] text-ink-soft">
            {[["var(--chart-1)", "Finder 완료"], ["var(--chart-3)", "Passport 저장"], ["var(--chart-5)", "찜"], ["var(--chart-4)", "구매채널 이동"]].map(([col, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: col }} aria-hidden />{l}</span>
            ))}
          </div>
        </DataCard>
        <DataCard title="선택된 피부 고민 (7일)" className="@4xl:col-span-2" info="Finder에서 고객이 고른 피부 고민입니다. 상품기획·콘텐츠 우선순위의 근거가 되는 자사 보유 고객 데이터입니다.">
          {c.concerns.length === 0 ? <EmptyState title="아직 Finder 완료 데이터가 없습니다" /> : (
            <ul className="space-y-3">
              {c.concerns.map((x) => (
                <li key={x.concern}>
                  <div className="mb-1 flex justify-between text-[0.9rem]"><span>{x.concern}</span><span className="tabular font-semibold">{x.count}회 · {Math.round((x.count / concernTotal) * 100)}%</span></div>
                  <MiniBar ratio={x.count / c.concerns[0].count} color="var(--chart-3)" />
                </li>
              ))}
            </ul>
          )}
        </DataCard>
      </div>
      </>
      )}

      {tab === "interest" && (
      <div className="grid gap-5 @5xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @5xl:items-start">
      <DataCard title="제품별 관심점수 (7일 vs 이전 7일)" info={<>점수 = 조회×0.2 + 찜×2 + 추천노출×1 + Passport 저장×3 + 구매채널 이동×2 (RULE). {INTEREST_THRESHOLD}점 이상이면서 +{Math.round(INTEREST_GROWTH_MIN * 100)}% 이상이면 &lsquo;고객 관심 상승&rsquo; Action을 만듭니다.</>}>
        {c.productInterest.length === 0 ? <EmptyState title="관심 데이터가 없습니다" desc="고객 화면에서 제품 조회·찜·Finder가 발생하면 계산됩니다." /> : narrow ? (
          <ul className="space-y-2" data-testid="interest-cards">
            {c.productInterest.map((pi) => {
              const p = m.productById.get(pi.productId);
              const act = m.actions.find((a) => a.ruleKey === `interest:${pi.productId}` && a.status !== "DISMISSED");
              const over = pi.recentScore >= INTEREST_THRESHOLD;
              return (
                <li key={pi.productId} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }} data-interest-card={pi.productId}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-semibold leading-snug">{p?.name ?? pi.productId}</span>
                    <b className="tabular shrink-0 text-[0.9rem]" style={{ color: (pi.growth ?? 1) >= 0 ? "var(--success)" : "var(--danger)" }}>{pi.growth == null ? "신규" : formatPct(pi.growth)}</b>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2"><span className="tabular w-9 shrink-0 font-bold">{pi.recentScore}</span><MiniBar ratio={pi.recentScore / maxScore} color={over ? "var(--chart-3)" : "var(--chart-5)"} /></div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.8rem] text-ink-soft">
                    <span className="tabular">이전 {pi.prevScore} · Passport {pi.recentCounts.passport_save ?? 0} · 찜 {pi.recentCounts.wishlist_add ?? 0} · 이동 {pi.recentCounts.outbound_purchase_click ?? 0}</span>
                    {act && <button className="badge pressable shrink-0" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} onClick={() => setOpen(act)}>{act.status === "DONE" ? "완료됨" : "처리하기"}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div tabIndex={0} className="table-scroll">
            <table className="text-[0.93rem]">
              <thead>
                <tr className="border-b text-left text-[0.82rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                  <th className="py-2.5 pr-4 font-semibold">제품</th><th className="py-2.5 pr-4 font-semibold">7일 점수</th><th className="py-2.5 pr-4 font-semibold">이전 7일</th><th className="py-2.5 pr-4 font-semibold">변화</th><th className="py-2.5 pr-4 font-semibold">Passport·찜·이동</th><th className="py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {c.productInterest.map((pi) => {
                  const p = m.productById.get(pi.productId);
                  const act = m.actions.find((a) => a.ruleKey === `interest:${pi.productId}` && a.status !== "DISMISSED");
                  const over = pi.recentScore >= INTEREST_THRESHOLD;
                  return (
                    <tr key={pi.productId} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3 pr-4 font-semibold">{p?.name ?? pi.productId}</td>
                      <td className="py-3 pr-4"><div className="flex min-w-[140px] items-center gap-2"><span className="tabular w-10 font-bold">{pi.recentScore}</span><MiniBar ratio={pi.recentScore / maxScore} color={over ? "var(--chart-3)" : "var(--chart-5)"} /></div></td>
                      <td className="tabular py-3 pr-4 text-ink-soft">{pi.prevScore}</td>
                      <td className="tabular py-3 pr-4 font-semibold" style={{ color: (pi.growth ?? 1) >= 0 ? "var(--success)" : "var(--danger)" }}>{pi.growth == null ? "신규" : formatPct(pi.growth)}</td>
                      <td className="tabular py-3 pr-4 text-ink-soft">{pi.recentCounts.passport_save ?? 0} · {pi.recentCounts.wishlist_add ?? 0} · {pi.recentCounts.outbound_purchase_click ?? 0}</td>
                      <td className="py-3">{act ? <button className="badge pressable" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} onClick={() => setOpen(act)}>{act.status === "DONE" ? "완료됨" : "처리하기"}</button> : <span className="text-[0.82rem] text-ink-soft">-</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
        <DataCard title="고객 관련 Action">
          {interestActions.length === 0 ? <EmptyState title="고객 관련 Action이 없습니다" /> : (
            <div className="grid gap-2.5">{interestActions.slice(0, 4).map((a) => <ActionRow key={a.id} action={a} waitDays={actionWaitDays(a, m.today)} onOpen={() => setOpen(a)} />)}</div>
          )}
        </DataCard>
      </div>
      )}

      {tab === "live" && (
        <DataCard title={<span className="flex items-center gap-2"><Radio size={18} style={{ color: "var(--success)" }} aria-hidden /> 실시간 고객 이벤트</span>} info="고객 화면(MIRYEO AI Beauty)에서 Finder 완료·찜·구매처 확인이 일어나면 바로 여기에 쌓입니다. 익명 세션 기준이며 개인정보는 모으지 않습니다." action={<Link href="/beauty" className="btn-secondary !min-h-[40px] text-[0.86rem]">고객 화면 열기 <ExternalLink size={14} aria-hidden /></Link>}>
          {c.liveEvents.length === 0 ? (
            <EmptyState title="아직 실제 발생 이벤트가 없습니다" desc="고객 화면에서 Finder를 완료하거나 제품을 찜하면 즉시 이곳에 표시됩니다. (Device View PC+Mobile로 동시에 확인 가능)" />
          ) : (
            <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
              {c.liveEvents.map((e) => (
                <li key={e.id} className="route-fade flex items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2 text-[0.88rem]">
                  <span className="min-w-0 truncate"><span className="font-semibold">{EVENT_LABEL[e.eventType]}</span>{e.productId ? ` · ${m.productById.get(e.productId)?.name ?? ""}` : ""}</span>
                  <span className="shrink-0 text-[0.78rem] text-ink-soft">{relativeKR(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[0.78rem] text-ink-soft">익명 세션 기준 · 개인정보 미수집 · 총 {c.totalCount.toLocaleString()}건 (DEMO 기준값 포함)</p>
        </DataCard>
      )}

      {tab === "members" && <CustomerMembers />}
      </div>

      <ActionDrawer action={open} onClose={() => setOpen(null)} />
    </div>
  );
}
