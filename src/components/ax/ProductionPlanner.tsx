"use client";

import { useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Modal } from "./Modal";
import { useModel } from "@/components/providers/DataProvider";
import { formatDateKR } from "@/lib/date";
import type { Product } from "@/lib/types";
import { baseScenario, compareSentences, deadlineLabel, isBase, planView, type PlanView, type Scenario } from "@/lib/scenario";

/* 생산 판단 한눈에 (PASS 21, D-076) — 같은 출발선 '오늘'에서 두 기간을 비교한다.
   위: 가용 재고가 버티는 기간 / 아래: 생산기간 + 안전일수. 끝 차이 = 착수까지 남은 여유(착수 마감). 소개 영상 장면 14와 같은 그림. */

const days1 = (v: number) => `${v.toFixed(1)}일분`;

function gapOf(v: PlanView) {
  if (v.coverDays == null || v.leadTimeDays == null) return null;
  const need = v.leadTimeDays + v.safetyDays;
  return { need, slack: v.coverDays - need };
}

export function CoverBar({ view, ghost, compact = false }: { view: PlanView; ghost?: PlanView; compact?: boolean }) {
  const g = gapOf(view);
  if (!g || view.coverDays == null || view.leadTimeDays == null) {
    return compact ? <span className="text-[0.76rem] text-ink-soft">-</span> : <p className="text-[0.86rem] text-ink-soft">생산기간과 판매·재고가 있어야 두 기간을 비교합니다.</p>;
  }
  const cover = view.coverDays;
  const max = Math.max(cover, g.need, ghost?.coverDays ?? 0) * 1.06 || 1;
  const pct = (d: number) => `${Math.max(0, Math.min(100, (d / max) * 100))}%`;
  const tone = view.daysToDeadline! <= 0 ? "var(--danger)" : view.daysToDeadline! <= 14 ? "var(--warning)" : "var(--success)";
  const gapText = g.slack >= 0 ? `여유 ${view.daysToDeadline}일` : `부족 약 ${Math.ceil(-g.slack)}일`;
  const summary = `재고가 버티는 기간 ${days1(cover)}, 생산 ${view.leadTimeDays}일 + 안전 ${view.safetyDays}일 = ${g.need}일, ${gapText} (착수 마감 ${deadlineLabel(view.daysToDeadline)})`;
  const lo = Math.min(cover, g.need), hi = Math.max(cover, g.need);
  if (compact) {
    return (
      <span className="relative block h-[22px] w-[150px]" role="img" aria-label={summary} title={summary} data-coverbar="compact">
        <span className="absolute left-0 top-[3px] h-[6px] rounded-full" style={{ width: pct(cover), background: "var(--accent)" }} />
        <span className="absolute left-0 top-[13px] h-[6px] rounded-l-full" style={{ width: pct(view.leadTimeDays), background: "var(--primary)" }} />
        <span className="absolute top-[13px] h-[6px] rounded-r-full" style={{ left: pct(view.leadTimeDays), width: pct(view.safetyDays), background: "color-mix(in srgb, var(--primary) 35%, #fff)" }} />
        <span className="absolute top-0 h-[22px] rounded-[3px]" style={{ left: pct(lo), width: `max(2px, ${pct(hi - lo)})`, background: `color-mix(in srgb, ${tone} 22%, transparent)`, outline: `1px dashed ${tone}` }} />
      </span>
    );
  }

  return (
    <div className="space-y-2.5" role="img" aria-label={summary} data-coverbar="full">
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.84rem]"><span className="font-semibold">재고가 버티는 기간</span><span className="tabular font-bold">{days1(cover)}</span></div>
        <div className="relative h-[18px] rounded-md" style={{ background: "var(--surface-muted)" }}>
          {ghost?.coverDays != null && Math.abs(ghost.coverDays - cover) > 0.05 && (
            <span className="absolute inset-y-0 left-0 rounded-md" style={{ width: pct(ghost.coverDays), border: "1.5px dashed color-mix(in srgb, var(--accent) 70%, #000)" }} title={`현재 조건 ${days1(ghost.coverDays)}`} />
          )}
          <span className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300" style={{ width: pct(cover), background: "var(--accent)" }} />
          {g.slack < 0 && <span className="absolute inset-y-0 rounded-r-md" style={{ left: pct(cover), width: pct(-g.slack), background: `color-mix(in srgb, ${tone} 14%, transparent)`, outline: `1.5px dashed ${tone}`, outlineOffset: -1.5 }} title={gapText} />}
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[0.84rem]"><span className="font-semibold">생산 + 안전재고에 필요한 기간</span><span className="tabular font-bold">{view.leadTimeDays}일 + {view.safetyDays}일 = {g.need}일</span></div>
        <div className="relative h-[18px] rounded-md" style={{ background: "var(--surface-muted)" }}>
          <span className="absolute inset-y-0 left-0 rounded-l-md transition-[width] duration-300" style={{ width: pct(view.leadTimeDays), background: "var(--primary)" }} />
          <span className="absolute inset-y-0 rounded-r-md transition-[left,width] duration-300" style={{ left: pct(view.leadTimeDays), width: pct(view.safetyDays), background: "color-mix(in srgb, var(--primary) 35%, #fff)" }} />
          {g.slack > 0 && <span className="absolute inset-y-0 rounded-md" style={{ left: pct(g.need), width: pct(g.slack), background: `color-mix(in srgb, ${tone} 14%, transparent)`, outline: `1.5px dashed ${tone}`, outlineOffset: -1.5 }} title={gapText} />}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[0.8rem]">
        <span className="font-semibold text-ink-soft">오늘부터</span>
        <span className="whitespace-nowrap rounded-full px-2 py-0.5 font-bold" style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }} data-testid="coverbar-gap">
          {gapText} → 착수 마감 {deadlineLabel(view.daysToDeadline)}
        </span>
      </div>
    </div>
  );
}

