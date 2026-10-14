import type { OrgSettings, PlanningSettings } from "./types";

/* 운영 기준값 (PASS 15, R-21·R-23) — 생산 계획과 Action 사후 성과 측정 기준.
   기본값은 업계 일반값(PASS 10 PLANNING · OUTCOME_DAYS). 대표가 실제 OEM 계약 조건·상품 회전에 맞게 바꾼다.
   저장값은 조직(organizations.planning)에 두고, 비어 있는 항목은 기본값을 쓴다. 범위는 DB CHECK(009)와 같다. */

export const DEFAULT_PLANNING: PlanningSettings = { safetyDays: 14, coverDays: 42, roundTo: 50, outcomeDays: 14 };

export const PLANNING_LIMITS = {
  safetyDays: { min: 0, max: 60, label: "안전 재고일수", unit: "일", help: "생산기간 외에 품절 없이 버틸 여유 일수. 착수 마감 = 가용 재고가 '생산기간 + 이 일수'보다 먼저 바닥나기 전 날" },
  coverDays: { min: 7, max: 180, label: "입고 후 판매 일수", unit: "일", help: "한 번 생산하면 입고 후 며칠 동안 팔 수량을 만들지 (추천 생산량 계산)" },
  roundTo: { min: 1, max: 1000, label: "생산 수량 단위", unit: "개", help: "추천 생산량을 이 단위로 올림 (박스·로트 단위). 상품별 최소 생산수량(MOQ)은 따로 적용" },
} as const;
export const OUTCOME_OPTIONS = [7, 14, 28] as const;

export type PlanningKey = keyof typeof PLANNING_LIMITS;

export function resolvePlanning(org?: Pick<OrgSettings, "planning"> | null): PlanningSettings {
  const p = org?.planning ?? {};
  const pick = (k: PlanningKey) => {
    const v = p[k];
    const L = PLANNING_LIMITS[k];
    return typeof v === "number" && Number.isInteger(v) && v >= L.min && v <= L.max ? v : DEFAULT_PLANNING[k];
  };
  const o = p.outcomeDays;
  return { safetyDays: pick("safetyDays"), coverDays: pick("coverDays"), roundTo: pick("roundTo"), outcomeDays: o && (OUTCOME_OPTIONS as readonly number[]).includes(o) ? o : DEFAULT_PLANNING.outcomeDays };
}

/** 입력 검증 — 문자열 입력을 정수로, 범위 밖이면 오류 문구 */
export function validatePlanning(raw: Record<PlanningKey, string> & { outcomeDays: number }): { value: PlanningSettings | null; errors: string[] } {
  const errors: string[] = [];
  const out = { ...DEFAULT_PLANNING };
  for (const k of Object.keys(PLANNING_LIMITS) as PlanningKey[]) {
    const L = PLANNING_LIMITS[k];
    const s = raw[k].replace(/[,\s]/g, "");
    const v = Number(s);
    if (!s || !Number.isInteger(v) || v < L.min || v > L.max) errors.push(`${L.label}은 ${L.min}~${L.max}${L.unit} 정수`);
    else out[k] = v;
  }
  if (!(OUTCOME_OPTIONS as readonly number[]).includes(raw.outcomeDays)) errors.push("사후 성과 측정 기간은 7·14·28일 중 하나");
  else out.outcomeDays = raw.outcomeDays as PlanningSettings["outcomeDays"];
  return { value: errors.length ? null : out, errors };
}

/** 기본값과 다른 항목만 저장 (모두 기본값이면 null → '기본값 사용') */
export function planningPatch(v: PlanningSettings): Partial<PlanningSettings> | null {
  const diff = Object.fromEntries((Object.keys(DEFAULT_PLANNING) as (keyof PlanningSettings)[]).filter((k) => v[k] !== DEFAULT_PLANNING[k]).map((k) => [k, v[k]]));
  return Object.keys(diff).length ? (diff as Partial<PlanningSettings>) : null;
}

export const isDefaultPlanning = (p: PlanningSettings) => planningPatch(p) === null;
