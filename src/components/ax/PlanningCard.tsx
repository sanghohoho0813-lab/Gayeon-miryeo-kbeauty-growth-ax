"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { computeProductMetrics } from "@/lib/analytics";
import { DEFAULT_PLANNING, isDefaultPlanning, OUTCOME_OPTIONS, PLANNING_LIMITS, planningPatch, validatePlanning, type PlanningKey } from "@/lib/planning";
import type { PlanningSettings } from "@/lib/types";
import { formatDateKR } from "@/lib/date";

/* 운영 기준값 (PASS 15, R-21·R-23) — 생산 계획 안전일수·입고 후 판매 일수·생산 단위, Action 사후 성과 측정 기간.
   대표만 바꾸고(DB: org_update = OWNER), 저장 전에 가장 급한 상품의 착수 마감·추천 생산량이 어떻게 바뀌는지 보여 준다. */
const KEYS: PlanningKey[] = ["safetyDays", "coverDays", "roundTo"];

export function PlanningCard() {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const owner = can(role, "manage_org");
  const cur = m.planning;
  const [draft, setDraft] = useState<Record<PlanningKey, string>>(() => ({ safetyDays: String(cur.safetyDays), coverDays: String(cur.coverDays), roundTo: String(cur.roundTo) }));
  const [outcome, setOutcome] = useState<number>(cur.outcomeDays);
  const { value, errors } = validatePlanning({ ...draft, outcomeDays: outcome });
  const dirty = !!value && (Object.keys(DEFAULT_PLANNING) as (keyof PlanningSettings)[]).some((k) => value[k] !== cur[k]);

  // 영향 미리보기 — 생산기간이 입력된 상품 중 착수 마감이 가장 가까운 상품
  const preview = useMemo(() => {
    if (!value) return null;
    const s = m.snapshot;
    const rows = s.products
      .filter((p) => p.leadTimeDays)
      .map((p) => {
        const inv = s.inventory.find((i) => i.productId === p.id);
        return { p, now: m.metrics.get(p.id)!, next: computeProductMetrics(p, inv, s.sales, m.today, m.salesAsOf, value) };
      })
      .filter((x) => x.now?.daysToDeadline != null)
      .sort((a, b) => a.now.daysToDeadline! - b.now.daysToDeadline!);
    return rows[0] ?? null;
  }, [m, value]);

  const set = (k: PlanningKey, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async (next: PlanningSettings) => {
    try {
      await run((src) => src.updateOrg({ planning: planningPatch(next) }));
      toast(isDefaultPlanning(next) ? "기본값으로 되돌렸습니다" : "운영 기준값을 저장했습니다 — 생산 판단·사후 성과에 바로 반영됩니다");
    } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
  };
  const dl = (x: { daysToDeadline: number | null; orderDeadline: string | null }) => (x.daysToDeadline == null || !x.orderDeadline ? "-" : `${formatDateKR(x.orderDeadline).slice(5)} (${x.daysToDeadline <= 0 ? "지남" : `D-${x.daysToDeadline}`})`);

  return (
    <DataCard title="운영 기준값" id="planning" className="@4xl:col-span-2" subtitle="생산 착수·추천 생산량과 Action 사후 성과 측정에 쓰는 기준 — 실제 OEM 계약 조건·상품 회전에 맞게 조정" action={
      <StatusBadge tone={isDefaultPlanning(cur) ? "neutral" : "primary"}>{isDefaultPlanning(cur) ? "기본값 사용 중" : "조정됨"}</StatusBadge>
    }>
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-3 @xl:grid-cols-2" data-testid="planning-form">
          {KEYS.map((k) => {
            const L = PLANNING_LIMITS[k];
            return (
              <div key={k}>
                <label className="field-label" htmlFor={`pl-${k}`}>{L.label} <span className="font-normal text-ink-soft">(기본 {DEFAULT_PLANNING[k]}{L.unit})</span></label>
                <div className="flex items-center gap-2">
                  <input id={`pl-${k}`} inputMode="numeric" className="field tabular" value={draft[k]} disabled={!owner} onChange={(e) => set(k, e.target.value)} aria-describedby={`pl-${k}-help`} />
                  <span className="shrink-0 text-[0.9rem] text-ink-soft">{L.unit}</span>
                </div>
                <p id={`pl-${k}-help`} className="mt-1 text-[0.8rem] leading-snug text-ink-soft">{L.min}~{L.max}{L.unit}. {L.help}</p>
              </div>
            );
          })}
          <div>
            <span className="field-label" id="pl-outcome-label">사후 성과 측정 기간 <span className="font-normal text-ink-soft">(기본 {DEFAULT_PLANNING.outcomeDays}일)</span></span>
            <div className="flex gap-1.5" role="radiogroup" aria-labelledby="pl-outcome-label">
              {OUTCOME_OPTIONS.map((d) => (
                <button key={d} role="radio" aria-checked={outcome === d} disabled={!owner} onClick={() => setOutcome(d)} className="pressable min-h-[42px] flex-1 rounded-xl border text-[0.9rem] font-semibold disabled:opacity-60" style={outcome === d ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>{d}일</button>
              ))}
            </div>
            <p className="mt-1 text-[0.8rem] leading-snug text-ink-soft">완료한 Action의 효과를 완료 후 며칠 동안 보고, 완료 전 같은 일수와 비교할지. 회전이 느린 상품은 28일</p>
          </div>
        </div>

        <div className="rounded-xl bg-surface-muted p-3.5 text-[0.88rem]" data-testid="planning-preview">
          <div className="font-semibold">저장하면 바뀌는 것 (미리보기)</div>
          {!preview ? (
            <p className="mt-1 text-ink-soft">생산기간이 입력된 상품이 없어 미리볼 수 없습니다. 상품에 OEM 생산기간을 입력하면 착수 마감·추천 생산량에 반영됩니다.</p>
          ) : (
            <>
              <p className="mt-1 text-ink-soft">착수 마감이 가장 가까운 <b className="text-ink">{preview.p.name}</b> (생산기간 {preview.p.leadTimeDays}일)</p>
              <dl className="tabular mt-2 space-y-1">
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">생산 착수 마감</dt><dd className="font-semibold" data-testid="preview-deadline">{dl(preview.now)} → {dl(preview.next)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">추천 생산량</dt><dd className="font-semibold" data-testid="preview-order">{preview.now.recommendedOrder.toLocaleString()}개 → {preview.next.recommendedOrder.toLocaleString()}개</dd></div>
              </dl>
            </>
          )}
          {value && value.outcomeDays !== cur.outcomeDays && <p className="mt-2 text-ink-soft">사후 성과: 완료 후 {cur.outcomeDays}일 → <b className="text-ink">{value.outcomeDays}일</b> 기준으로 다시 계산 (기록은 그대로)</p>}
        </div>
      </div>

      {errors.length > 0 && <p className="mt-3 text-[0.86rem]" style={{ color: "var(--danger)" }} role="alert">{errors.join(" · ")}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {owner ? (
          <>
            <button className="btn-primary" disabled={!value || !dirty} onClick={() => value && void save(value)} data-testid="planning-save">저장</button>
            <button className="btn-secondary" disabled={isDefaultPlanning(cur)} onClick={() => { setDraft({ safetyDays: String(DEFAULT_PLANNING.safetyDays), coverDays: String(DEFAULT_PLANNING.coverDays), roundTo: String(DEFAULT_PLANNING.roundTo) }); setOutcome(DEFAULT_PLANNING.outcomeDays); void save(DEFAULT_PLANNING); }} data-testid="planning-reset"><RotateCcw size={15} aria-hidden /> 기본값으로</button>
          </>
        ) : <p className="text-[0.84rem] text-ink-soft">운영 기준값은 대표(OWNER)만 바꿀 수 있습니다.</p>}
        <span className="text-[0.8rem] text-ink-soft">기본값은 업계 일반값입니다. 근거 없이 바꾸지 말고, OEM 계약서·실제 입고 주기를 확인한 뒤 조정하세요.</span>
      </div>
    </DataCard>
  );
}
