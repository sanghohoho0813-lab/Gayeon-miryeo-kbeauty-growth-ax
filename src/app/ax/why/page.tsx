"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge } from "@/components/ax/Cards";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Database,
  Rocket,
  Sparkles,
} from "lucide-react";

const SCATTERED = ["채널별 판매", "재고", "OEM 생산", "B2B", "수출", "고객 반응"];

const PROBLEMS = [
  "판매가 늘어도 어떤 상품을 더 만들어야 할지 늦게 판단하게 됩니다.",
  "재고가 많아도 어느 채널에서 소진해야 할지 판단이 어렵습니다.",
  "고객 행동 데이터가 외부 플랫폼에 흩어져 회사 자산으로 남지 않습니다.",
];

const EXPANSION = ["MVP", "실제 데이터", "AI 고도화", "CRM/OMS/API 연동", "글로벌 확장"];

function StepTitle({ no, title }: { no: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[0.95rem] font-bold"
        style={{ background: "var(--primary)", color: "#fff" }}
      >
        {no}
      </span>
      <h2 className="text-[1.3rem] font-bold lg:text-[1.45rem]">{title}</h2>
    </div>
  );
}

export default function WhyPage() {
  return (
    <div className="reveal mx-auto max-w-[880px]">
      <PageHeader
        title="기획의도 — 왜 MIRYEO Growth AX인가"
        description="가연인터내셔널이 데이터 기반 K-Beauty 기업으로 전환하려는 이유를 3~5분 분량으로 정리했습니다."
      />

      <div className="space-y-6">
        <DataCard>
          <StepTitle no="01" title="왜 지금인가" />
          <p className="text-[1.02rem] leading-relaxed">
            MIRYEO는 여러 판매채널에서 성장하고 있습니다. 그러나 채널이 늘어날수록 데이터가 흩어지고,
            재고·생산·판매에 대한 판단은 점점 어려워집니다. 성장이 빠를수록 판단 지연의 비용도 커집니다.
          </p>
        </DataCard>

        <DataCard>
          <StepTitle no="02" title="기존 방식 — 흩어진 데이터" />
          <div className="flex flex-wrap gap-2.5">
            {SCATTERED.map((s) => (
              <span key={s} className="rounded-xl border px-4 py-2.5 text-[0.95rem] font-medium" style={{ borderColor: "var(--border)" }}>
                {s}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[0.98rem] leading-relaxed text-ink-soft">
            각 정보가 채널 관리자 화면, 엑셀, 담당자의 기억 속에 따로 존재합니다.
          </p>
        </DataCard>

        <DataCard>
          <StepTitle no="03" title="그래서 생기는 문제" />
          <ul className="space-y-2.5">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[1rem] leading-relaxed">
                <span className="mt-[0.55em] h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--danger)" }} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </DataCard>

        <DataCard>
          <StepTitle no="04" title="MIRYEO Growth AX" />
          <p className="text-[1.02rem] leading-relaxed">
            흩어진 판매·재고·생산·채널·고객 데이터를 하나의 운영 시스템으로 연결합니다.
            데이터가 모이면, AI가 성장률·재고일수·수익성을 계산해 다음 행동을 제안할 수 있습니다.
          </p>
        </DataCard>

        <div
          className="rounded-2xl border-2 p-6 lg:p-7"
          style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}
        >
          <div className="flex items-center gap-2.5 text-[1.05rem] font-bold" style={{ color: "var(--primary)" }}>
            <Building2 size={22} aria-hidden />
            05 · 가연인터내셔널이라면
          </div>
          <p className="mt-3 text-[1.05rem] leading-relaxed">
            가연인터내셔널은 단순히 판매 채널 하나를 운영하는 기업이 아니라, 여러 유통 경로와 OEM 생산,
            B2B 및 수출을 함께 운영합니다. 그렇기 때문에 각 채널의 데이터를 연결할수록 의사결정의 가치가
            커지는 구조를 이미 갖추고 있습니다.
          </p>
        </div>

        <DataCard>
          <StepTitle no="06" title="Before / After" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-surface-muted p-5">
              <div className="mb-3 font-bold text-ink-soft">Before</div>
              <FlowList items={["판매 발생", "데이터 분산", "대표 경험으로 판단"]} muted />
            </div>
            <div className="rounded-xl p-5" style={{ background: "var(--primary-soft)" }}>
              <div className="mb-3 font-bold" style={{ color: "var(--primary)" }}>
                After
              </div>
              <FlowList items={["판매 발생", "데이터 통합", "AI 분석", "생산·재고·채널 Action"]} />
            </div>
          </div>
        </DataCard>

        <DataCard>
          <StepTitle no="07" title="Customer Front 연결" />
          <FlowList
            items={[
              "외부 고객",
              "MIRYEO AI Beauty",
              "관심 / 추천 / 재구매 데이터",
              "Business AX",
              "상품기획 / 생산 / 판매전략",
            ]}
          />
          <div className="mt-5">
            <Link href="/beauty" className="btn-secondary text-[0.95rem]">
              고객 화면 직접 보기
              <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </DataCard>

        <div className="grid gap-6 md:grid-cols-2">
          <DataCard>
            <div className="flex items-center gap-2.5 font-bold" style={{ color: "var(--primary)" }}>
              <Database size={20} aria-hidden />
              08 · 데이터 자산화
            </div>
            <p className="mt-2.5 text-[0.98rem] leading-relaxed">
              고객·상품·채널·재고·추천 데이터를 외부 플랫폼이 아닌 회사 자산으로 축적합니다.
            </p>
          </DataCard>
          <DataCard>
            <div className="flex items-center gap-2.5 font-bold" style={{ color: "var(--primary)" }}>
              <Sparkles size={20} aria-hidden />
              09 · AI Growth Engine
            </div>
            <p className="mt-2.5 text-[0.98rem] leading-relaxed">
              데이터가 쌓일수록 생산·재고·채널·재구매 추천이 정교해지는 성장 엔진이 됩니다.
            </p>
          </DataCard>
        </div>

        <DataCard>
          <div className="mb-3 flex items-center gap-2.5 font-bold" style={{ color: "var(--primary)" }}>
            <Rocket size={20} aria-hidden />
            10 · 확장 로드맵
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {EXPANSION.map((e, i) => (
              <span key={e} className="flex items-center gap-2">
                <span
                  className="rounded-xl px-4 py-2.5 text-[0.95rem] font-semibold"
                  style={
                    i === 0
                      ? { background: "var(--primary)", color: "#fff" }
                      : { background: "var(--surface-muted)", color: "var(--text-primary)" }
                  }
                >
                  {e}
                </span>
                {i < EXPANSION.length - 1 && <ArrowRight size={16} className="text-ink-soft" aria-hidden />}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[0.9rem] text-ink-soft">
            현재 단계는 MVP이며, 실제 데이터 연동과 함께 순차적으로 확장합니다.
          </p>
        </DataCard>

        <div className="pb-4 text-center text-[0.85rem] text-ink-soft">
          가연인터내셔널 · MIRYEO Business AX · Powered by 미래AI랩
        </div>
      </div>
    </div>
  );
}

function FlowList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {items.map((item, i) => (
        <div key={item} className="flex flex-col gap-1.5">
          <span
            className="rounded-lg px-3.5 py-2 text-[0.95rem] font-medium"
            style={
              muted
                ? { background: "var(--surface)", border: "1px solid var(--border)" }
                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }
            }
          >
            {item}
          </span>
          {i < items.length - 1 && <ArrowDown size={15} className="ml-3 text-ink-soft" aria-hidden />}
        </div>
      ))}
    </div>
  );
}
