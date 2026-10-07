"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge } from "@/components/ax/Cards";
import { useModel } from "@/components/providers/DataProvider";
import { buildStartGuide, guideProgress, type StepPhase } from "@/lib/start-guide";
import { isLive } from "@/lib/config";
import { WeeklyRoutineList } from "@/components/ax/WeeklyRoutine";

/* 실데이터 시작 가이드 — Week 0 체크리스트 (자동 판정) */
export default function StartGuidePage() {
  const m = useModel();
  const steps = buildStartGuide(m.snapshot, m.today);
  const p = guideProgress(steps);
  const phases: StepPhase[] = ["Week 0 · 준비", "Week 0 · 실데이터", "Week 1~4 · 첫 증거"];
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader title="실데이터 시작 가이드" description="Demo가 아닌 가연인터내셔널의 실제 데이터로 운영을 시작하는 순서입니다. 입력하면 자동으로 완료 표시됩니다." />
      {!isLive && <p className="mb-4 rounded-xl p-3 text-[0.9rem]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO 모드: Demo 시드 데이터는 완료로 세지 않습니다. 직접 입력한 항목만 반영됩니다.</p>}
      <DataCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[0.85rem] font-semibold text-ink-soft">필수 단계 진행</div>
            <div className="tabular text-[1.8rem] font-bold" data-testid="guide-progress">{p.done} / {p.total}</div>
          </div>
          {p.next && <Link href={p.next.href} className="btn-primary">다음: {p.next.title} <ChevronRight size={16} aria-hidden /></Link>}
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={p.done} aria-valuemin={0} aria-valuemax={p.total} aria-label="시작 가이드 진행률">
          <div className="bar-reveal h-full rounded-full" style={{ width: `${Math.round(p.ratio * 100)}%`, background: "var(--primary)" }} />
        </div>
      </DataCard>

      {phases.map((ph) => (
        <section key={ph} className="mt-6">
          <h2 className="mb-2 text-[1.05rem] font-bold">{ph}</h2>
          <ol className="space-y-2" data-testid={`guide-${ph}`}>
            {steps.filter((x) => x.phase === ph).map((x) => (
              <li key={x.id} data-step={x.id} data-done={x.done ? "1" : "0"} className="ax-card flex items-start gap-3 p-4">
                {x.done ? <CheckCircle2 size={22} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} aria-label="완료" /> : <Circle size={22} className="mt-0.5 shrink-0 text-ink-soft" aria-label="미완료" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">{x.title}</span>
                    {x.optional && <StatusBadge tone="neutral">선택</StatusBadge>}
                    <StatusBadge tone="neutral">{x.owner}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-[0.88rem] text-ink-soft">{x.why}</p>
                  <p className="mt-1 text-[0.84rem]">현재: <b>{x.detail}</b></p>
                </div>
                <Link href={x.href} className="btn-secondary !min-h-[38px] shrink-0 text-[0.84rem]" aria-label={`${x.done ? "보기" : "하기"}: ${x.title}`}>{x.done ? "보기" : "하기"}</Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="mt-8" id="routine">
        <h2 className="text-[1.05rem] font-bold">매주 운영 점검 (Week 1~12)</h2>
        <p className="mb-3 mt-0.5 text-[0.88rem] text-ink-soft">실데이터 입력을 시작한 뒤에는 AX OWNER가 매주 이 6가지를 확인합니다. 입력이 멈추면 분석·추천·증빙이 모두 멈춥니다. 주간 리포트에도 함께 인쇄됩니다.</p>
        <DataCard><WeeklyRoutineList /></DataCard>
      </section>
    </div>
  );
}
