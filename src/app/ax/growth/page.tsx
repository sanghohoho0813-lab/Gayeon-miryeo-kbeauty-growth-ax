"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ACTION_STATUS_LABEL, ActionSummaryCard, DataCard, InsightCard, StatusBadge } from "@/components/ax/Cards";
import { ActionDrawer } from "@/components/ax/ActionDrawer";
import { AiReadyButton, AI_SPECS } from "@/components/ax/AiReady";
import { EmptyState } from "@/components/ax/States";
import { useModel } from "@/components/providers/DataProvider";
import type { ActionCategory, ActionStatus, GrowthAction } from "@/lib/types";

const STATUS_FILTERS: ("열린 Action" | ActionStatus)[] = ["열린 Action", "NEW", "REVIEWED", "IN_PROGRESS", "DONE", "DISMISSED"];
const CATEGORIES: ("전체" | ActionCategory)[] = ["전체", "고객 관심", "재고", "생산", "채널", "B2B", "재구매"];

export default function GrowthPage() {
  const m = useModel();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("열린 Action");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("전체");
  const [open, setOpen] = useState<GrowthAction | null>(null);

  const list = useMemo(
    () => m.actions.filter((a) => (status === "열린 Action" ? ["NEW", "REVIEWED", "IN_PROGRESS"].includes(a.status) : a.status === status) && (category === "전체" || a.category === category)),
    [m.actions, status, category]
  );
  const counts = (s: ActionStatus) => m.actions.filter((a) => a.status === s).length;
  const proofs = m.snapshot.proofEvents;

  return (
    <div>
      <PageHeader
        title="AI Growth Center"
        description="RULE이 판매·재고·고객 행동에서 감지한 Action을 사람이 검토·승인·실행하고, 결과를 실증(Proof Event)으로 남깁니다. 자동 실행은 하지 않습니다."
        actions={<AiReadyButton spec={AI_SPECS.growth} />}
      />

      <DataCard title="오늘의 Mission — 먼저 할 일 (최대 3개)">
        {m.missions.length === 0 ? (
          <EmptyState title="오늘 처리할 Mission이 없습니다" desc="열린 Action이 없습니다. 새 신호가 감지되면 자동으로 추가됩니다." />
        ) : (
          <ol className="stagger grid gap-5 pt-2 @3xl:grid-cols-3">
            {m.missions.map((a, i) => <li key={a.id}><ActionSummaryCard action={a} rank={i + 1} onOpen={() => setOpen(a)} /></li>)}
          </ol>
        )}
        <p className="mt-3 text-[0.82rem] text-ink-soft">우선순위: 우선 → 높음 → 중간, 같은 등급은 실행 중 → 새 추천 → 검토 완료 순 (AX_COACH_PLAN)</p>
      </DataCard>

      <div className="mt-6 grid grid-cols-2 gap-3 @3xl:grid-cols-5">
        {(["NEW", "REVIEWED", "IN_PROGRESS", "DONE", "DISMISSED"] as ActionStatus[]).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className="ax-card ax-card-hover p-4 text-left" aria-pressed={status === s} style={status === s ? { borderColor: "var(--primary)" } : undefined}>
            <div className="text-[0.82rem] font-semibold text-ink-soft">{ACTION_STATUS_LABEL[s]}</div>
            <div className="tabular text-[1.6rem] font-bold">{counts(s)}</div>
          </button>
        ))}
      </div>

      <DataCard
        className="mt-6"
        tourId="action-list"
        title={`Action 목록 (${list.length})`}
        action={
          <div className="flex flex-wrap gap-1.5">
            <select className="field !min-h-[42px] !w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="상태 필터">
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === "열린 Action" ? s : ACTION_STATUS_LABEL[s]}</option>)}
            </select>
            <select className="field !min-h-[42px] !w-auto" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} aria-label="카테고리 필터">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        }
      >
        {list.length === 0 ? (
          <EmptyState title="조건에 맞는 Action이 없습니다" />
        ) : (
          <div className="stagger grid gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
            {list.map((a) => <ActionSummaryCard key={a.id} action={a} onOpen={() => setOpen(a)} />)}
          </div>
        )}
      </DataCard>

      <div className="mt-6 grid gap-6 @4xl:grid-cols-2">
        <DataCard title="실증 연결 현황">
          <ul className="space-y-2 text-[0.95rem]">
            <li className="flex justify-between rounded-xl bg-surface-muted px-4 py-3"><span>완료된 Action</span><span className="tabular font-bold">{counts("DONE")}건</span></li>
            <li className="flex justify-between rounded-xl bg-surface-muted px-4 py-3"><span>Proof Event (측정중)</span><span className="tabular font-bold">{proofs.filter((p) => p.status === "RECORDED").length}건</span></li>
            <li className="flex justify-between rounded-xl bg-surface-muted px-4 py-3"><span>결과 확정 (OWNER)</span><span className="tabular font-bold">{proofs.filter((p) => p.status === "RESULT_CONFIRMED").length}건</span></li>
          </ul>
          <Link href="/ax/reports#proofs" className="btn-secondary mt-4">실증·Evidence 보기 <ArrowRight size={16} aria-hidden /></Link>
        </DataCard>
        <InsightCard
          title="판단 방식 안내"
          method="RULE · STATISTICAL"
          compact
          summary="성장률·재고일수·관심점수·납품일처럼 계산 가능한 지표는 코드로 계산하고, 임계값을 넘으면 Action이 생성됩니다. 같은 규칙의 Action은 완료·보류 후 14일간 다시 만들지 않습니다."
          evidence={["재고: 소진 10일 이하 + 성장 10%↑ → 우선", "고객 관심: 7일 점수 20↑ 그리고 이전 대비 +30%↑", "LLM 요약은 CONDITIONAL (API 승인 후)"]}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[0.82rem] text-ink-soft">
        <StatusBadge tone="neutral">L2 추천 → L3 사람 승인</StatusBadge>
        <StatusBadge tone="neutral">L4 자동실행 없음</StatusBadge>
      </div>

      <ActionDrawer action={open} onClose={() => setOpen(null)} />
    </div>
  );
}
