import type { CustomerEvent, CustomerEventType, CustomerProfile, TechAsset } from "../types";
import { daysAgoISO } from "../date";

/** DEMO DATA — 익명 고객 (마스킹). 재구매 후보 분석용 최소 필드. */
export function demoCustomers(): CustomerProfile[] {
  return [
    { id: "cu-01", displayName: "고객 #1042 (Demo)", joinedAt: daysAgoISO(420), lastOrderAt: daysAgoISO(92), orderCount: 6, favoriteProductIds: ["p-ess-01", "p-crm-01"], concerns: ["수분", "진정"] },
    { id: "cu-02", displayName: "고객 #1187 (Demo)", joinedAt: daysAgoISO(330), lastOrderAt: daysAgoISO(75), orderCount: 3, favoriteProductIds: ["p-amp-50"], concerns: ["탄력"] },
    { id: "cu-03", displayName: "고객 #1301 (Demo)", joinedAt: daysAgoISO(250), lastOrderAt: daysAgoISO(12), orderCount: 2, favoriteProductIds: ["p-ton-01", "p-msk-01"], concerns: ["수분", "피부결"] },
    { id: "cu-04", displayName: "고객 #0977 (Demo)", joinedAt: daysAgoISO(480), lastOrderAt: daysAgoISO(110), orderCount: 8, favoriteProductIds: ["p-crm-01", "p-cln-01"], concerns: ["진정", "데일리 케어"] },
    { id: "cu-05", displayName: "고객 #1422 (Demo)", joinedAt: daysAgoISO(60), lastOrderAt: daysAgoISO(8), orderCount: 1, favoriteProductIds: ["p-amp-30"], concerns: ["광채"] },
  ];
}

/**
 * DEMO SEED 고객 이벤트 — 시연 기준값(origin: "seed").
 * 이전 7일(prev) / 최근 7일(recent) 건수를 명시적으로 설계한다.
 * - Demo 앰플 B: 관심 급상승 → "고객 관심 상승" Action 발생
 * - Demo 토너 E: 임계값 직전 → Finder에서 토너가 추천·저장되면 Action 발생 (Closed Loop 시연)
 */
type Counts = Partial<Record<CustomerEventType, [number, number]>>; // [prev, recent]

const productPlan: Record<string, Counts> = {
  "p-amp-50": { view_product: [40, 70], wishlist_add: [3, 6], recommendation_view: [4, 8], passport_save: [2, 4], outbound_purchase_click: [2, 3] },
  "p-ton-01": { view_product: [20, 25], wishlist_add: [2, 2], recommendation_view: [3, 4], passport_save: [1, 1] },
  "p-ess-01": { view_product: [45, 48], wishlist_add: [4, 4], recommendation_view: [6, 6], passport_save: [2, 2], outbound_purchase_click: [1, 1] },
  "p-crm-01": { view_product: [30, 30], wishlist_add: [2, 2], recommendation_view: [4, 4], passport_save: [1, 1] },
  "p-amp-30": { view_product: [18, 25], wishlist_add: [1, 2], recommendation_view: [2, 3], passport_save: [1, 1] },
  "p-crm-02": { view_product: [10, 14], wishlist_add: [1, 1], recommendation_view: [1, 2] },
  "p-cln-01": { view_product: [15, 14], recommendation_view: [2, 2] },
  "p-msk-01": { view_product: [12, 12], wishlist_add: [1, 1] },
  "p-sun-01": { view_product: [8, 6] },
  "p-mst-01": { view_product: [5, 4] },
};

const sessionPlan: Counts = { finder_start: [30, 40], finder_complete: [18, 25] };
const concernCycle = [["수분", "피부결"], ["탄력", "광채"], ["진정", "수분"], ["광채"], ["수분"], ["데일리 케어", "진정"]];

export function demoCustomerEvents(now: number = Date.now()): CustomerEvent[] {
  const day = 86_400_000;
  const events: CustomerEvent[] = [];
  let n = 0;
  const spread = (count: number, windowStart: number) =>
    Array.from({ length: count }, (_, i) => now - windowStart - ((i + 0.5) / count) * 7 * day);

  const push = (eventType: CustomerEventType, ts: number, productId?: string, payload?: Record<string, unknown>) => {
    n += 1;
    events.push({ id: `seed-ev-${n}`, sessionId: `seed-s-${n % 97}`, eventType, productId: productId ?? null, payload, createdAt: new Date(ts).toISOString(), origin: "seed" });
  };

  for (const [productId, plan] of Object.entries(productPlan)) {
    for (const [type, [prev, recent]] of Object.entries(plan) as [CustomerEventType, [number, number]][]) {
      const payload = type === "passport_save" ? { productIds: [productId] } : undefined;
      spread(prev, 7 * day).forEach((ts) => push(type, ts, productId, payload));
      spread(recent, 0).forEach((ts) => push(type, ts, productId, payload));
    }
  }
  for (const [type, [prev, recent]] of Object.entries(sessionPlan) as [CustomerEventType, [number, number]][]) {
    [...spread(prev, 7 * day), ...spread(recent, 0)].forEach((ts, i) =>
      push(type, ts, undefined, type === "finder_complete" ? { concerns: concernCycle[i % concernCycle.length] } : undefined)
    );
  }
  linkSeedFunnelSessions(events);
  return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * 시드 전환 흐름 방문 번호 맞추기 (PASS 33, D-113) — 처음 시드는 방문 번호를 돌려 붙여 Finder 시작·완료·Passport·구매채널 이동이
 * 서로 다른 방문에 흩어져 있었다(사람 수 보기에서 완료 0명). 시드를 만든 7일 창(가장 최근 시드 시각 기준 0·1번째 주)마다
 * 단계별로 최근 것부터 k번째 이벤트를 같은 방문 'seed-v-주-k'로 묶는다. 창마다 뒤 단계 건수가 앞 단계보다 적어
 * 뒤 단계 방문은 늘 앞 단계 방문 안에 든다. 건수·시각·상품은 그대로라 행동 수·관심점수·Action은 바뀌지 않는다.
 * 이미 저장된 Demo 자료도 불러올 때 같은 방식으로 맞춘다
 */
const SEED_FUNNEL_TYPES: CustomerEventType[] = ["finder_start", "finder_complete", "passport_save", "outbound_purchase_click"];
export function linkSeedFunnelSessions(events: CustomerEvent[]): boolean {
  const seed = events.filter((e) => e.origin === "seed");
  if (seed.length === 0) return false;
  const week = 7 * 86_400_000;
  const anchor = Math.max(...seed.map((e) => Date.parse(e.createdAt))) + 1;
  let changed = false;
  for (const t of SEED_FUNNEL_TYPES) {
    const list = seed.filter((e) => e.eventType === t).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    const nth = new Map<number, number>();
    for (const e of list) {
      const w = Math.floor((anchor - Date.parse(e.createdAt)) / week);
      const k = (nth.get(w) ?? 0) + 1;
      nth.set(w, k);
      const sid = `seed-v-${w}-${k}`;
      if (e.sessionId !== sid) { e.sessionId = sid; changed = true; }
    }
  }
  return changed;
}

/** 기술·사업화 자산 — 실제 상태 확인 전이므로 모두 "미확인". 번호를 만들지 않는다. */
export function demoTechAssets(): TechAsset[] {
  const now = new Date().toISOString();
  return (["특허", "벤처기업확인", "연구개발 조직", "기술인증", "실증자료"] as const).map((kind, i) => ({
    id: `ta-${i + 1}`,
    kind,
    status: "미확인",
    updatedAt: now,
  }));
}
