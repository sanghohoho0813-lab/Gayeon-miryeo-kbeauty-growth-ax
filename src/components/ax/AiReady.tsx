"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "./Modal";

/* AI Ready Marker — AI Fit Gate를 통과한 소수 위치에만 사용 (AI METHOD MATRIX) */
export interface AiReadySpec {
  title: string;
  reads: string[];
  does: string[];
  why: string;
  now: string;
  next: string;
}

export function AiReadyButton({ spec }: { spec: AiReadySpec }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="badge pressable border" style={{ borderColor: "var(--accent)", color: "var(--text-primary)", background: "var(--surface)" }}>
        <Sparkles size={13} style={{ color: "var(--accent)" }} aria-hidden /> AI Ready
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={spec.title}>
        <div className="space-y-4 text-[0.95rem]">
          <div>
            <div className="font-bold">어떤 데이터를 보나요?</div>
            <ul className="mt-1 list-disc pl-5 text-ink-soft">{spec.reads.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <div>
            <div className="font-bold">무엇을 판단하나요?</div>
            <ul className="mt-1 list-disc pl-5 text-ink-soft">{spec.does.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <div>
            <div className="font-bold">왜 필요한가요?</div>
            <p className="mt-1 text-ink-soft">{spec.why}</p>
          </div>
          <div className="rounded-xl bg-surface-muted p-4 text-[0.9rem]">
            <div><span className="font-semibold">현재:</span> {spec.now}</div>
            <div className="mt-1"><span className="font-semibold">향후 (CONDITIONAL):</span> {spec.next}</div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export const AI_SPECS: Record<"growth" | "inventory" | "customer" | "report", AiReadySpec> = {
  growth: {
    title: "Growth Action 판단 — AI 연결 위치",
    reads: ["최근 8주 판매(채널별)", "재고·입고예정", "고객 관심점수(7일)", "B2B 납품일"],
    does: ["여러 신호를 함께 읽고 오늘 먼저 할 일 3개의 우선순위 설명", "권장 행동의 근거를 자연어로 요약"],
    why: "담당자가 여러 화면을 비교하는 시간을 줄이고 놓치기 쉬운 위험·기회를 먼저 보여주기 위해서입니다.",
    now: "RULE 계산 (성장률·재고일수·관심점수 임계값) — 모든 근거가 표시됩니다.",
    next: "LLM으로 우선순위 해석·요약 문장 생성 (API 사용 승인 후, 판단 자체는 RULE 유지)",
  },
  inventory: {
    title: "재고·생산 추천 — AI 연결 위치",
    reads: ["일 평균 판매속도", "4주 성장률", "현재 재고·안전재고·입고예정"],
    does: ["6주 예상 판매 대비 부족분 계산", "생산 조정 이유 설명"],
    why: "품절과 과잉재고를 동시에 줄이기 위해서입니다.",
    now: "RULE (6주 예측 = 판매속도 × 42일 × 성장 보정). 사람 승인 필수.",
    next: "주문 이력이 12주 이상 쌓이면 STATISTICAL 수요예측 검토",
  },
  customer: {
    title: "고객 관심 신호 — AI 연결 위치",
    reads: ["Finder 완료·Passport 저장", "찜·제품 조회·구매채널 이동", "선택한 피부 고민"],
    does: ["제품별 관심 상승 감지", "재고·노출 대응 필요 여부 판단"],
    why: "외부 플랫폼에 흩어지던 고객 반응을 자사 데이터로 모아 상품·재고 판단에 쓰기 위해서입니다.",
    now: "RULE (가중 관심점수, 7일 vs 이전 7일)",
    next: "이벤트가 충분히 쌓이면 재구매 예측(STATISTICAL) 검토",
  },
  report: {
    title: "실증 리포트 요약 — AI 연결 위치",
    reads: ["Proof Event", "KPI Before/After 스냅샷", "Action 처리 이력"],
    does: ["주간 실증 요약 초안 작성"],
    why: "대표 보고·정부/투자 자료 작성 시간을 줄이기 위해서입니다.",
    now: "구조화된 Proof 목록 (자동 요약 없음)",
    next: "LLM 요약 초안 (사람 검토 필수, 수치는 원본 데이터 인용)",
  },
};
