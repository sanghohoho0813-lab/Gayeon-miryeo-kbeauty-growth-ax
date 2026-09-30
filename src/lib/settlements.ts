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
