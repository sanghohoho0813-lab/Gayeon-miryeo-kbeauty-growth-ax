"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Radio } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ActionSummaryCard, DataCard, KpiCard, MiniBar } from "@/components/ax/Cards";
import { DailyEvents } from "@/components/ax/TrendChart";
import { ActionDrawer } from "@/components/ax/ActionDrawer";
import { CustomerMembers } from "@/components/ax/CustomerMembers";
import { AiReadyButton, AI_SPECS } from "@/components/ax/AiReady";
import { DataFreshness } from "@/components/ax/DataFreshness";
import { EmptyState } from "@/components/ax/States";
import { useModel } from "@/components/providers/DataProvider";
import { EVENT_LABEL, formatPct, INTEREST_GROWTH_MIN, INTEREST_THRESHOLD } from "@/lib/analytics";
import { relativeKR } from "@/lib/date";
import type { GrowthAction } from "@/lib/types";

export default function CustomersPage() {
  const m = useModel();
  const [open, setOpen] = useState<GrowthAction | null>(null);
  const c = m.customer;
  const interestActions = m.actions.filter((a) => a.category === "고객 관심" || a.category === "재구매");
  const maxScore = Math.max(1, ...c.productInterest.map((p) => p.recentScore));
  const concernTotal = c.concerns.reduce((s, x) => s + x.count, 0);

  return (
    <div>
      <PageHeader
        title="고객 인사이트 — Customer Event Bridge"
        description="MIRYEO AI Beauty에서 고객이 한 행동(익명 세션)이 이곳에 쌓이고, 관심이 오르면 Growth Action으로 이어집니다."
        actions={<><AiReadyButton spec={AI_SPECS.customer} /><DataFreshness /></>}
      />

      <div className="stagger grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-4" data-tour="customer-bridge">
        <KpiCard label="Finder 시작 (7일)" value={c.recent.finder_start} format={(v) => `${Math.round(v)}건`} sub={`이전 7일 ${c.prev.finder_start}`} />
        <KpiCard label="Finder 완료 (7일)" value={c.recent.finder_complete} format={(v) => `${Math.round(v)}건`} sub={`이전 7일 ${c.prev.finder_complete}`} />
        <KpiCard label="Passport 저장 (7일)" value={c.recent.passport_save} format={(v) => `${Math.round(v)}건`} sub="PRIMARY CONVERSION" />
        <KpiCard label="Finder → Passport 전환" value={(c.conversionRecent ?? 0) * 100} format={(v) => (c.conversionRecent == null ? "-" : `${v.toFixed(1)}%`)} sub={`이전 7일 ${formatPct(c.conversionPrev, false)} · Baseline 미확정`} href="/ax/reports" />
      </div>

      <div className="mt-6 grid gap-6 @4xl:grid-cols-5">
        <DataCard title="일별 고객 행동 (14일)" className="@4xl:col-span-3">
          <DailyEvents data={c.daily} />
          <div className="mt-2 flex flex-wrap gap-3 text-[0.8rem] text-ink-soft">
            {[["var(--chart-1)", "Finder 완료"], ["var(--chart-3)", "Passport 저장"], ["var(--chart-5)", "찜"], ["var(--chart-4)", "구매채널 이동"]].map(([col, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: col }} aria-hidden />{l}</span>
            ))}
          </div>
        </DataCard>
        <DataCard title="선택된 피부 고민 (7일)" className="@4xl:col-span-2">
          {c.concerns.length === 0 ? <EmptyState title="아직 Finder 완료 데이터가 없습니다" /> : (
            <ul className="space-y-3">
              {c.concerns.map((x) => (
                <li key={x.concern}>
                  <div className="mb-1 flex justify-between text-[0.9rem]"><span>{x.concern}</span><span className="tabular font-semibold">{x.count}회 · {Math.round((x.count / concernTotal) * 100)}%</span></div>
                  <MiniBar ratio={x.count / c.concerns[0].count} color="#C76C86" />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.8rem] text-ink-soft">상품기획·콘텐츠 우선순위의 근거 데이터 (자사 보유 고객 데이터)</p>
        </DataCard>
      </div>

      <DataCard className="mt-6" title="제품별 관심점수 (7일 vs 이전 7일)">
        <p className="mb-3 text-[0.86rem] text-ink-soft">
          점수 = 조회×0.2 + 찜×2 + 추천노출×1 + Passport 저장×3 + 구매채널 이동×2 (RULE). {INTEREST_THRESHOLD}점 이상이면서 +{Math.round(INTEREST_GROWTH_MIN * 100)}% 이상이면 &lsquo;고객 관심 상승&rsquo; Action 생성.
        </p>
        {c.productInterest.length === 0 ? <EmptyState title="관심 데이터가 없습니다" desc="고객 화면에서 제품 조회·찜·Finder가 발생하면 계산됩니다." /> : (
          <div className="table-scroll">
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

      <div className="mt-6 grid gap-6 @4xl:grid-cols-2">
        <DataCard title={<span className="flex items-center gap-2"><Radio size={18} style={{ color: "var(--success)" }} aria-hidden /> 실시간 고객 이벤트</span>} action={<Link href="/beauty" className="btn-secondary !min-h-[40px] text-[0.86rem]">고객 화면 열기 <ExternalLink size={14} aria-hidden /></Link>}>
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

        <DataCard title="고객 관련 Action">
          {interestActions.length === 0 ? <EmptyState title="고객 관련 Action이 없습니다" /> : (
            <div className="grid gap-3">{interestActions.slice(0, 4).map((a) => <ActionSummaryCard key={a.id} action={a} onOpen={() => setOpen(a)} />)}</div>
          )}
        </DataCard>
      </div>

      <CustomerMembers />

      <ActionDrawer action={open} onClose={() => setOpen(null)} />
    </div>
  );
}
