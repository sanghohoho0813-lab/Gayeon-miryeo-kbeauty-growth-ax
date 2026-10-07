"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useModel } from "@/components/providers/DataProvider";
import { buildWeeklyRoutine, routineProgress } from "@/lib/weekly-routine";

/* 주간 운영 점검 목록 — 시작 가이드·주간 리포트(인쇄 포함) 공통. print=true면 링크 버튼을 숨긴다. */
export function WeeklyRoutineList({ print = false }: { print?: boolean }) {
  const m = useModel();
  const items = buildWeeklyRoutine(m.snapshot, m.today);
  const p = routineProgress(items);
  return (
    <div data-testid="weekly-routine" data-done={p.done} data-total={p.total}>
      <p className="mb-2 text-[0.9rem]"><b className="tabular">{p.done} / {p.total}</b> 정상 · {m.today} 기준 자동 판정</p>
      <ul className="grid gap-2 @3xl:grid-cols-2">
        {items.map((x) => (
          <li key={x.id} data-routine={x.id} data-done={x.done ? "1" : "0"} className="print-break-avoid flex items-start gap-2.5 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            {x.done ? <CheckCircle2 size={19} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} aria-label="정상" /> : <CircleAlert size={19} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} aria-label="확인 필요" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-bold">{x.title}</span>
                {!print && !x.done && <Link href={x.href} className="text-[0.82rem] font-semibold underline print:hidden" style={{ color: "var(--primary)" }} aria-label={`처리하기: ${x.title}`}>처리하기</Link>}
              </div>
              <p className="break-any text-[0.86rem]">{x.detail}</p>
              <p className="text-[0.78rem] text-ink-soft">기준: {x.rule}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