/** 현재 조건 그대로의 두 기간 비교 (상품 상세·Action 처리 창) */
export function CoverBarFor({ product, compact = false }: { product: Product; compact?: boolean }) {
  const m = useModel();
  const mm = m.metrics.get(product.id);
  if (!mm) return null;
  return <CoverBar view={planView(product, mm, m.planning, m.today)} compact={compact} />;
}

const SPEEDS = [-30, -15, 0, 15, 30, 50];

/** 조건 바꿔 보기 — 판매속도·추가 입고·생산기간을 바꾸면 착수 마감·추천 생산량을 다시 계산한다 (저장 안 함) */
export function ScenarioModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const m = useModel();
  const mm = m.metrics.get(product.id)!;
  const [sc, setSc] = useState<Scenario>(() => baseScenario(product));
  const [leadText, setLeadText] = useState(product.leadTimeDays ? String(product.leadTimeDays) : "");
  const [incText, setIncText] = useState("");
  const base = useMemo(() => planView(product, mm, m.planning, m.today), [product, mm, m.planning, m.today]);
  const next = useMemo(() => planView(product, mm, m.planning, m.today, sc), [product, mm, m.planning, m.today, sc]);
  const changed = !isBase(sc, product);
  const sentences = changed ? compareSentences(base, next, sc, product) : [];
  const reset = () => { setSc(baseScenario(product)); setLeadText(product.leadTimeDays ? String(product.leadTimeDays) : ""); setIncText(""); };
  const rows: [string, (v: PlanView) => string][] = [
    ["예측 일판매", (v) => `${v.forecastDaily.toFixed(1)}개`],
    ["가용 재고", (v) => `${v.availableStock.toLocaleString()}개${v.coverDays != null ? ` · ${days1(v.coverDays)}` : ""}`],
    ["착수 마감", (v) => (v.daysToDeadline == null ? (v.leadTimeDays ? "계산 불가" : "생산기간 필요") : `${deadlineLabel(v.daysToDeadline)} · ${formatDateKR(v.orderDeadline)}`)],
    ["추천 생산량", (v) => (v.recommendedOrder > 0 ? `${v.recommendedOrder.toLocaleString()}개` : "불필요")],
  ];

  return (
    <Modal open onClose={onClose} title={`조건 바꿔 보기 — ${product.name}`} maxWidth="max-w-2xl">
      <div data-testid="scenario-modal">
        <p className="mb-4 text-[0.84rem] text-ink-soft">저장되지 않는 계산입니다. 실제 데이터·Action은 바뀌지 않습니다.</p>
        <div className="grid gap-4 @xl:grid-cols-3">
          <fieldset className="@xl:col-span-3">
            <legend className="field-label">판매속도 (예측 일판매 {mm.forecastDaily.toFixed(1)}개 기준)</legend>
            <div className="flex flex-wrap gap-1.5" role="group">
              {SPEEDS.map((s) => (
                <button key={s} type="button" aria-pressed={sc.speedPct === s} onClick={() => setSc({ ...sc, speedPct: s })}
                  className="pressable min-h-[40px] rounded-xl border px-3 text-[0.88rem] font-semibold tabular"
                  style={sc.speedPct === s ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)" }}>
                  {s === 0 ? "지금 그대로" : `${s > 0 ? "+" : ""}${s}%`}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="field-label" htmlFor="sc-inc">추가 입고 (개)</label>
            <input id="sc-inc" className="field tabular" inputMode="numeric" placeholder="0" value={incText}
              onChange={(e) => { setIncText(e.target.value); const n = Number(e.target.value); setSc({ ...sc, extraIncoming: Number.isInteger(n) && n >= 0 ? n : 0 }); }} />
          </div>
          <div>
            <label className="field-label" htmlFor="sc-lead">OEM 생산기간 (일)</label>
            <input id="sc-lead" className="field tabular" inputMode="numeric" placeholder="미입력" value={leadText}
              onChange={(e) => { setLeadText(e.target.value); const n = Number(e.target.value); setSc({ ...sc, leadTimeDays: e.target.value.trim() && Number.isFinite(n) && n > 0 && n <= 365 ? Math.round(n) : null }); }} />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-secondary w-full !min-h-[46px]" onClick={reset} disabled={!changed}><RotateCcw size={16} aria-hidden /> 현재 조건으로</button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
          <CoverBar view={next} ghost={changed ? base : undefined} />
        </div>

        <table className="mt-4 w-full text-[0.9rem]" data-testid="scenario-table">
          <thead><tr className="text-left text-[0.8rem] text-ink-soft"><th className="py-1.5 font-semibold" scope="col">항목</th><th className="py-1.5 font-semibold" scope="col">현재</th><th className="py-1.5 font-semibold" scope="col">바꾼 조건</th></tr></thead>
          <tbody>
            {rows.map(([label, f]) => {
              const a = f(base), b = f(next);
              return (
                <tr key={label} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">{label}</th>
                  <td className="tabular py-2 pr-3" data-sc-base={label}>{a}</td>
                  <td className="tabular py-2 font-semibold" data-sc-next={label} style={a !== b ? { color: "var(--primary)" } : { color: "var(--text-secondary)" }}>{b}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sentences.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-xl px-4 py-3 text-[0.9rem]" style={{ background: "var(--primary-soft)" }} data-testid="scenario-sentences">
            {sentences.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
        <p className="mt-3 text-[0.76rem] text-ink-soft">착수 마감 = 재고가 버티는 기간 − (생산기간 + 안전 {m.planning.safetyDays}일), 소수점 버림. 추천 생산량 = 예측 일판매 × (생산기간 + 안전 {m.planning.safetyDays}일 + 입고 후 {m.planning.coverDays}일) − 가용 재고, 최소 생산수량 이상·{m.planning.roundTo}개 단위.</p>
      </div>
    </Modal>
  );
}

/** 조건 바꿔 보기 버튼 + 창 */
export function ScenarioButton({ product, className = "", label = "조건 바꿔 보기", variant = "button" }: { product: Product; className?: string; label?: string; variant?: "button" | "link" }) {
  const [open, setOpen] = useState(false);
  const cls = variant === "link"
    ? `inline-flex min-h-[28px] items-center gap-1 text-[0.78rem] font-semibold underline-offset-2 hover:underline ${className}`
    : `btn-secondary !min-h-[38px] !px-3 text-[0.84rem] ${className}`;
  return (
    <>
      <button type="button" className={cls} style={variant === "link" ? { color: "var(--primary)" } : undefined} onClick={(e) => { e.stopPropagation(); setOpen(true); }} aria-label={`${product.name} ${label}`} data-scenario-open={product.sku}>
        <SlidersHorizontal size={variant === "link" ? 13 : 15} aria-hidden /> {label}
      </button>
      {open && <ScenarioModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}
