import type { DataSnapshot } from "./data/source";
import { realScope } from "./start-guide";
import { summarizeReceivables } from "./settlements";
import { daysBetween, formatDateKR } from "./date";
import { formatPrice } from "./analytics";

/* 주간 운영 점검 (12주 실증 Week 1~4 이후 매주) — AX OWNER가 주 1회 확인.
   "데이터 입력이 멈추면 가치가 0" (QA Five Devil Q2) → 입력 공백·처리 지연을 저장된 데이터로 자동 판정.
   입력 항목(판매·재고·미수금)은 Demo 시드를 세지 않는다. */

export interface RoutineItem {
  id: "sales" | "inventory" | "review" | "progress" | "proof" | "overdue";
  title: string;
  done: boolean;
  detail: string;
  href: string;
  /** 기준 (화면에 그대로 표시) */
  rule: string;
}

export const ROUTINE_RULES = { salesDays: 7, inventoryDays: 7, reviewDays: 3, progressDays: 14 } as const;

export function buildWeeklyRoutine(s: DataSnapshot, today: string): RoutineItem[] {
  const R = ROUTINE_RULES;
  const r = realScope(s);
  const lastSale = r.sales.reduce<string | null>((a, x) => (!a || x.saleDate > a ? x.saleDate : a), null);
  const saleGap = lastSale ? daysBetween(lastSale, today) : null;
  const staleInv = r.products.filter((p) => {
    const inv = r.inventory.find((i) => i.productId === p.id);
    return !inv?.updatedAt || daysBetween(inv.updatedAt, today) > R.inventoryDays;
  });
  const waiting = s.actions.filter((a) => a.status === "NEW" && daysBetween(a.createdAt, today) > R.reviewDays);
  const stuck = s.actions.filter((a) => a.status === "IN_PROGRESS" && daysBetween(a.updatedAt, today) > R.progressDays);
  const drafts = r.proofs.filter((p) => p.status === "RECORDED");
  const rec = summarizeReceivables(r.settlements, today);

  return [
    {
      id: "sales", title: "판매 데이터 입력", rule: `최근 판매일이 ${R.salesDays}일 이내`,
      done: saleGap != null && saleGap <= R.salesDays,
      detail: lastSale ? `최근 판매일 ${formatDateKR(lastSale)} (${saleGap}일 전)` : "실제 판매 입력 없음",
      href: "/ax/data",
    },
    {
      id: "inventory", title: "재고 갱신", rule: `모든 실제 상품의 재고를 ${R.inventoryDays}일 안에 확인`,
      done: r.products.length > 0 && staleInv.length === 0,
      detail: r.products.length === 0 ? "실제 상품 없음" : staleInv.length ? `${staleInv.length}개 상품 미갱신: ${staleInv.slice(0, 3).map((p) => p.name).join(", ")}${staleInv.length > 3 ? " 외" : ""}` : `${r.products.length}개 모두 최신`,
      href: "/ax/products?tab=inventory",
    },
    {
      id: "review", title: "새 Action 검토", rule: `생긴 지 ${R.reviewDays}일 넘은 미검토 Action 0건`,
      done: waiting.length === 0,
      detail: waiting.length ? `${waiting.length}건 대기 — 가장 오래된: ${waiting.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].title}` : "대기 없음",
      href: "/ax/growth",
    },
    {
      id: "progress", title: "진행 중 Action 결과 기록", rule: `${R.progressDays}일 넘게 멈춘 진행 중 Action 0건`,
      done: stuck.length === 0,
      detail: stuck.length ? `${stuck.length}건 결과 미기록` : "지연 없음",
      href: "/ax/growth",
    },
    {
      id: "proof", title: "Proof 확정 (대표)", rule: "기록됐지만 확정·반려하지 않은 Proof 0건",
      done: drafts.length === 0,
      detail: drafts.length ? `${drafts.length}건 확정 대기` : "대기 없음",
      href: "/ax/reports#proofs",
    },
    {
      id: "overdue", title: "연체 미수금 확인", rule: "입금 기한이 지난 받을 돈 0건 (없으면 건너뜀)",
      done: rec.overdueCount === 0,
      detail: rec.overdueCount ? `${rec.overdueCount}건 ${formatPrice(rec.overdueAmount)} · 최장 ${rec.maxOverdueDays}일` : r.settlements.length ? "연체 없음" : "정산 기록 없음",
      href: "/ax/channels?tab=settlements",
    },
  ];
}

export function routineProgress(items: RoutineItem[]) {
  const done = items.filter((x) => x.done).length;
  return { done, total: items.length, next: items.find((x) => !x.done) ?? null };
}
