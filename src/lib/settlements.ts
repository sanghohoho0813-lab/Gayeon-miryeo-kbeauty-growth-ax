import type { Settlement, SettlementKind, SettlementStatus } from "./types";
import { daysBetween } from "./date";

/* 정산·미수금 계산 — 받을 돈 = 청구액 − 입금액 (취소·완납 제외) */
export const SETTLEMENT_KIND_LABEL: Record<SettlementKind, string> = { B2B: "B2B 거래처", EXPORT: "수출", CHANNEL: "판매채널 정산", OTHER: "기타" };
export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = { OPEN: "미입금", PARTIAL: "부분 입금", PAID: "완납", CANCELLED: "취소" };

export const outstanding = (s: Settlement) => (s.status === "PAID" || s.status === "CANCELLED" ? 0 : Math.max(0, s.amount - s.paidAmount));
export const overdueDays = (s: Settlement, today: string) => (outstanding(s) > 0 && s.dueOn && s.dueOn < today ? daysBetween(s.dueOn, today) : 0);

/** 입금액에 맞춰 상태 자동 결정 (취소는 유지) */
export function statusFor(s: Pick<Settlement, "amount" | "paidAmount" | "status">): SettlementStatus {
  if (s.status === "CANCELLED") return "CANCELLED";
  if (s.paidAmount >= s.amount && s.amount > 0) return "PAID";
  return s.paidAmount > 0 ? "PARTIAL" : "OPEN";
}

export interface ReceivableSummary {
  outstanding: number;
  openCount: number;
  overdueAmount: number;
  overdueCount: number;
  maxOverdueDays: number;
  dueIn30: number;
  byKind: { kind: SettlementKind; amount: number }[];
}

export function summarizeReceivables(list: Settlement[], today: string): ReceivableSummary {
  let out = 0, openCount = 0, overdueAmount = 0, overdueCount = 0, maxOverdue = 0, dueIn30 = 0;
  const byKind = new Map<SettlementKind, number>();
  for (const s of list) {
    const o = outstanding(s);
    if (o <= 0) continue;
    out += o;
    openCount++;
    byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + o);
    const od = overdueDays(s, today);
    if (od > 0) { overdueAmount += o; overdueCount++; maxOverdue = Math.max(maxOverdue, od); }
    else if (s.dueOn && daysBetween(today, s.dueOn) <= 30) dueIn30 += o;
  }
  return { outstanding: out, openCount, overdueAmount, overdueCount, maxOverdueDays: maxOverdue, dueIn30, byKind: [...byKind.entries()].map(([kind, amount]) => ({ kind, amount })).sort((a, b) => b.amount - a.amount) };
}

/* ---------- 받을 돈 연령 (PASS 31, D-099) ----------
   남은 잔액만, 입금 기한 기준. 기한 없음·기한 전·오늘이 기한 = '기한 전'. 금액은 입력한 청구·입금 기록 그대로 (추정 없음) */
export type AgingBucket = "notDue" | "d1_30" | "d31_60" | "d61";
export const AGING_BUCKETS: AgingBucket[] = ["notDue", "d1_30", "d31_60", "d61"];
export const AGING_LABEL: Record<AgingBucket, string> = { notDue: "기한 전", d1_30: "1~30일 연체", d31_60: "31~60일 연체", d61: "61일 이상 연체" };

/** 받을 돈이 없으면 null */
export function agingOf(s: Settlement, today: string): AgingBucket | null {
  if (outstanding(s) <= 0) return null;
  const d = overdueDays(s, today);
  return d <= 0 ? "notDue" : d <= 30 ? "d1_30" : d <= 60 ? "d31_60" : "d61";
}

export interface AgingRow { bucket: AgingBucket; amount: number; count: number }
/** 네 구간 모두(0 포함) 순서대로 — 합 = 받을 돈 전체 */
export function receivableAging(list: Settlement[], today: string): AgingRow[] {
  const acc = new Map<AgingBucket, AgingRow>(AGING_BUCKETS.map((b) => [b, { bucket: b, amount: 0, count: 0 }]));
  for (const s of list) {
    const b = agingOf(s, today);
    if (!b) continue;
    const r = acc.get(b)!;
    r.amount += outstanding(s);
    r.count++;
  }
  return AGING_BUCKETS.map((b) => acc.get(b)!);
}

export interface CounterpartyReceivable { counterparty: string; amount: number; count: number; overdueAmount: number; maxOverdueDays: number }
/** 거래처별 받을 돈 — 이름이 같으면 한 거래처(공백·대소문자 무시), 많은 순 */
export function receivablesByCounterparty(list: Settlement[], today: string): CounterpartyReceivable[] {
  const acc = new Map<string, CounterpartyReceivable>();
  for (const s of list) {
    const o = outstanding(s);
    if (o <= 0) continue;
    const key = s.counterparty.trim().toLowerCase().replace(/\s+/g, " ");
    const r = acc.get(key) ?? { counterparty: s.counterparty.trim(), amount: 0, count: 0, overdueAmount: 0, maxOverdueDays: 0 };
    const od = overdueDays(s, today);
    r.amount += o;
    r.count++;
    if (od > 0) { r.overdueAmount += o; r.maxOverdueDays = Math.max(r.maxOverdueDays, od); }
    acc.set(key, r);
  }
  return [...acc.values()].sort((a, b) => b.amount - a.amount || b.overdueAmount - a.overdueAmount);
}

/** 한 거래처의 받을 돈 — 정산에 연결된 거래처 ID 또는 같은 이름(공백·대소문자 무시). B2B 거래처 카드용 (PASS 31) */
export function receivableFor(list: Settlement[], today: string, party: { id: string; name: string }): Omit<CounterpartyReceivable, "counterparty"> {
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ");
  const name = norm(party.name);
  const r = { amount: 0, count: 0, overdueAmount: 0, maxOverdueDays: 0 };
  for (const s of list) {
    const o = outstanding(s);
    if (o <= 0 || !(s.refId === party.id || norm(s.counterparty) === name)) continue;
    const od = overdueDays(s, today);
    r.amount += o;
    r.count++;
    if (od > 0) { r.overdueAmount += o; r.maxOverdueDays = Math.max(r.maxOverdueDays, od); }
  }
  return r;
}
