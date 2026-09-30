import type { CustomerPurchase, Product, ProductCategory } from "./types";
import { addDaysISO, daysBetween } from "./date";

/* 재구매 예상시점 = 구매일 + 사용기간 × 수량.
   사용기간은 제품에 입력된 값(usage_days)을 우선 쓰고, 없으면 카테고리 기본값을 "추정"으로 표시한다.
   기본값은 일반적인 사용 주기를 가정한 운영 참고값이며, 제품별 실제 용량·사용량 확인 후 입력으로 대체한다. */
export const DEFAULT_USAGE_DAYS: Record<ProductCategory, number> = {
  "에센스/앰플": 45,
  크림: 60,
  "토너/미스트": 60,
  클렌저: 60,
  선케어: 45,
  마스크: 30,
};

export function usageDaysOf(p: Product): { days: number; estimated: boolean } {
  return p.usageDays ? { days: p.usageDays, estimated: false } : { days: DEFAULT_USAGE_DAYS[p.category] ?? 60, estimated: true };
}

export interface RepurchaseItem {
  purchase: CustomerPurchase;
  product: Product;
  expectedOn: string;
  daysLeft: number; // 음수 = 지남
  estimated: boolean;
}

/** 고객·제품별 가장 최근 구매만 기준으로 예상일 계산 */
export function repurchaseSchedule(purchases: CustomerPurchase[], productById: Map<string, Product>, today: string): RepurchaseItem[] {
  const latest = new Map<string, CustomerPurchase>();
  for (const p of purchases) {
    const k = `${p.customerUserId}|${p.productId}`;
    const prev = latest.get(k);
    if (!prev || p.purchasedOn > prev.purchasedOn) latest.set(k, p);
  }
  const out: RepurchaseItem[] = [];
  for (const p of latest.values()) {
    const product = productById.get(p.productId);
    if (!product) continue;
    const { days, estimated } = usageDaysOf(product);
    const expectedOn = addDaysISO(p.purchasedOn, days * p.quantity);
    out.push({ purchase: p, product, expectedOn, daysLeft: daysBetween(today, expectedOn), estimated });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** 7일 이내 도래 ~ 14일 경과 = 재구매 안내 대상 */
export function repurchaseDue(items: RepurchaseItem[], ahead = 7, overdue = 14): RepurchaseItem[] {
  return items.filter((i) => i.daysLeft <= ahead && i.daysLeft >= -overdue);
}

export function dDayLabel(daysLeft: number): string {
  if (daysLeft === 0) return "D-day";
  return daysLeft > 0 ? `D-${daysLeft}` : `${-daysLeft}일 지남`;
}
