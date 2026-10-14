import type { CustomerEvent, CustomerEventType, Inventory, Product, SalesRecord } from "../types";
import { computeCustomerInsight, computeProductMetrics, generateCandidates, INTEREST_GROWTH_MIN, INTEREST_THRESHOLD, type ProductMetrics } from "../analytics";
import { DEFAULT_PLANNING } from "../planning";
import { addDaysISO, todayISO } from "../date";

/* AX Sprint II 심사위원 페이지 전용 — 공개 시연 데이터 (PASS 16).
   - 실제 회사·고객·거래처·매출 데이터가 아니다. 저장소·운영 DB·고객 이벤트 전송을 쓰지 않는다 (브라우저 메모리에서만 계산).
   - 계산은 실제 Business AX와 같은 순수 함수(computeProductMetrics · generateCandidates · computeCustomerInsight · DEFAULT_PLANNING)를 그대로 쓴다.
   - 상품명은 실제 MIRYEO 제품으로 오해되지 않게 '샘플 … (SAMPLE)'로 둔다. */

export const REVIEW_DEMO_NOTICE = "시연용 샘플 데이터 · 실제 회사 실적 아님";

/** 결정적 난수 (같은 날 같은 화면) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const REVIEW_CHANNELS = [
  { id: "rv-ch-online", name: "온라인몰 (샘플)", share: 0.42 },
  { id: "rv-ch-offline", name: "국내 오프라인 (샘플)", share: 0.24 },
  { id: "rv-ch-live", name: "라이브·인플루언서 (샘플)", share: 0.14 },
  { id: "rv-ch-b2b", name: "B2B 납품 (샘플)", share: 0.12 },
  { id: "rv-ch-global", name: "해외 판매 (샘플)", share: 0.08 },
] as const;

interface DemoSpec {
  product: Product;
  /** 8주 주간 판매 수량 (오래된 주 → 최근 주) */
  weekly: number[];
  inventory: Omit<Inventory, "productId">;
  /** '입고 예정 반영' 장면에서 더하는 수량 */
  incomingScenario: number;
  summary: string;
}

const base = { status: "안정" as const, isPublished: false, purchaseLinks: [], mainChannelIds: [], isDemo: true, concerns: [] };

export const REVIEW_PRODUCTS: DemoSpec[] = [
  {
    product: { ...base, id: "rv-serum-a", sku: "SAMPLE-SRM-A", name: "샘플 세럼 A", category: "에센스/앰플", price: 38000, cost: 9500, leadTimeDays: 40, moq: 800, concerns: ["수분", "광채"] },
    weekly: [182, 188, 197, 205, 226, 244, 263, 281],
    inventory: { currentStock: 3150, safetyStock: 500, incomingStock: 0 },
    incomingScenario: 1500,
    summary: "판매가 꾸준히 늘고 있는 제품",
  },
  {
    product: { ...base, id: "rv-cream-b", sku: "SAMPLE-CRM-B", name: "샘플 크림 B", category: "크림", price: 45000, cost: 11800, leadTimeDays: 35, moq: 600, concerns: ["탄력"] },
    weekly: [152, 148, 155, 150, 149, 153, 147, 151],
    inventory: { currentStock: 4300, safetyStock: 400, incomingStock: 0 },
    incomingScenario: 0,
    summary: "판매가 안정적이고 재고가 넉넉한 제품",
  },
  {
    product: { ...base, id: "rv-ampoule-c", sku: "SAMPLE-AMP-C", name: "샘플 앰플 C", category: "에센스/앰플", price: 52000, cost: 13000, leadTimeDays: 45, moq: 1000, concerns: ["진정", "피부결"] },
    weekly: [96, 104, 112, 121, 168, 196, 231, 262],
    inventory: { currentStock: 2900, safetyStock: 300, incomingStock: 0 },
    incomingScenario: 2000,
    summary: "최근 4주 판매가 빠르게 늘어난 제품",
  },
];

