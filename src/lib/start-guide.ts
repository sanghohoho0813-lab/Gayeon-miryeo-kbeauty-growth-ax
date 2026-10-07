import type { DataSnapshot } from "./data/source";
import { demoChannels } from "./demo/channels";
import { activeBaseline } from "./evidence";
import { customerSignupEnabled } from "./config";
import { daysBetween } from "./date";

/* 실데이터 시작 가이드 (계약 3단계 "실제 자료 적용" 준비) — 스냅샷에서 자동 판정.
   Demo 시드는 완료로 세지 않는다: 실데이터 = Demo 표시가 없는 상품, 직접/파일 입력 판매, 시드 외 채널·정산. */

export type StepPhase = "Week 0 · 준비" | "Week 0 · 실데이터" | "Week 1~4 · 첫 증거";
export interface GuideStep {
  id: string;
  phase: StepPhase;
  title: string;
  why: string;
  done: boolean;
  detail: string;
  href: string;
  optional?: boolean;
  owner: "대표" | "대표·관리자" | "구성원" | "개발·운영";
}

const SEED_CHANNELS = new Set(demoChannels.map((c) => c.id));

export function buildStartGuide(s: DataSnapshot, today: string): GuideStep[] {
  const realProducts = s.products.filter((p) => !p.isDemo);
  const realIds = new Set(realProducts.map((p) => p.id));
  const realChannels = s.channels.filter((c) => !SEED_CHANNELS.has(c.id));
  const realSales = s.sales.filter((x) => x.source !== "seed");
  const salesDays = realSales.length ? daysBetween(realSales.reduce((a, x) => (x.saleDate < a ? x.saleDate : a), today), today) : 0;
  const invReal = s.inventory.filter((i) => realIds.has(i.productId));
  const published = realProducts.filter((p) => p.isPublished);
  const linked = published.filter((p) => p.purchaseLinks.some((l) => l.url));
  const usage = realProducts.filter((p) => p.usageDays);
  const costed = realProducts.filter((p) => p.cost != null);
  const realSettle = s.settlements.filter((x) => !x.id.startsWith("demo-st-"));
  const baselines = (["COST", "REVENUE", "SCALE"] as const).filter((k) => activeBaseline(s.baselines, k));
  const doneActions = s.actions.filter((a) => a.status === "DONE").length;
  const confirmed = s.proofEvents.filter((p) => p.status === "RESULT_CONFIRMED" && p.dataSource !== "DEMO SEED" && p.dataSource !== "BROWSER DEMO").length;
  const liveEvents = s.customerEvents.filter((e) => e.origin === "live").length;

  return [
    { id: "pilot", phase: "Week 0 · 준비", owner: "대표", title: "Pilot 시작일 지정", why: "12주 실증의 기준일. 주간 리포트의 Week 번호가 여기서 시작합니다.", done: !!s.org.pilotStartedOn, detail: s.org.pilotStartedOn ? `시작 ${s.org.pilotStartedOn}` : "미지정", href: "/ax/settings#pilot" },
    { id: "axowner", phase: "Week 0 · 준비", owner: "대표", title: "AX OWNER(실증 책임자) 지정", why: "주 1회 Evidence 점검·Baseline 확인을 맡는 사람. 없으면 데이터 입력이 멈춥니다.", done: !!s.org.axOwnerName?.trim(), detail: s.org.axOwnerName || "미지정", href: "/ax/settings#pilot" },
    { id: "privacy", phase: "Week 0 · 준비", owner: "대표", title: "고객 개인정보 처리방침 확정", why: "고객 회원가입은 처리방침 URL·버전이 설정되어야 열립니다 (계약 제17조).", done: customerSignupEnabled, detail: customerSignupEnabled ? "설정됨" : "환경변수 NEXT_PUBLIC_PRIVACY_POLICY_URL·VERSION 필요", href: "/beauty/login?mode=signup" },
    { id: "channels", phase: "Week 0 · 실데이터", owner: "대표·관리자", title: "실제 판매 채널 등록", why: "판매·정산을 채널별로 나눠 보기 위한 기준.", done: realChannels.length > 0, detail: `${realChannels.length}개`, href: "/ax/data?tab=channels" },
    { id: "products", phase: "Week 0 · 실데이터", owner: "대표·관리자", title: "실제 상품 1~2개 이상 등록", why: "Demo 상품이 아닌 실제 SKU부터 분석·추천이 시작됩니다. 파일로 한 번에 올릴 수 있습니다.", done: realProducts.length > 0, detail: `${realProducts.length}개 · 원가 입력 ${costed.length} · 사용기간 입력 ${usage.length}`, href: "/ax/data?tab=products" },
    { id: "inventory", phase: "Week 0 · 실데이터", owner: "구성원", title: "실제 상품 재고 입력", why: "재고일수·품절위험 판단의 근거.", done: realProducts.length > 0 && invReal.length >= realProducts.length, detail: `${invReal.length}/${realProducts.length}개 상품`, href: "/ax/products?tab=inventory" },
    { id: "sales", phase: "Week 0 · 실데이터", owner: "구성원", title: "판매 데이터 4주치 이상 입력", why: "성장률·재고 판단은 최근 4주 vs 이전 4주 비교라 최소 4주, 권장 8주가 필요합니다.", done: salesDays >= 28, detail: realSales.length ? `${realSales.length}행 · ${salesDays + 1}일치` : "없음", href: "/ax/data" },
    { id: "publish", phase: "Week 0 · 실데이터", owner: "대표·관리자", title: "고객 화면 공개 상품 + 구매 링크", why: "추천 → 제품 → 구매로 이어지는 흐름(계약 완료기준)을 실제 상품으로 확인.", done: linked.length > 0, detail: `공개 ${published.length} · 구매 링크 ${linked.length}`, href: "/ax/data?tab=products" },
    { id: "settlements", phase: "Week 0 · 실데이터", owner: "대표·관리자", title: "거래처 미수금 초기값 입력", why: "받을 돈·연체 관리의 출발점. B2B·수출 거래가 없으면 건너뛰어도 됩니다.", done: realSettle.length > 0, detail: `${realSettle.length}건`, href: "/ax/channels?tab=settlements", optional: true },
    { id: "baseline", phase: "Week 0 · 실데이터", owner: "대표", title: "Money KPI 3개 Baseline 잠금", why: "기준값이 없으면 '개선됐다'고 말할 수 없습니다. 실측·자기기록 값만 입력합니다.", done: baselines.length === 3, detail: `${baselines.length}/3 잠금`, href: "/ax/reports#baseline" },
    { id: "events", phase: "Week 1~4 · 첫 증거", owner: "개발·운영", title: "실제 고객 행동 수집 시작", why: "고객 화면 공개 후 Finder·찜·구매처 이동이 쌓여야 고객 관심 판단이 가능합니다.", done: liveEvents > 0, detail: `${liveEvents}건`, href: "/ax/customers" },
    { id: "action", phase: "Week 1~4 · 첫 증거", owner: "구성원", title: "첫 Action 완료", why: "추천 → 승인 → 실행 → 결과 기록까지 한 바퀴를 돌려야 Proof가 생깁니다.", done: doneActions > 0, detail: `${doneActions}건 완료`, href: "/ax/growth" },
    { id: "proof", phase: "Week 1~4 · 첫 증거", owner: "대표", title: "첫 Proof 결과 확정", why: "12주 실증 계획의 Week 1~4 목표: 실제 데이터로 확정된 Proof.", done: confirmed > 0, detail: `${confirmed}건 확정 (Demo 제외)`, href: "/ax/reports#proofs" },
  ];
}

export function guideProgress(steps: GuideStep[]) {
  const required = steps.filter((x) => !x.optional);
  const done = required.filter((x) => x.done).length;
  return { done, total: required.length, ratio: required.length ? done / required.length : 1, next: steps.find((x) => !x.done && !x.optional) ?? null };
}
