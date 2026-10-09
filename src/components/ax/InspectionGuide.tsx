"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, MessageCircleQuestion } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { WeeklyRoutineList } from "./WeeklyRoutine";
import { useModel } from "@/components/providers/DataProvider";
import { AI_BRIEFING_UI, PRIVACY_POLICY_URL, isLive } from "@/lib/config";
import { formatDateKR } from "@/lib/date";
import { formatKRW } from "@/lib/analytics";
import { activeBaseline, measureMoneyKpis, lastDays, formatKpiValue, formatChange } from "@/lib/evidence";

/* 면담·현장확인 대비 (계약 제9조 ①, 별지 제2호 3단계) — 심사·확인 담당자 앞에서 실제 화면으로 보여줄 순서와 근거.
   답변은 시스템이 보여줄 수 있는 사실과 현재 데이터만 쓴다. 회사 고유 답변(계획·재무)은 '대표 답변 준비'로 남긴다. */
export function InspectionGuide() {
  const m = useModel();
  const s = m.snapshot;
  const k = m.kpis;
  const c = m.customer;
  const done = s.actions.filter((a) => a.status === "DONE").length;
  const open = s.actions.filter((a) => a.status === "NEW" || a.status === "REVIEWED" || a.status === "IN_PROGRESS").length;
  const confirmed = s.proofEvents.filter((p) => p.status === "RESULT_CONFIRMED").length;
  const baselines = (["COST", "REVENUE", "SCALE"] as const).filter((key) => activeBaseline(s.baselines, key)).length;
  const kpis = measureMoneyKpis(s, lastDays(28, m.today));
  const improved = kpis.filter((x) => x.change);
  const firstSale = s.sales.reduce<string | null>((a, x) => (!a || x.saleDate < a ? x.saleDate : a), null);
  const patents = s.techAssets.filter((t) => t.kind === "특허" || t.kind === "기술인증" || t.kind === "벤처기업확인");

  const steps: { title: string; href: string; show: string; say: string; evidence: string }[] = [
    { title: "대시보드 — 한 화면의 경영 현황", href: "/ax", show: "최근 4주 매출·SKU·재고 위험·B2B·수출, 이번 달 매출·이익·받을 돈", say: "흩어진 판매·재고·거래처 기록을 매일 한 화면에서 봅니다.", evidence: `최근 4주 매출 ${formatKRW(k.revenue28)} · 최근 판매 기록 ${k.lastSaleDate ? formatDateKR(k.lastSaleDate) : "없음"}` },
    { title: "고객 AI 추천 — 고객 화면에서 직접 시연", href: "/beauty/finder", show: "피부 고민·사용감·예산 선택 → STEP별 루틴 → 제품 상세 → 구매처 이동", say: "고객이 고른 조건으로 제품과 사용 순서를 추천하고, 추천 이유를 함께 보여줍니다.", evidence: `최근 7일 추천 완료 ${c.finderSessionsRecent}세션 · 구매처 이동 ${c.recent.outbound_purchase_click}건` },
    { title: "고객 행동이 운영으로 연결", href: "/ax/customers", show: "방금 시연한 추천·찜·구매처 이동이 고객 인사이트에 반영되는 것", say: "고객 화면의 행동이 익명으로 기록되어 제품별 관심도로 집계됩니다.", evidence: `기록된 고객 행동 ${c.totalCount.toLocaleString()}건 (최근 7일 추천 완료 ${c.finderSessionsRecent}세션)` },
    { title: "AI Growth Center — 판단 → 승인 → 실행 → 결과", href: "/ax/growth", show: "Action 하나를 열어 판단 근거·승인자·처리 이력·결과(KPI 전후)를 보여주기", say: "시스템은 규칙으로 할 일을 제안하고, 승인·실행·결과 기록은 사람이 합니다. 모든 단계가 이력으로 남습니다.", evidence: `진행 중 ${open}건 · 완료 ${done}건` },
    { title: "제품·재고·생산", href: "/ax/products", show: "SKU별 판매속도·예상 소진일·추천 발주량", say: "판매속도와 재고로 소진일을 계산해 생산·발주 시점을 미리 봅니다.", evidence: `재고 위험 SKU ${k.stockRiskSku}개 / 전체 ${k.totalSku}개` },
    { title: "실증·Evidence — 도입 효과의 근거", href: "/ax/reports", show: "Money KPI 3개 Baseline(도입 전 기준)과 현재, 대표가 확정한 Proof", say: "효과는 도입 전 기준값을 잠근 뒤 같은 방법으로 측정해 비교합니다. 기준값이 없으면 개선률을 말하지 않습니다.", evidence: `Baseline 잠금 ${baselines}/3 · 확정 Proof ${confirmed}건` },
    { title: "자료 출력 — 사업화 실적 자료·주간 리포트", href: "/ax/business", show: "사업화 실적 자료와 주간 리포트를 인쇄·PDF로", say: "제출 자료의 숫자는 모두 이 시스템 기록에서 계산된 것입니다.", evidence: `판매 기록 ${s.sales.length.toLocaleString()}행${firstSale ? ` (${formatDateKR(firstSale)}부터)` : ""}` },
  ];

  const qa: { q: string; a: string; company?: boolean }[] = [
    { q: "AI는 어떤 방식으로 판단합니까?", a: `규칙(RULE)과 통계로 판단하며, 각 화면에 판단 방식을 표시합니다. 고객사 전용 AI 모델을 학습시키지 않습니다. 대표 브리핑 문장화(Claude)는 ${AI_BRIEFING_UI ? "켜져 있고, 기록에 없는 숫자가 나오면 자동으로 버립니다" : "선택 기능으로 현재 꺼져 있습니다"}.` },
    { q: "실제로 업무에 쓰고 있습니까?", a: `판매 기록 ${s.sales.length.toLocaleString()}행${firstSale ? `(${formatDateKR(firstSale)}부터)` : ""}, 최근 판매 기록 ${k.lastSaleDate ? formatDateKR(k.lastSaleDate) : "없음"}, Action 완료 ${done}건과 처리 이력, 주간 리포트로 보여줍니다.${isLive ? "" : " (현재 DEMO 데이터 — 실제 사용 근거로 제시 불가)"}` },
    { q: "도입 효과가 있습니까?", a: improved.length ? improved.map((x) => `${x.name}: Baseline ${formatKpiValue(x.baseline!.value, x.unit)} → 현재 ${formatKpiValue(x.current, x.unit)} (${formatChange(x.change!, x.unit)}, ${x.sampleLabel})`).join(" / ") : "도입 전 기준값(Baseline)이 잠기지 않았거나 측정값이 없어 개선률을 제시할 수 없습니다. 실증·Evidence에서 Baseline을 먼저 잠그세요." },
    { q: "고객 개인정보는 어떻게 관리합니까?", a: `회원가입 시 필수·선택 동의를 분리하고 동의 시각·버전을 저장합니다(${PRIVACY_POLICY_URL ? "처리방침 연결됨" : isLive ? "처리방침 미설정 — 가입 닫힘" : "DEMO — 처리방침 미연결"}). 직원 계정은 고객 개인정보를 볼 수 없고, 탈퇴 시 계정·구매기록을 삭제합니다. 비회원 추천은 익명으로 기록합니다.` },
    { q: "데이터는 어디에 저장됩니까?", a: isLive ? "클라우드 데이터베이스(Supabase, PostgreSQL)에 저장되며, 대표·관리자·직원 역할별 접근 규칙이 데이터베이스에서 강제됩니다." : "현재는 DEMO 모드로 이 브라우저에만 저장됩니다. 운영 전환 시 클라우드 데이터베이스(Supabase)로 옮깁니다." },
    { q: "특허·기술 차별성은 무엇입니까?", a: patents.length ? `시스템에 기록된 상태: ${patents.map((t) => `${t.kind} ${t.status}`).join(", ")}. 세부 내용은 특허기술자료로 설명합니다.` : "설정 > 기술자산에 상태를 기록해 두면 이곳에 표시됩니다. 세부 내용은 특허기술자료로 설명합니다.", company: true },
    { q: "향후 매출·투자·고용 계획은?", a: "시스템 자료가 아닌 회사 계획입니다. 사업계획서 기준으로 대표가 답변합니다.", company: true },
  ];

  return (
    <div data-testid="inspection-guide">
      {!isLive && (
        <p className="mb-4 flex gap-2 rounded-xl p-3 text-[0.9rem] font-semibold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }} data-testid="inspection-demo-warning">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> DEMO 모드입니다. 현장확인에서 Demo 숫자를 실제 실적처럼 보여주면 안 됩니다. 실데이터로 전환한 뒤 사용하세요 (연습용으로만 사용).
        </p>
      )}

      <DataCard title="1. 하루 전 점검">
        <p className="mb-3 text-[0.88rem] text-ink-soft">입력이 멈춘 화면을 보여주지 않도록, 주간 운영 점검을 모두 정상으로 맞추고 시연 계정(대표)으로 로그인해 둡니다.</p>
        <WeeklyRoutineList />
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/ax/system" className="btn-secondary !min-h-[40px] text-[0.86rem]">공개 전 점검</Link>
          <Link href="/ax/business" className="btn-secondary !min-h-[40px] text-[0.86rem]">사업화 실적 자료 인쇄</Link>
          <Link href="/ax/reports/weekly" className="btn-secondary !min-h-[40px] text-[0.86rem]">주간 리포트 인쇄</Link>
        </div>
      </DataCard>

      <DataCard title="2. 시연 순서 (약 10분)" className="mt-6">
        <ol className="space-y-2.5" data-testid="inspection-steps">
          {steps.map((x, i) => (
            <li key={x.href} className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }} data-step={i + 1}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold"><span className="tabular text-ink-soft">{i + 1}.</span> {x.title}</div>
                  <p className="mt-1 text-[0.86rem]"><b>보여줄 것</b> {x.show}</p>
                  <p className="text-[0.86rem]"><b>설명</b> {x.say}</p>
                  <p className="break-any mt-1 text-[0.84rem]"><StatusBadge tone={isLive ? "primary" : "warning"}>{isLive ? "현재 근거" : "현재 근거 (DEMO)"}</StatusBadge> <span className="tabular">{x.evidence}</span></p>
                </div>
                <Link href={x.href} target={x.href.startsWith("/beauty") ? "_blank" : undefined} className="btn-secondary !min-h-[38px] shrink-0 text-[0.84rem]" aria-label={`화면 열기: ${x.title}`}>화면 열기{x.href.startsWith("/beauty") && <ExternalLink size={14} aria-hidden />}</Link>
              </div>
            </li>
          ))}
        </ol>
      </DataCard>

      <DataCard title="3. 예상 질문과 답변 근거" className="mt-6">
        <ul className="space-y-3" data-testid="inspection-qa">
          {qa.map((x) => (
            <li key={x.q} className="text-[0.88rem]">
              <div className="flex items-start gap-1.5 font-bold"><MessageCircleQuestion size={17} className="mt-0.5 shrink-0" aria-hidden style={{ color: "var(--primary)" }} />{x.q}{x.company && <StatusBadge tone="warning">대표 답변 준비</StatusBadge>}</div>
              <p className="break-any mt-0.5 pl-6">{x.a}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.8rem] text-ink-soft">답변은 이 시스템의 기능과 현재 기록만 근거로 합니다. 매출 계획·투자·고용 등 회사 계획은 사업계획서와 대표 답변으로 준비합니다.</p>
      </DataCard>
    </div>
  );
}