export type ScenarioId = "base" | "faster" | "incoming";
export const SCENARIOS: { id: ScenarioId; label: string; desc: string }[] = [
  { id: "base", label: "현재 추세", desc: "최근 8주 판매 그대로" },
  { id: "faster", label: "최근 판매 30% 증가 시", desc: "최근 4주 판매가 30% 더 빨랐다면" },
  { id: "incoming", label: "OEM 입고 예정 반영", desc: "이미 발주한 수량이 입고 예정일 때" },
];

/** 판매 기준일 = 어제 (오늘 판매는 입력 중일 수 있음 — 실제 화면과 같은 규칙) */
export function reviewDates(now = new Date()) {
  const today = todayISO(now);
  return { today, asOf: addDaysISO(today, -1) };
}

/** 주간 목표 수량을 채널·일자별 판매 기록으로 나눈다 (금액 = 수량 × 판매가 × (1 − 채널 할인)) */
function buildSales(spec: DemoSpec, weekly: number[], asOf: string, seed: number): SalesRecord[] {
  const r = rng(seed);
  const out: SalesRecord[] = [];
  weekly.forEach((units, w) => {
    const weekEnd = addDaysISO(asOf, -7 * (weekly.length - 1 - w));
    let left = units;
    for (let d = 6; d >= 0; d--) {
      const day = addDaysISO(weekEnd, -d);
      const u = d === 0 ? left : Math.min(left, Math.max(0, Math.round((units / 7) * (0.8 + r() * 0.4))));
      left -= u;
      let rest = u;
      REVIEW_CHANNELS.forEach((c, ci) => {
        const cu = ci === REVIEW_CHANNELS.length - 1 ? rest : Math.min(rest, Math.round(u * c.share));
        rest -= cu;
        if (cu > 0) out.push({ id: `rv-${spec.product.id}-${day}-${c.id}`, productId: spec.product.id, channelId: c.id, saleDate: day, units: cu, revenue: Math.round(cu * spec.product.price * (1 - (ci === 3 ? 0.35 : ci === 4 ? 0.3 : 0.1))), source: "seed" });
      });
    }
  });
  return out;
}

export interface ReviewResult {
  spec: DemoSpec;
  scenario: ScenarioId;
  metrics: ProductMetrics;
  inventory: Inventory;
  /** 가용 재고로 버틸 수 있는 일수 (가용 재고 ÷ 예측 일판매 — 착수 마감 계산과 같은 값) */
  coverDays: number | null;
  /** 실제 Business AX의 RULE이 이 상품에 내는 Action (없으면 null) */
  action: ReturnType<typeof generateCandidates>[number] | null;
  plan: typeof DEFAULT_PLANNING;
  today: string;
  asOf: string;
}

/** 상품 × 장면 → 실제 분석 로직 결과 */
export function analyzeReviewProduct(productId: string, scenario: ScenarioId, now = new Date()): ReviewResult {
  const spec = REVIEW_PRODUCTS.find((x) => x.product.id === productId) ?? REVIEW_PRODUCTS[0];
  const { today, asOf } = reviewDates(now);
  const weekly = scenario === "faster" ? spec.weekly.map((u, i) => (i >= 4 ? Math.round(u * 1.3) : u)) : spec.weekly;
  const sales = buildSales(spec, weekly, asOf, REVIEW_PRODUCTS.indexOf(spec) + 7);
  const inventory: Inventory = { productId: spec.product.id, ...spec.inventory, incomingStock: spec.inventory.incomingStock + (scenario === "incoming" ? spec.incomingScenario : 0) };
  const plan = DEFAULT_PLANNING;
  const metrics = computeProductMetrics(spec.product, inventory, sales, today, asOf, plan);
  const candidates = generateCandidates({ products: [spec.product], metrics: new Map([[spec.product.id, metrics]]), channelStats: [], interest: [], b2b: [], customers: [], today, production: [], plan });
  const action = candidates.find((c) => c.linkedProductId === spec.product.id) ?? null;
  return { spec, scenario, metrics, inventory, coverDays: metrics.forecastDaily > 0 ? metrics.availableStock / metrics.forecastDaily : null, action, plan, today, asOf };
}

