"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Building2, CircleHelp, Database, LayoutDashboard, Repeat, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { StatusBadge } from "@/components/ax/Cards";

/* 기획의도 — 회사 맞춤 16 Section Story (v4.1 Why AX Standard)
   확인되지 않은 회사 사실(매출·고객수·수출국·특허 등)은 쓰지 않고 "확인 필요"로 표시한다. */

function Section({ no, title, children, tone }: { no: string; title: string; children: ReactNode; tone?: "company" }) {
  return (
    <section className="ax-card p-6 @3xl:p-7" style={tone === "company" ? { borderColor: "var(--primary)", borderWidth: 2, background: "var(--primary-soft)" } : undefined}>
      <div className="mb-3 flex items-center gap-3">
        <span className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[0.9rem] font-bold text-white" style={{ background: tone === "company" ? "var(--highlight)" : "var(--primary)", color: tone === "company" ? "#171B20" : "#fff" }}>{no}</span>
        <h2 className="text-[1.25rem] font-bold leading-snug @3xl:text-[1.38rem]">{title}</h2>
      </div>
      <div className="text-[1rem] leading-relaxed">{children}</div>
    </section>
  );
}

function Flow({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {items.map((t, i) => (
        <div key={t} className="flex flex-col gap-1.5">
          <span className="rounded-lg border px-3.5 py-2 text-[0.93rem] font-medium" style={{ borderColor: "var(--border)", background: muted ? "var(--surface-muted)" : "var(--surface)" }}>{t}</span>
          {i < items.length - 1 && <ArrowDown size={15} className="ml-3 text-ink-soft" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

const TODO = <StatusBadge tone="warning">확인 필요</StatusBadge>;

export default function WhyPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="기획의도 — 왜 MIRYEO Growth AX인가" description="가연인터내셔널이 데이터와 AX를 실제 K-Beauty 사업에 적용하려는 이유를 5분 분량으로 정리했습니다. 회사 수치는 1차 체크리스트로 확인 후 채웁니다." />
      <div className="stagger space-y-5">
        <Section no="01" title="회사의 현재 — Demand Proof">
          <p>가연인터내셔널은 MIRYEO 관련 K-Beauty 사업을 운영하며, 여러 판매채널·OEM 생산·B2B·수출이 연결된 구조를 전제로 이 시스템을 설계했습니다.</p>
          <ul className="mt-3 grid gap-2 @xl:grid-cols-2">
            {["최근 매출 규모", "운영 채널 수·채널별 비중", "판매 SKU 수", "B2B 거래처 수", "수출 국가/권역", "월 OEM 생산 횟수"].map((x) => (
              <li key={x} className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-2.5 text-[0.92rem]">{x} {TODO}</li>
            ))}
          </ul>
          <p className="mt-3 text-[0.88rem] text-ink-soft">가연인터내셔널·MIRYEO 브랜드·OEM 업체를 같은 법인으로 가정하지 않습니다. 사실 확인 전 수치는 쓰지 않습니다.</p>
        </Section>

        <Section no="02" title="왜 지금 바꿔야 하는가">
          채널과 SKU가 늘수록 판매·재고·생산 정보가 채널 관리자 화면, 엑셀, 담당자 메신저로 흩어집니다. 성장이 빠를수록 &lsquo;어떤 제품을 더 만들지&rsquo; 판단이 늦어질 때의 손실(품절·과잉재고)도 커집니다.
        </Section>

        <Section no="03" title="AX란 무엇인가 (쉽게)">
          회사의 일을 <b>하나의 데이터 흐름</b>으로 연결하고, 반복 계산은 시스템이 하며, 중요한 판단에는 근거와 다음 행동을 제안하되 <b>결정과 실행은 사람이</b> 하고, 그 결과를 다시 기록해 회사의 경험을 쌓는 것입니다.
        </Section>

        <Section no="04" title="K-Beauty에서 AX가 중요한 이유">
          화장품은 SKU가 많고, 채널마다 할인·재고 조건이 다르며, OEM 생산 리드타임 때문에 &lsquo;지금의 판매 신호&rsquo;를 몇 주 먼저 읽어야 합니다. 고객의 피부 고민과 관심 제품 데이터가 쌓이면 상품기획과 재구매 전략의 근거가 됩니다.
        </Section>

        <Section no="05" title="현재 업무 흐름 (추정 — 체크리스트로 확인)">
          <Flow muted items={["채널별 판매 발생", "채널 관리자 화면·엑셀에서 각각 확인", "담당자가 취합 보고", "대표가 경험으로 판단", "OEM 발주·채널 대응 (기록 분산)"]} />
        </Section>

        <Section no="06" title="반복되는 문제 — 돈·시간·매출이 새는 곳">
          <div className="grid gap-3 @xl:grid-cols-3">
            {[["MONEY LEAK", "품절로 놓친 판매, 과잉재고 비용"], ["TIME LEAK", "채널별 현황 취합·보고 시간"], ["REVENUE LEAK", "외부 플랫폼에 흩어진 고객 반응, 재구매 시점 누락"]].map(([t, d]) => (
              <div key={t} className="rounded-xl bg-surface-muted p-4"><div className="text-[0.82rem] font-bold" style={{ color: "var(--danger)" }}>{t}</div><div className="mt-1 text-[0.93rem]">{d}</div></div>
            ))}
          </div>
        </Section>

        <Section no="07" title="가연인터내셔널이라면" tone="company">
          <div className="flex gap-3"><Building2 size={22} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} aria-hidden />
            <p>판매 채널이 여럿이고 OEM 생산·B2B·수출까지 연결되는 구조에서는, <b>판매속도 → 재고일수 → 생산 판단</b>을 하나로 묶는 것이 핵심입니다. 여기에 MIRYEO AI Beauty의 고객 행동을 더하면, 외부 플랫폼에서는 알 수 없던 &lsquo;왜 이 제품을 찾는지(피부 고민)&rsquo;까지 판단 근거가 됩니다.</p>
          </div>
        </Section>

        <Section no="08" title="Customer Front(MIRYEO AI Beauty)가 바꾸는 것">
          <div className="grid gap-3 @xl:grid-cols-2">
            <Flow items={["고객이 피부 고민 선택", "AI Beauty Finder 추천", "Beauty Passport 저장", "제품 상세 → 구매채널"]} />
            <p className="text-[0.95rem] text-ink-soft">Primary Conversion은 &lsquo;Finder 완료 후 Passport 저장&rsquo;입니다. 개인정보 없이 익명 세션으로 기록되며, 이 행동이 회사 고유의 고객 데이터가 됩니다.</p>
          </div>
        </Section>

        <Section no="09" title="Business AX가 바꾸는 것 — Data Bridge">
          <div className="grid items-center gap-2 text-center text-[0.9rem] @xl:grid-cols-5">
            {[[Users, "고객 행동"], [Database, "Data Foundation"], [Sparkles, "RULE 판단"], [LayoutDashboard, "사람의 Action"], [ShieldCheck, "Proof Event"]].map(([I, t], i) => {
              const Icon = I as typeof Users;
              return (
                <div key={t as string} className="flex items-center gap-2 @xl:flex-col">
                  <div className="flex w-full flex-col items-center gap-1 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><Icon size={20} style={{ color: "var(--primary)" }} aria-hidden /><span className="font-semibold">{t as string}</span></div>
                  {i < 4 && <ArrowRight size={16} className="shrink-0 text-ink-soft @xl:hidden" aria-hidden />}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[0.93rem] text-ink-soft">고객 관심이 오르면 &lsquo;고객 관심 상승&rsquo; Action이 생기고, 사람이 실행을 선택하면 결과가 다시 고객 화면(주목받는 제품)과 실증 리포트로 돌아갑니다.</p>
        </Section>

        <Section no="10" title="AI가 실제로 하는 일 — 그리고 하지 않는 일">
          <div className="grid gap-3 @xl:grid-cols-2">
            <div className="rounded-xl bg-surface-muted p-4 text-[0.93rem]"><div className="font-bold">지금 (RULE / STATISTICAL)</div><ul className="mt-1 list-disc pl-5 text-ink-soft"><li>성장률·재고일수·추천 발주량 계산</li><li>고객 관심점수 7일 비교</li><li>Beauty 추천 (효능 주장 없는 분류 기반)</li></ul></div>
            <div className="rounded-xl bg-surface-muted p-4 text-[0.93rem]"><div className="font-bold">다음 (CONDITIONAL)</div><ul className="mt-1 list-disc pl-5 text-ink-soft"><li>LLM: 경영 요약·설명 문장</li><li>RAG: 회사 문서 기반 질의</li><li>자동 실행(L4)은 하지 않음</li></ul></div>
          </div>
        </Section>

        <Section no="11" title="AI → Action → Result → Proof">
          <Flow items={["추천 (근거·사용 데이터 표시)", "검토 → 승인·담당자 지정 (KPI Before 저장)", "실행 메모", "결과 기록 (KPI After 저장)", "Proof Event → 대표 결과 확정"]} />
        </Section>

        <Section no="12" title="매출이 올라가는 구조">
          <ul className="space-y-2">
            {[["품절 방지", "성장 SKU를 재고 소진 전에 감지해 판매기회 손실을 줄입니다"], ["채널 최적화", "할인율·성장률로 물량 배분 판단"], ["재구매", "구매 주기가 지난 고객을 놓치지 않음"], ["전환", "Finder → Passport → 구매채널 이동 흐름 개선"]].map(([t, d]) => (
              <li key={t} className="flex gap-2"><Repeat size={18} className="mt-1 shrink-0" style={{ color: "var(--accent)" }} aria-hidden /><span><b>{t}</b> — {d}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-[0.86rem] text-ink-soft">개선 효과 수치는 Baseline 측정 후 실측으로만 제시합니다.</p>
        </Section>

        <Section no="13" title="데이터가 회사 자산이 되는 구조">
          <p>12개월 동안 판매·재고·고객 고민·Action 결과가 쌓이면: 시즌별 수요 패턴, 고민별 제품 반응, &lsquo;어떤 대응이 실제로 효과가 있었는지&rsquo;의 기록이 남습니다. 이는 외부 플랫폼이 대신 가져갈 수 없는 자사 데이터입니다.</p>
        </Section>

        <Section no="14" title="실증 — 12주 Evidence Plan">
          <div className="grid gap-2 @xl:grid-cols-4">
            {["Week 0 Baseline", "Week 1~4 첫 Proof", "Week 5~8 Business Lift", "Week 9~12 Evidence Pack"].map((w) => <div key={w} className="rounded-xl bg-surface-muted p-3 text-center text-[0.9rem] font-semibold">{w}</div>)}
          </div>
          <Link href="/ax/reports" className="btn-secondary mt-4">실증·Evidence 보기 <ArrowRight size={16} aria-hidden /></Link>
        </Section>

        <Section no="15" title="정책·기술사업화와의 관계">
          <div className="flex items-start gap-2 rounded-xl p-4" style={{ background: "var(--warning-soft)" }}>
            <CircleHelp size={19} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} aria-hidden />
            <p className="text-[0.93rem]">정책 문구는 작성 시점의 공식기관 자료(중소벤처기업부·중진공·신보·기보 등)를 확인한 뒤 기관 / 핵심 흐름 / 우리 회사와의 연결점 / 확인 기준일 / 출처 형식으로 채웁니다. <b>현재 상태: READY (확인 기준일 미정)</b>. 이 시스템의 존재 이유는 정책자금이 아니라 실제 운영 가치입니다.</p>
          </div>
        </Section>

        <Section no="16" title="확장 로드맵 · 우리가 얻는 것">
          <div className="flex flex-wrap items-center gap-2">
            {[["PILOT (현재)", true], ["실데이터 연동", false], ["LLM 요약 (NEXT)", false], ["채널 API·CRM (NEXT)", false], ["글로벌 확장 (NEXT)", false]].map(([t, now], i, arr) => (
              <span key={t as string} className="flex items-center gap-2">
                <span className="rounded-xl px-3.5 py-2 text-[0.9rem] font-semibold" style={now ? { background: "var(--primary)", color: "#fff" } : { background: "var(--surface-muted)" }}>{t as string}</span>
                {i < arr.length - 1 && <ArrowRight size={15} className="text-ink-soft" aria-hidden />}
              </span>
            ))}
          </div>
          <ul className="mt-4 grid gap-2 text-[0.93rem] @xl:grid-cols-2">
            {["판단에 필요한 자료 찾기 시간 ↓", "품절·과잉 늦은 발견 ↓", "자사 고객 데이터 ↑", "판단 → 실행 → 결과 기록 ↑"].map((x) => <li key={x} className="rounded-xl bg-surface-muted px-4 py-2.5 font-semibold">{x}</li>)}
          </ul>
          <Link href="/ax" className="btn-primary mt-5">대시보드로 돌아가기</Link>
        </Section>
        <p className="pb-4 text-center text-[0.82rem] text-ink-soft">가연인터내셔널 · MIRYEO Business AX · Powered by 미래AI랩</p>
      </div>
    </div>
  );
}
