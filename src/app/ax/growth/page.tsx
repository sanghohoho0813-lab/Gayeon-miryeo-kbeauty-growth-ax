"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ACTION_STATUS_LABEL, ActionRow, DataCard, InsightCard, StatusBadge } from "@/components/ax/Cards";
import { ActionDrawer } from "@/components/ax/ActionDrawer";
import { AiReadyButton, AI_SPECS } from "@/components/ax/AiReady";
import { EmptyState } from "@/components/ax/States";
import { useModel } from "@/components/providers/DataProvider";
import { OPEN_STATUSES } from "@/lib/analytics";
import { matchesQuery } from "@/lib/search";
import type { ActionCategory, ActionStatus, GrowthAction } from "@/lib/types";

type StatusFilter = "열린 Action" | ActionStatus;
/** 처음에 보여 줄 Action 수 — 나머지는 '나머지 n건 보기' (PASS 21, D-075) */
const SHOW = 6;
const STATUS_FILTERS: StatusFilter[] = ["열린 Action", "NEW", "REVIEWED", "IN_PROGRESS", "DONE", "DISMISSED"];
const CATEGORIES: ("전체" | ActionCategory)[] = ["전체", "재고", "생산", "고객 관심", "채널", "B2B", "재구매", "정산"];

/* PASS 12: 상태 = 개수가 보이는 한 줄 필터, 목록 = 컴팩트 행. 오늘의 Mission은 별도 카드로 반복하지 않고 목록 맨 위에 '오늘 먼저 #n'으로 표시 */
function Inner() {
  const m = useModel();
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>("열린 Action");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("전체");
  const [open, setOpen] = useState<GrowthAction | null>(null);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");

  // 빠른 이동(?a=Action ID) → 해당 Action 처리 화면을 바로 연다
  const aid = params.get("a");
  useEffect(() => {
    const a = aid ? m.actions.find((x) => x.id === aid) : undefined;
    if (a) setOpen(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aid]);
  const close = () => { setOpen(null); if (aid) router.replace("/ax/growth", { scroll: false }); };

  const count = (s: StatusFilter) => (s === "열린 Action" ? m.actions.filter((a) => OPEN_STATUSES.includes(a.status)).length : m.actions.filter((a) => a.status === s).length);
  const missionRank = new Map(m.missions.map((a, i) => [a.id, i + 1]));
  const list = useMemo(() => {
    const l = m.actions.filter((a) => (status === "열린 Action" ? OPEN_STATUSES.includes(a.status) : a.status === status) && (category === "전체" || a.category === category) && matchesQuery(q, a.title, a.judgement, a.category, a.assigneeName));
    // 열린 Action은 오늘의 Mission(우선순위 상위 3개)을 맨 위에
    return status === "열린 Action" ? [...l].sort((a, b) => (missionRank.get(a.id) ?? 99) - (missionRank.get(b.id) ?? 99)) : l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.actions, m.missions, status, category, q]);
  const proofs = m.snapshot.proofEvents;
  const label = (s: StatusFilter) => (s === "열린 Action" ? s : ACTION_STATUS_LABEL[s]);

  return (
    <div>
      <PageHeader
        title="AI Growth Center"
        description="RULE이 판매·재고·고객 행동에서 감지한 Action을 사람이 검토·승인·실행하고, 결과를 실증(Proof Event)으로 남깁니다. 자동 실행은 하지 않습니다."
        actions={<AiReadyButton spec={AI_SPECS.growth} />}
      />

      <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_19rem] @4xl:items-start [&>*]:min-w-0">
        <DataCard tourId="action-list" title={`Action ${list.length}건`} info={<>판매·재고·고객 행동에서 규칙(RULE)이 감지한 할 일입니다. 열린 Action의 맨 위 {m.missions.length || 3}개가 <b>오늘의 Mission</b>입니다 — 우선 → 높음 → 중간, 같은 등급은 실행 중 → 새 추천 → 검토 완료 순. 사람이 검토·승인해야 실행됩니다.</>} action={
          <select className="field !min-h-[42px] !w-auto" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} aria-label="카테고리 필터">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c === "전체" ? "카테고리 전체" : c}</option>)}
          </select>
        }>
          {/* 상태 칩 한 줄 (PASS 30): 좁은 화면은 옆으로 넘김(카드 끝까지, 오른쪽 흐림으로 더 있음 표시) — 3줄로 감기던 문제 */}
          <div className="chip-rail relative -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 @md:mx-0 @md:flex-wrap @md:gap-1 @md:overflow-visible @md:px-0" role="group" aria-label="상태 필터" data-testid="status-filter">
            {STATUS_FILTERS.map((s) => {
              const on = status === s;
              const n = count(s);
              return (
                <button key={s} onClick={() => setStatus(s)} aria-pressed={on} data-status={s} className="pressable relative inline-flex min-h-[38px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-[0.84rem] font-semibold @md:min-h-[40px] @md:gap-1.5 @md:px-2.5 @md:text-[0.86rem]"
                  style={on ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  {label(s)}
                  {/* 0건은 숫자 알약 없이 (덜 시끄럽게 · 한 줄에 들어가게, PASS 30) — 화면 읽기에는 '0건' (칩·줄이 relative라 숨긴 글자가 화면 밖으로 페이지를 넓히지 않음) */}
                  {n > 0 || on ? <span className="tabular rounded-full px-1.5 text-[0.76rem]" style={on ? { background: "#fff", color: "var(--primary)" } : { background: "var(--surface-muted)" }}>{n}</span> : <span className="sr-only">0건</span>}
                </button>
              );
            })}
          </div>
          {/* Action 검색 (PASS 31, D-101) — 제목·근거·담당자, 초성 가능. 상태·카테고리와 함께 걸림 */}
          <label className="relative mb-3 block">
            <span className="sr-only">Action 검색</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input type="search" className="field !min-h-[42px] !pl-9 !pr-9" placeholder="상품명·내용·담당자로 검색" value={q} onChange={(e) => setQ(e.target.value)} data-testid="action-search" enterKeyHint="search" />
            {q && <button type="button" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted" onClick={() => setQ("")} aria-label="검색어 지우기"><X size={15} aria-hidden /></button>}
          </label>
          {list.length === 0 ? (q ? (
            <div className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[0.92rem]" data-testid="action-empty-search">
              <p className="font-semibold">&lsquo;{q}&rsquo;에 맞는 Action이 없습니다</p>
              <button type="button" className="btn-secondary mt-3 !min-h-[40px] text-[0.86rem]" onClick={() => setQ("")}>검색 지우기</button>
            </div>
          ) : (
            <EmptyState title="조건에 맞는 Action이 없습니다" desc={status === "열린 Action" ? "RULE이 새 위험·기회를 감지하면 자동으로 추가됩니다." : undefined} />
          )
          ) : (
            <>
            <ul className="space-y-2">
              {(more ? list : list.slice(0, SHOW)).map((a) => {
                const rank = status === "열린 Action" ? missionRank.get(a.id) : undefined;
                return <li key={a.id}><ActionRow action={a} rank={rank} today={!!rank} onOpen={() => setOpen(a)} /></li>;
              })}
            </ul>
            {list.length > SHOW && (
              <button type="button" className="btn-ghost mt-2 w-full !min-h-[42px] text-[0.88rem]" aria-expanded={more} onClick={() => setMore((v) => !v)} data-testid="actions-more">
                {more ? "접기" : `나머지 ${list.length - SHOW}건 보기`}
              </button>
            )}
            </>
          )}
        </DataCard>

        <div className="space-y-5">
          <DataCard title="실증 연결 현황">
            <ul className="space-y-2 text-[0.93rem]">
              <li className="flex justify-between rounded-xl bg-surface-muted px-3.5 py-2.5"><span>완료된 Action</span><span className="tabular font-bold">{count("DONE")}건</span></li>
              <li className="flex justify-between rounded-xl bg-surface-muted px-3.5 py-2.5"><span>Proof Event (측정중)</span><span className="tabular font-bold">{proofs.filter((p) => p.status === "RECORDED").length}건</span></li>
              <li className="flex justify-between rounded-xl bg-surface-muted px-3.5 py-2.5"><span>결과 확정 (OWNER)</span><span className="tabular font-bold">{proofs.filter((p) => p.status === "RESULT_CONFIRMED").length}건</span></li>
            </ul>
            <Link href="/ax/reports#proofs" className="btn-secondary mt-3 !min-h-[42px] w-full text-[0.9rem]">실증·Evidence 보기 <ArrowRight size={16} aria-hidden /></Link>
          </DataCard>
          <DataCard title="판단 방식" collapsible defaultOpen={false} testId="growth-method">
            <InsightCard
              title="판단 방식 안내"
              method="RULE · STATISTICAL"
              compact
              summary="성장률·재고일수·관심점수·납품일처럼 계산 가능한 지표는 코드로 계산하고, 임계값을 넘으면 Action이 생성됩니다. 같은 규칙의 Action은 완료·보류 후 14일간 다시 만들지 않습니다."
              evidence={["재고: 소진 10일 이하 + 성장 10%↑ → 우선", "생산 착수: 생산기간+안전 14일 기준 마감 14일 이내", "고객 관심: 7일 점수 20↑ 그리고 이전 대비 +30%↑", "LLM 요약은 CONDITIONAL (API 승인 후)"]}
            />
            <div className="mt-3 flex flex-wrap gap-2 text-[0.82rem] text-ink-soft">
              <StatusBadge tone="neutral">L2 추천 → L3 사람 승인</StatusBadge>
              <StatusBadge tone="neutral">L4 자동실행 없음</StatusBadge>
            </div>
          </DataCard>
        </div>
      </div>

      <ActionDrawer action={open} onClose={close} />
    </div>
  );
}

export default function GrowthPage() {
  return <Suspense><Inner /></Suspense>;
}
