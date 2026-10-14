"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { InfoTip } from "@/components/ax/InfoTip";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge } from "@/components/ax/Cards";
import { useModel } from "@/components/providers/DataProvider";
import { buildStartGuide, guideProgress, type StepPhase } from "@/lib/start-guide";
import { isLive } from "@/lib/config";
import { WeeklyRoutineList } from "@/components/ax/WeeklyRoutine";
import { PracticeCard } from "@/components/ax/PracticeKit";

/* 실데이터 시작 가이드 — Week 0 체크리스트 (자동 판정) */
export default function StartGuidePage() {
  const m = useModel();
  const steps = buildStartGuide(m.snapshot, m.today);
  const p = guideProgress(steps);
  const phases: StepPhase[] = ["Week 0 · 준비", "Week 0 · 실데이터", "Week 1~4 · 첫 증거"];
  // 지금 할 단계가 있는 주차만 펼치고 나머지는 접어 둔다 (PASS 21, D-075)
  const current = steps.find((x) => !x.done && !x.optional)?.phase ?? steps.find((x) => !x.done)?.phase ?? phases[0];
  const [open, setOpen] = useState<Set<StepPhase>>(() => new Set([current]));
  const toggle = (ph: StepPhase) => setOpen((o) => { const n = new Set(o); if (n.has(ph)) n.delete(ph); else n.add(ph); return n; });
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader title="실데이터 시작 가이드" description="Demo가 아닌 가연인터내셔널의 실제 데이터로 운영을 시작하는 순서입니다. 입력하면 자동으로 완료 표시됩니다. 지금 할 단계가 있는 주차만 펼쳐 둡니다." />
      {!isLive && <p className="mb-4 rounded-xl px-3 py-2 text-[0.86rem]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO 모드 — 시드 데이터는 완료로 세지 않고, 직접 입력한 항목만 반영합니다.</p>}
      <PracticeCard />
      <DataCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[0.85rem] font-semibold text-ink-soft">필수 단계 진행</div>
            <div className="tabular text-[1.8rem] font-bold" data-testid="guide-progress">{p.done} / {p.total}</div>
          </div>
          {p.next && <Link href={p.next.href} className="btn-primary !h-auto max-w-full !whitespace-normal py-2 text-left">다음: {p.next.title} <ChevronRight size={16} className="shrink-0" aria-hidden /></Link>}
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={p.done} aria-valuemin={0} aria-valuemax={p.total} aria-label="시작 가이드 진행률">
          <div className="bar-reveal h-full rounded-full" style={{ width: `${Math.round(p.ratio * 100)}%`, background: "var(--primary)" }} />
        </div>
      </DataCard>

      {phases.map((ph, pi) => {
        const list = steps.filter((x) => x.phase === ph);
        const done = list.filter((x) => x.done).length;
        const isOpen = open.has(ph);
        return (
        <section key={ph} className="mt-4">
          <h2>
            <button type="button" className="flex w-full items-center gap-2 rounded-xl px-1 py-2 text-left" aria-expanded={isOpen} aria-controls={`phase-${pi}`} onClick={() => toggle(ph)}>
              <ChevronDown size={18} className="shrink-0 text-ink-soft transition-transform" style={{ transform: isOpen ? "none" : "rotate(-90deg)" }} aria-hidden />
              <span className="text-[1.05rem] font-bold">{ph}</span>
              <span className="tabular text-[0.84rem] font-semibold text-ink-soft">{done} / {list.length} 완료</span>
              {ph === current && <StatusBadge tone="primary">지금</StatusBadge>}
            </button>
          </h2>
          <ol id={`phase-${pi}`} className={`mt-1 space-y-2 ${isOpen ? "" : "is-folded"}`} data-testid={`guide-${ph}`}>
            {list.map((x) => (
              <li key={x.id} data-step={x.id} data-done={x.done ? "1" : "0"} className="ax-card flex items-center gap-3 px-4 py-3">
                {x.done ? <CheckCircle2 size={22} className="shrink-0" style={{ color: "var(--success)" }} aria-label="완료" /> : <Circle size={22} className="shrink-0 text-ink-soft" aria-label="미완료" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">{x.title}</span>
                    <InfoTip text={x.why} label={`${x.title} 설명`} />
                    {x.optional && <StatusBadge tone="neutral">선택</StatusBadge>}
                    <StatusBadge tone="neutral">{x.owner}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-[0.84rem] text-ink-soft">현재: <b className="text-ink">{x.detail}</b></p>
                </div>
                <Link href={x.href} className="btn-secondary !min-h-[38px] shrink-0 text-[0.84rem]" aria-label={`${x.done ? "보기" : "하기"}: ${x.title}`}>{x.done ? "보기" : "하기"}</Link>
              </li>
            ))}
          </ol>
        </section>
        );
      })}

      <DataCard className="mt-6" id="routine" title="매주 운영 점검 (Week 1~12)" info="실데이터 입력을 시작한 뒤에는 AX OWNER가 매주 이 7가지를 확인합니다. 입력이 멈추면 분석·추천·증빙이 모두 멈춥니다. 주간 리포트에도 함께 인쇄됩니다.">
        <WeeklyRoutineList />
      </DataCard>
    </div>
  );
}
