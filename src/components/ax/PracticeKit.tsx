"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FlaskConical, RotateCcw } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { Modal } from "./Modal";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { realScope } from "@/lib/start-guide";
import { downloadCSV } from "@/lib/export";
import { startPracticeDemo } from "@/lib/data/demo-store";
import { PRACTICE_MISTAKES, PRACTICE_STEPS, practiceProductFile, practiceSalesFile, practiceWeekFile, type PracticeFile } from "@/lib/practice-kit";

/* 샘플 자료 연습 (Demo 주소 전용) — 실제 자료가 오기 전, 가상 샘플 파일로 첫 주 업무(Week 0)를 그대로 해 본다.
   계약 별지 제1호 "실제 자료 또는 합리적인 샘플 자료로 실제 업무에 쓸 수 있는지 확인"의 리허설 수단. */
export function PracticeCard() {
  const m = useModel();
  const { source } = useData();
  const { role } = useSession();
  const [confirm, setConfirm] = useState<"start" | "end" | null>(null);
  if (isLive) return null;
  const owner = can(role, "manage_org");
  const on = !!m.snapshot.practice;
  const r = realScope(m.snapshot);
  const realCount = on ? 0 : r.products.length + r.sales.length + r.settlements.length;
  const files: [string, () => PracticeFile][] = [["sales", () => practiceSalesFile(m.today)], ["products", practiceProductFile], ["week", () => practiceWeekFile(m.today)]];

  return (
    <DataCard className="mb-6" title={on ? "샘플 자료 연습 중" : "실제 자료 전에 샘플 자료로 연습하기"} action={<StatusBadge tone={on ? "warning" : "neutral"}>{on ? "연습 모드" : "선택"}</StatusBadge>}>
      <div data-testid="practice-card" data-state={on ? "on" : "off"}>
        {!on ? (
          <>
            <p className="text-[0.9rem] text-ink-soft">가상 샘플 파일 3개(판매 8주·상품 정보·재고·추가 1주)로 첫 주 업무를 실제 순서 그대로 해 봅니다. Demo 시연 데이터를 비운 <b>빈 상태</b>에서 시작하므로 실제 자료를 처음 올리는 날과 같은 화면을 봅니다. 이 브라우저에만 저장되고, 끝나면 시연 데이터로 되돌립니다.</p>
            {realCount > 0 && <p className="mt-2 rounded-lg p-2.5 text-[0.86rem]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }} data-testid="practice-real-warning">이 브라우저에 직접 입력한 실데이터 {realCount.toLocaleString()}건이 있습니다. 연습을 시작하면 지워지니 먼저 <Link className="font-semibold underline" href="/ax/data?tab=export#transfer">백업 파일</Link>을 받으세요.</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn-primary" disabled={!owner} onClick={() => setConfirm("start")} data-testid="practice-start"><FlaskConical size={16} aria-hidden /> 샘플 자료로 연습 시작</button>
              {!owner && <span className="text-[0.82rem] text-ink-soft">대표 역할에서 시작할 수 있습니다.</span>}
            </div>
          </>
        ) : (
          <>
            <p className="text-[0.9rem] text-ink-soft">모든 이름이 &lsquo;샘플&rsquo;, SKU가 &lsquo;SAMPLE-&rsquo;로 시작하는 <b>가상 자료</b>입니다 (실적 아님). 날짜는 오늘 기준으로 만들어집니다. 아래 순서대로 파일을 올리고 화면을 확인하세요.</p>
            <div className="mt-3 grid gap-2 @xl:grid-cols-3">
              {files.map(([key, make]) => {
                const f = make();
                return (
                  <button key={key} className="btn-secondary !h-auto !min-h-[64px] w-full min-w-0 flex-col !items-start !justify-center gap-0.5 !whitespace-normal py-2 text-left" data-file={key} onClick={() => downloadCSV(f.name, f.rows, f.headers)}>
                    <span className="flex items-center gap-1.5 font-semibold"><Download size={15} aria-hidden /> {f.title}</span>
                    <span className="break-keep text-[0.76rem] font-normal text-ink-soft">{f.rows.length.toLocaleString()}행 · {f.note}</span>
                  </button>
                );
              })}
            </div>
            <ol className="mt-4 space-y-1.5 text-[0.88rem]" data-testid="practice-steps">
              {PRACTICE_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-2">
                  <span className="tabular w-5 shrink-0 font-bold text-ink-soft">{i + 1}.</span>
                  <span><Link className="font-semibold underline" href={s.href}>{s.title}</Link> — <span className="text-ink-soft">{s.detail}</span></span>
                </li>
              ))}
            </ol>
            <details className="mt-3 text-[0.86rem]">
              <summary className="cursor-pointer font-semibold">일부러 넣은 실수 3가지 (먼저 찾아본 뒤 열어 보세요)</summary>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink-soft">{PRACTICE_MISTAKES.map((x) => <li key={x}>{x}</li>)}</ul>
            </details>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="btn-secondary !h-auto !whitespace-normal py-2 text-left" disabled={!owner} onClick={() => setConfirm("end")} data-testid="practice-end"><RotateCcw size={16} aria-hidden /> 연습 끝내기 (시연 데이터로 되돌리기)</button>
              <span className="text-[0.8rem] text-ink-soft">연습 자료는 백업·이관 파일에 들어가지 않습니다.</span>
            </div>
          </>
        )}
      </div>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === "start" ? "샘플 자료 연습을 시작할까요?" : "연습을 끝낼까요?"}>
        <p className="text-[0.95rem] text-ink-soft">{confirm === "start" ? "이 브라우저의 Demo 데이터(시연 데이터와 직접 입력한 내용)를 비우고 빈 상태에서 시작합니다. Live 데이터에는 영향이 없습니다." : "연습 자료를 지우고 Demo 시연 데이터로 되돌립니다."}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirm(null)}>취소</button>
          <button className="btn-primary" onClick={async () => {
            if (confirm === "start") { startPracticeDemo(); toast("빈 상태에서 샘플 자료 연습을 시작합니다"); }
            else { await source?.reset(); toast("Demo 시연 데이터로 되돌렸습니다"); }
            setConfirm(null);
          }}>{confirm === "start" ? "비우고 시작" : "끝내기"}</button>
        </div>
      </Modal>
    </DataCard>
  );
}

/** 연습 모드 표시 — 모든 AX 화면 상단 (인쇄물에도 남김: 샘플 결과가 실적처럼 쓰이지 않도록) */
export function PracticeBanner() {
  const { model } = useData();
  if (isLive || !model?.snapshot.practice) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-[0.86rem] font-semibold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }} data-testid="practice-banner" role="note">
      <FlaskConical size={15} aria-hidden /> 샘플 자료 연습 중 — 가상 자료 · 실적 아님
      <Link href="/ax/start" className="font-normal underline print:hidden">연습 안내·끝내기</Link>
    </div>
  );
}
