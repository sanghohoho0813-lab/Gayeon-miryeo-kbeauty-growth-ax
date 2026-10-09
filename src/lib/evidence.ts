import type { DataSnapshot } from "./data/source";
import type { BaselineSource, KpiBaseline, KpiKey } from "./types";
import { addDaysISO, todayISO } from "./date";

/* Money KPI 3 측정 + Baseline 비교 — 실증·Evidence 화면과 주간 리포트가 같은 계산을 쓴다.
   Baseline이 없으면 개선률을 만들지 않는다 (TARGET: DO NOT INVENT). */

export const BASELINE_SOURCE_LABEL: Record<BaselineSource, string> = {
  SYSTEM: "시스템 측정",
  SELF_REPORT: "담당자 자기기록",
  DOCUMENT: "기존 문서·엑셀",
};

export interface DateRange {
  from: string; // YYYY-MM-DD (포함)
  to: string; // YYYY-MM-DD (포함)
}

export interface MoneyKpiDef {
  key: KpiKey;
  name: string;
  unit: string;
  direction: "lower" | "higher";
  point: string;
  method: string;
}

export const MONEY_KPIS: MoneyKpiDef[] = [
  { key: "COST", name: "Action 대응 리드타임", unit: "시간", direction: "lower", point: "Action 생성 → 실행 착수(승인)", method: "action_events: NEW 생성 시각 → IN_PROGRESS 전환 시각 평균" },
  { key: "REVENUE", name: "Finder → Passport 저장 전환율", unit: "%", direction: "higher", point: "customer_events 세션 기준", method: "기간 내 finder_complete 세션 중 passport_save 세션 비율" },
  { key: "SCALE", name: "주당 완료 Action", unit: "건/주", direction: "higher", point: "action_events DONE 전환", method: "기간 내 DONE 전환 수 ÷ 기간(주)" },
];

export interface MoneyKpiMeasure extends MoneyKpiDef {
  current: number | null;
  sample: number;
  sampleLabel: string;
  baseline: KpiBaseline | null;
  history: KpiBaseline[];
  change: { abs: number; pct: number | null; improved: boolean } | null;
}

const seoulDate = (iso: string) => todayISO(new Date(iso));
const inRange = (iso: string, r: DateRange) => {
  const d = seoulDate(iso);
  return d >= r.from && d <= r.to;
};

export function lastDays(days: number, today = todayISO()): DateRange {
  return { from: addDaysISO(today, -(days - 1)), to: today };
}

export function activeBaseline(baselines: KpiBaseline[], key: KpiKey): KpiBaseline | null {
  return baselines.filter((b) => b.kpiKey === key && !b.supersededAt).sort((a, b) => b.lockedAt.localeCompare(a.lockedAt))[0] ?? null;
}

export function measureKpi(s: DataSnapshot, key: KpiKey, r: DateRange): { value: number | null; sample: number; sampleLabel: string } {
  if (key === "COST") {
    const hours: number[] = [];
    for (const e of s.actionEvents) {
      if (e.toStatus !== "IN_PROGRESS" || !inRange(e.createdAt, r)) continue;
      const a = s.actions.find((x) => x.id === e.growthActionId);
      if (a) hours.push(Math.max(0, (Date.parse(e.createdAt) - Date.parse(a.createdAt)) / 3_600_000));
    }
    return { value: hours.length ? round(hours.reduce((x, y) => x + y, 0) / hours.length, 1) : null, sample: hours.length, sampleLabel: `승인 ${hours.length}건` };
  }
  if (key === "REVENUE") {
    const finder = new Set<string>();
    const passport = new Set<string>();
    for (const e of s.customerEvents) {
      if (!inRange(e.createdAt, r)) continue;
      if (e.eventType === "finder_complete") finder.add(e.sessionId);
      if (e.eventType === "passport_save") passport.add(e.sessionId);
    }
    const converted = [...finder].filter((id) => passport.has(id)).length;
    return { value: finder.size ? round((converted / finder.size) * 100, 1) : null, sample: finder.size, sampleLabel: `Finder 완료 ${finder.size}세션` };
  }
  const done = s.actionEvents.filter((e) => e.toStatus === "DONE" && inRange(e.createdAt, r)).length;
  const days = Math.max(1, Math.round((Date.parse(`${r.to}T00:00:00Z`) - Date.parse(`${r.from}T00:00:00Z`)) / 86_400_000) + 1);
  return { value: done ? round(done / (days / 7), 1) : null, sample: done, sampleLabel: `완료 ${done}건 / ${days}일` };
}

export function compareToBaseline(def: MoneyKpiDef, current: number | null, baseline: KpiBaseline | null): MoneyKpiMeasure["change"] {
  if (current == null || !baseline || baseline.unit !== def.unit) return null;
  const abs = round(current - baseline.value, 1);
  const pct = baseline.value > 0 ? (current - baseline.value) / baseline.value : null;
  const improved = def.direction === "lower" ? current < baseline.value : current > baseline.value;
  return { abs, pct, improved };
}

export function measureMoneyKpis(s: DataSnapshot, r: DateRange): MoneyKpiMeasure[] {
  return MONEY_KPIS.map((def) => {
    const { value, sample, sampleLabel } = measureKpi(s, def.key, r);
    const baseline = activeBaseline(s.baselines, def.key);
    return {
      ...def,
      current: value,
      sample,
      sampleLabel,
      baseline,
      history: s.baselines.filter((b) => b.kpiKey === def.key).sort((a, b) => b.lockedAt.localeCompare(a.lockedAt)),
      change: compareToBaseline(def, value, baseline),
    };
  });
}

export function formatKpiValue(v: number | null, unit: string): string {
  if (v == null) return "측정값 없음";
  return unit === "%" ? `${v}%` : `${v}${unit === "시간" ? "시간" : ` ${unit}`}`;
}

export function formatChange(c: NonNullable<MoneyKpiMeasure["change"]>, unit: string): string {
  const sign = c.abs > 0 ? "+" : "";
  const pct = c.pct == null ? "" : ` (${sign}${round(c.pct * 100, 1)}%)`;
  return `${sign}${c.abs}${unit === "%" ? "%p" : unit === "시간" ? "시간" : ` ${unit}`}${pct}`;
}

function round(v: number, d: number): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/* ---------- 주 단위 (월~일, Asia/Seoul) ---------- */
export function weekRange(anyDate: string): DateRange {
  const d = new Date(`${anyDate}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  const from = addDaysISO(anyDate, -dow);
  return { from, to: addDaysISO(from, 6) };
}

export function inDateRange(iso: string, r: DateRange): boolean {
  return inRange(iso, r);
}