/* ---------- 고객 관심신호 (MIRYEO AI Beauty → Business AX) ---------- */

/** 심사 화면 표기 — 개발용 이벤트 이름 대신 한글 */
export const SIGNAL_STEPS: { type: CustomerEventType; label: string; desc: string }[] = [
  { type: "finder_start", label: "분석 시작", desc: "고객이 피부 고민을 고르기 시작" },
  { type: "finder_complete", label: "추천 완료", desc: "5가지 질문을 마치고 결과 도달" },
  { type: "recommendation_view", label: "추천 제품 조회", desc: "추천된 제품·사용 순서 확인" },
  { type: "passport_save", label: "추천 저장", desc: "뷰티 패스포트에 결과 저장" },
  { type: "outbound_purchase_click", label: "구매채널 이동", desc: "판매처로 이동 (구매 전 마지막 신호)" },
];

/** 최근 14일 익명 시연 이벤트 — 앞 7일보다 뒤 7일에 앰플 C 관심이 커지는 흐름 */
export function reviewSignals(now = Date.now()) {
  const r = rng(42);
  const events: CustomerEvent[] = [];
  const day = 86_400_000;
  let n = 0;
  const push = (type: CustomerEventType, daysAgo: number, productId: string | null, payload?: Record<string, unknown>) =>
    events.push({ id: `rv-ev-${n++}`, sessionId: `rv-s-${Math.floor(r() * 1e6)}`, eventType: type, productId, payload, createdAt: new Date(now - daysAgo * day - r() * day * 0.9).toISOString(), origin: "seed" });
  // (제품, 최근 7일 세션 수, 이전 7일 세션 수)
  const plan: [string, number, number, string[]][] = [["rv-ampoule-c", 16, 7, ["진정", "피부결"]], ["rv-serum-a", 11, 9, ["수분", "광채"]], ["rv-cream-b", 6, 6, ["탄력"]]];
  for (const [pid, recent, prev, concerns] of plan) {
    for (const [count, from] of [[recent, 0], [prev, 7]] as const) {
      for (let i = 0; i < count; i++) {
        const d = from + r() * 6.5;
        push("finder_start", d, null);
        if (r() < 0.82) {
          push("finder_complete", d, null, { concerns });
          push("recommendation_view", d, null, { productIds: [pid] });
          if (r() < 0.55) push("passport_save", d, null, { productIds: [pid] });
          if (r() < 0.5) push("wishlist_add", d, pid);
          if (r() < 0.4) push("outbound_purchase_click", d, pid);
        }
      }
    }
  }
  const insight = computeCustomerInsight(events, now);
  const rising = insight.productInterest.map((pi) => ({ ...pi, name: REVIEW_PRODUCTS.find((p) => p.product.id === pi.productId)?.product.name ?? pi.productId, rising: pi.recentScore >= INTEREST_THRESHOLD && (pi.growth ?? 0) >= INTEREST_GROWTH_MIN }));
  return { insight, rising, threshold: INTEREST_THRESHOLD, growthMin: INTEREST_GROWTH_MIN };
}

/** 관심신호 + 판매·재고 → 실제 RULE이 내는 '고객 관심 상승' Action (기본 장면 기준) */
export function reviewSignalActions(now = new Date()) {
  const { today, asOf } = reviewDates(now);
  const { insight } = reviewSignals(now.getTime());
  const metrics = new Map(REVIEW_PRODUCTS.map((s, i) => {
    const sales = buildSales(s, s.weekly, asOf, i + 7);
    return [s.product.id, computeProductMetrics(s.product, { productId: s.product.id, ...s.inventory }, sales, today, asOf, DEFAULT_PLANNING)] as const;
  }));
  const candidates = generateCandidates({ products: REVIEW_PRODUCTS.map((s) => s.product), metrics, channelStats: [], interest: insight.productInterest, b2b: [], customers: [], today, production: [], plan: DEFAULT_PLANNING });
  return candidates.filter((c) => c.ruleKey.startsWith("interest:"));
}
