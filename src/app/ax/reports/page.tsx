"use client";

import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, KpiCard, StatusBadge } from "@/components/ax/Cards";
import { useAxData } from "@/lib/useAxData";
import { formatKRW, formatPct } from "@/lib/analytics";
import { ArrowRight, BarChart3, Boxes, Repeat, Target } from "lucide-react";

const BEFORE_AFTER = [
  {
    label: "데이터 확인",
    before: "판매·재고·채널 데이터가 채널별 관리자와 엑셀에 분산",
    after: "하나의 Dashboard에서 통합 확인",
  },
  {
    label: "생산 판단",
    before: "대표 경험과 감으로 생산량 결정",
    after: "판매속도·재고일수 기반 AI 생산 추천",
  },
  {
    label: "재고 관리",
    before: "품절·과잉을 사후에 인지",
    after: "품절위험·과잉재고 SKU 사전 경고",
  },
  {
    label: "고객 데이터",
    before: "고객 행동이 외부 플랫폼에 흩어짐",
    after: "AI Beauty 행동 데이터를 회사 자산으로 축적",
  },
];

export default function ReportsPage() {
  const { kpis, actions, channels } = useAxData();
  const channelConcentration = Math.round(
    (Math.max(...channels.map((c) => c.monthRevenue)) / kpis.monthRevenue) * 100
  );

  return (
    <div className="reveal">
      <PageHeader
        title="실증·리포트"
        description="AX 도입 전후 변화와 개선 추이를 정리합니다. 대표 보고와 사업화·정책 자료로 활용할 수 있습니다."
        actions={<StatusBadge tone="neutral">DEMO 상태 · 실데이터 축적 후 자동 갱신</StatusBadge>}
      />

      {/* 주요 지표 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="이번 달 매출 변화"
          value={formatPct(kpis.monthGrowthRate)}
          icon={<BarChart3 size={22} />}
          sub={`${formatKRW(kpis.monthRevenue)} (전월 대비)`}
        />
        <KpiCard
          label="재고 위험 SKU"
          value={`${kpis.stockRiskSku}개`}
          icon={<Boxes size={22} />}
          tone={kpis.stockRiskSku > 0 ? "warning" : "default"}
          sub={`과잉 ${kpis.overStockSku}개 포함 관찰 중`}
        />
        <KpiCard
          label="채널 집중도"
          value={`${channelConcentration}%`}
          icon={<Target size={22} />}
          sub="최대 채널 매출 비중"
        />
        <KpiCard
          label="AI Action 처리"
          value={`${actions.length}건 제안`}
          icon={<Repeat size={22} />}
          sub="이번 달 생성된 Action"
        />
      </div>

      {/* SKU 성장 / B2B·수출 성장 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DataCard title="성장 지표 요약">
          <ul className="space-y-3 text-[0.98rem]">
            <li className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5">
              <span>성장 SKU 비중</span>
              <span className="font-bold">
                {kpis.growingSku} / {kpis.totalSku}개
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5">
              <span>B2B·수출 성장률</span>
              <span className="font-bold" style={{ color: "var(--success)" }}>
                {formatPct(kpis.b2bExportGrowthRate)}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5">
              <span>부진 SKU</span>
              <span className="font-bold">{kpis.decliningSku}개</span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5">
              <span>재고 회전 관찰 대상</span>
              <span className="font-bold">{kpis.stockRiskSku + kpis.overStockSku}개 SKU</span>
            </li>
          </ul>
          <p className="mt-4 text-[0.88rem] text-ink-soft">
            실제 데이터 연동 후에는 기간별 추이 그래프와 AX 도입 전후 비교 수치가 자동으로 축적됩니다.
          </p>
        </DataCard>

        <DataCard title="Before / After">
          <ul className="space-y-3.5">
            {BEFORE_AFTER.map((row) => (
              <li key={row.label} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="mb-2 font-bold">{row.label}</div>
                <div className="grid items-center gap-2 text-[0.92rem] sm:grid-cols-[1fr_auto_1fr]">
                  <div className="rounded-lg bg-surface-muted p-3 text-ink-soft">{row.before}</div>
                  <ArrowRight size={18} className="mx-auto hidden text-ink-soft sm:block" aria-hidden />
                  <div className="rounded-lg p-3 font-medium" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                    {row.after}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </DataCard>
      </div>
    </div>
  );
}
