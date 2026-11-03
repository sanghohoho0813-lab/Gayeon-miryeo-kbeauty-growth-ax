import type { Product, ProductionPlan } from "./types";
import { addDaysISO } from "./date";

/* OEM 생산 일정 협의 요청 글 (PASS 35, D-128) — 14일 안에 착수해야 하는(마감 지남 포함) 상품을
   '최근에 생산을 맡긴 OEM 업체'별로 묶어 메신저·메일에 붙여 넣을 글로 만든다. 보내는 것은 사람이 한다.
   수량·날짜는 생산 착수 일정 화면과 같은 계산값 그대로이고, 발주서가 아니라 협의용임을 글에 밝힌다
   (실제 OEM 발주 양식은 아직 받지 않았다 — R-35). */

export const UNASSIGNED_PARTNER = "OEM 업체 미지정";

export interface RequestItem {
  product: Product;
  daysToDeadline: number;
  orderDeadline: string;
  recommendedOrder: number;
  leadTimeDays: number;
}

/** 그 상품을 가장 최근에 생산한 업체 (생산일 → 입고 예정일 순으로 최근). 기록이 없거나 이름이 비면 '업체 미지정' */
export function partnerOf(productId: string, production: ProductionPlan[]): string {
  const key = (x: ProductionPlan) => x.lastProducedAt ?? x.expectedArrival ?? "";
  const latest = production
    .filter((x) => x.productId === productId && x.partner.trim())
    .sort((a, b) => key(b).localeCompare(key(a)))[0];
  return latest ? latest.partner.trim() : UNASSIGNED_PARTNER;
}

/** 업체별 묶음 — 가장 급한 상품이 있는 업체부터, '업체 미지정'은 맨 뒤. 묶음 안은 착수 마감 순 */
export function groupByPartner(items: RequestItem[], production: ProductionPlan[]): { partner: string; items: RequestItem[] }[] {
  const map = new Map<string, RequestItem[]>();
  for (const it of items) {
    const p = partnerOf(it.product.id, production);
    map.set(p, [...(map.get(p) ?? []), it]);
  }
  const groups = [...map.entries()].map(([partner, list]) => ({ partner, items: [...list].sort((a, b) => a.daysToDeadline - b.daysToDeadline) }));
  return groups.sort((a, b) =>
    Number(a.partner === UNASSIGNED_PARTNER) - Number(b.partner === UNASSIGNED_PARTNER) ||
    a.items[0].daysToDeadline - b.items[0].daysToDeadline ||
    a.partner.localeCompare(b.partner, "ko"));
}

const dot = (iso: string) => iso.slice(0, 10).replaceAll("-", ".");
const deadlineWords = (d: number) => (d < 0 ? `${-d}일 지남` : d === 0 ? "오늘" : `${d}일 남음`);

/** 한 업체에 보낼 글. Demo는 첫 줄에 시연용 표시. 항목이 없으면 null */
export function productionRequestText(partner: string, items: RequestItem[], today: string, opts: { orgName: string; demo: boolean }): string | null {
  if (items.length === 0) return null;
  const list = [...items].sort((a, b) => a.daysToDeadline - b.daysToDeadline);
  const lines = [
    ...(opts.demo ? ["※ 시연용 예시 데이터입니다 (실제 숫자 아님)"] : []),
    `[${opts.orgName}] 생산 일정 협의 요청 · ${dot(today)}`,
    partner === UNASSIGNED_PARTNER ? "OEM 담당자님, 안녕하세요." : `${partner} 담당자님, 안녕하세요.`,
    "아래 제품의 다음 생산 일정과 가능한 수량을 협의드리고 싶습니다.",
    ...list.flatMap((x) => [
      `· ${x.product.name} (${x.product.sku}) — 희망 수량 약 ${x.recommendedOrder.toLocaleString("ko-KR")}개${x.product.moq ? ` (최소 생산수량 ${x.product.moq.toLocaleString("ko-KR")}개)` : ""}`,
      `  생산기간 ${x.leadTimeDays}일 기준 착수 마감 ${dot(x.orderDeadline)} (${deadlineWords(x.daysToDeadline)}) · 지금 착수하면 입고 예상 ${dot(addDaysISO(today, x.leadTimeDays))}`,
    ]),
    "가능한 착수일과 입고일을 알려 주시면 일정을 확정하겠습니다.",
    "※ 수량·일정은 판매 추세로 계산한 추천값이며, 발주 확정이 아닙니다.",
    "감사합니다.",
  ];
  return lines.join("\n");
}
