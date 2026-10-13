"use client";

import { LineChart } from "lucide-react";
import { useModel } from "@/components/providers/DataProvider";
import { measureOutcome, OUTCOME_DAYS } from "@/lib/action-outcome";
import { formatDateKR } from "@/lib/date";
import type { GrowthAction } from "@/lib/types";

/* 사후 성과 (자동 측정) — Action 상세·Proof 확정·주간 리포트 공통 */
export function ActionOutcomeView({ action, compact = false }: { action: GrowthAction; compact?: boolean }) {
  const m = useModel();
  const o = measureOutcome(action, m.snapshot, m.today);
  if (action.status !== "DONE") return null;
  const fmt = (v: number, unit: string) => (unit === "원" ? `${Math.round(v).toLocaleString()}원` : `${v.toLocaleString()}${unit}`);
  return (
    <div className={`${compact ? "mt-2" : "mt-5"} rounded-xl border p-3`} style={{ borderColor: "var(--border)" }} data-testid="action-outcome" data-measurable={o.measurable ? "1" : "0"} data-complete={o.complete ? "1" : "0"}>
      <div className="flex flex-wrap items-center gap-1.5 text-[0.84rem] font-semibold"><LineChart size={15} aria-hidden /> 사후 성과 (자동 측정{o.target ? ` · ${o.target}` : ""})</div>
      {!o.measurable ? <p className="mt-1 text-[0.84rem] text-ink-soft">{o.reason}</p> : !o.after || o.after.days === 0 ? (
        <p className="mt-1 text-[0.84rem] text-ink-soft">완료 후 판매 기록이 쌓이면 측정합니다 (완료일부터 {OUTCOME_DAYS}일, 어제까지·판매 기록이 있는 날까지).</p>
      ) : (
        <>
          <p className="mt-0.5 text-[0.78rem] text-ink-soft tabular">실행 전 {formatDateKR(o.before!.from)}~{formatDateKR(o.before!.to)} vs 완료 후 {formatDateKR(o.after.from)}~{formatDateKR(o.after.to)}{o.complete ? "" : ` · 측정 중 (${o.after.days}/${OUTCOME_DAYS}일)`}</p>
          <table className="mt-1.5 w-full text-[0.84rem]">
            <thead><tr className="text-left text-[0.76rem] text-ink-soft"><th className="font-semibold">지표</th><th className="font-semibold">실행 전</th><th className="font-semibold">완료 후</th><th className="font-semibold">변화</th></tr></thead>
            <tbody>
              {o.metrics.map((x) => (
                <tr key={x.label}><td>{x.label}</td><td className="tabular">{fmt(x.before, x.unit)}</td><td className="tabular">{fmt(x.after, x.unit)}</td><td className="tabular font-semibold">{x.change == null ? "—" : `${x.change > 0 ? "+" : ""}${Math.round(x.change * 1000) / 10}%`}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[0.74rem] text-ink-soft">기록된 판매로 계산한 전후 비교입니다. 같은 기간의 시즌·행사·재고 등 다른 요인이 함께 반영되어 인과를 증명하지 않습니다.</p>
        </>
      )}
    </div>
  );
}
