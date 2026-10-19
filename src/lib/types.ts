/* MIRYEO K-Beauty Growth AX — 핵심 데이터 모델 (PILOT)
   Supabase schema(supabase/migrations/001_base_schema.sql)와 1:1로 대응한다. */

export type ProductCategory = "에센스/앰플" | "크림" | "토너/미스트" | "클렌저" | "선케어" | "마스크";
export type SkinConcern = "수분" | "진정" | "탄력" | "피부결" | "광채" | "데일리 케어";
export type SaleStatus = "성장" | "안정" | "부진" | "신규";
export type Texture = "가벼움" | "중간" | "리치";

export interface PurchaseLink {
  label: string;
  url: string; // 빈 문자열이면 "연결 예정"
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameEn?: string;
  category: ProductCategory;
  line?: string;
  price: number;
  cost?: number; // 민감: STAFF 비노출
  status: SaleStatus;
  description?: string;
  concerns: SkinConcern[];
  texture?: Texture;
  routineStep?: number;
  isNew?: boolean;
  isBest?: boolean;
  isPublished: boolean;
  purchaseLinks: PurchaseLink[];
  mainChannelIds: string[];
  featuredUntil?: string | null; // AX Action 결과로 고객화면 노출
  /** 1개 사용기간(일) — 재구매 예상시점 계산. 없으면 카테고리 기본 추정값 */
  usageDays?: number | null;
  /** OEM 생산기간(일) — 발주 결정 → 입고까지. 생산 착수 마감일·추천 생산량 계산 (계약 별지 제1호 ②) */
  leadTimeDays?: number | null;
  /** 최소 생산수량 (MOQ) */
  moq?: number | null;
  isDemo?: boolean;
}

export interface Inventory {
  productId: string;
  currentStock: number;
  safetyStock: number;
  incomingStock: number;
  incomingDate?: string | null;
  updatedAt?: string;
}

export type ProductionStatus = "계획" | "생산중" | "입고예정" | "완료";

export interface ProductionPlan {
  id: string;
  productId: string;
  partner: string;
  lastProducedAt?: string | null;
  quantity: number;
  expectedArrival?: string | null;
  status: ProductionStatus;
  nextRecommendedAt?: string | null;
}

export type ChannelType = "직영몰" | "온라인몰" | "오프라인" | "라이브/인플루언서" | "B2B" | "수출";

/** 판매 입력 주기 (PASS 27, R-24) — 주·월 단위로 몰아 올리는 채널은 그 채널의 마지막 입력 기준으로 '최근 4주'를 계산 (src/lib/channel-cycle.ts) */
export type InputCycle = "daily" | "weekly" | "monthly";

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  avgDiscountRate: number;
  active: boolean;
  /** 없으면 매일(daily) */
  inputCycle?: InputCycle;
}

/** 판매 1행 = 특정 일(또는 주) 단위 집계. Demo의 weeklyUnits 배열을 대체한다. */
export interface SalesRecord {
  id: string;
  productId: string;
  channelId: string;
  saleDate: string; // YYYY-MM-DD
  units: number;
  revenue: number;
  source: "manual" | "csv" | "api" | "seed";
  /** 이 행을 들여온 파일 기록 (PASS 28) — 되돌리기로 그 파일의 행만 삭제 */
  importBatchId?: string | null;
}

/** 파일 가져오기 기록 (PASS 28, migration 011) — 판매·정산 파일마다 1건 */
export type ImportKind = "sales" | "settlements";
export interface ImportBatch {
  id: string;
  kind: ImportKind;
  fileName: string;
  rowCount: number;
  createdAt: string;
  /** 올린 사람 (Live: 로그인 계정 이메일) */
  createdBy?: string | null;
  undoneAt?: string | null;
  undoneBy?: string | null;
}

export type B2BStatus = "거래중" | "협의중" | "휴면";

export interface B2BAccount {
  id: string;
  name: string;
  status: B2BStatus;
  lastOrderAt?: string | null;
  totalRevenue: number;
  mainProductIds: string[];
  nextDelivery?: string | null;
  note?: string;
}

export interface ExportRecord {
  id: string;
  region: string;
  channel?: string;
  totalRevenue: number;
  mainProductIds: string[];
  lastOrderAt?: string | null;
  growthRate?: number | null;
}

export interface CustomerProfile {
  id: string;
  displayName: string;
  joinedAt?: string;
  lastOrderAt?: string;
  orderCount: number;
  favoriteProductIds: string[];
  concerns: SkinConcern[];
}

export type CustomerEventType =
  | "view_product"
  | "wishlist_add"
  | "wishlist_remove"
  | "finder_start"
  | "finder_complete"
  | "passport_save"
  | "recommendation_view"
  | "outbound_purchase_click";

export interface CustomerEvent {
  id: string;
  sessionId: string;
  eventType: CustomerEventType;
  productId?: string | null;
  payload?: Record<string, unknown>;
  createdAt: string; // ISO
  /** seed = Demo 기준값, live = 실제 발생 (Demo 모드에서는 이 브라우저에서 발생) */
  origin: "seed" | "live";
}

export interface BeautyProfile {
  concerns: SkinConcern[];
  careGoal: string;
  texture: string;
  routineLevel: string;
  budget: string;
}

export interface BeautyRecommendation {
  createdAt: string;
  profile: BeautyProfile;
  productIds: string[];
  reasons: Record<string, string>;
}

export type ActionPriority = "우선" | "높음" | "중간";
export type ActionCategory = "재고" | "생산" | "채널" | "B2B" | "재구매" | "고객 관심" | "정산";
export type ActionStatus = "NEW" | "REVIEWED" | "IN_PROGRESS" | "DONE" | "DISMISSED";

export interface KpiSnapshot {
  label: string;
  value: string;
}

/** RULE이 만든 추천 (계산 결과, 저장 전) */
export interface GrowthActionCandidate {
  ruleKey: string;
  category: ActionCategory;
  priority: ActionPriority;
  title: string;
  judgement: string;
  evidence: string[];
  impact: string[];
  recommendation: string;
  decisionMethod: "RULE" | "STATISTICAL";
  linkedProductId?: string;
  href: string;
  proofType: ProofEventType;
  /** 현재 KPI 스냅샷 — 승인 시 kpi_before, 완료 시 kpi_after로 저장 */
  snapshot: KpiSnapshot[];
}

/** 사람이 처리 중인 Action (저장됨) */
export interface GrowthAction extends GrowthActionCandidate {
  id: string;
  status: ActionStatus;
  assigneeName?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  executionNote?: string | null;
  resultNote?: string | null;
  dismissReason?: string | null;
  customerEffect?: "feature_product" | null;
  kpiBefore?: KpiSnapshot[] | null;
  kpiAfter?: KpiSnapshot[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionEvent {
  id: string;
  growthActionId: string;
  fromStatus: ActionStatus | null;
  toStatus: ActionStatus;
  note?: string | null;
  actorName: string;
  createdAt: string;
}

export type ProofEventType =
  | "INVENTORY_RISK_RESPONSE"
  | "PRODUCTION_ADJUSTMENT"
  | "CHANNEL_STRATEGY"
  | "CUSTOMER_INTEREST_RESPONSE"
  | "B2B_FOLLOWUP"
  | "REPURCHASE_OUTREACH"
  | "SETTLEMENT_FOLLOWUP"
  | "MANUAL";

export type ProofStatus = "RECORDED" | "RESULT_CONFIRMED" | "REJECTED";

export interface ProofEvent {
  id: string;
  growthActionId?: string | null;
  eventType: ProofEventType;
  trigger: string;
  decision: string;
  decisionMethod: string;
  why: string;
  humanApproval: string;
  action: string;
  result: string;
  kpiBefore: KpiSnapshot[];
  kpiAfter: KpiSnapshot[];
  dataSource: "DEMO SEED" | "BROWSER DEMO" | "SUPABASE LIVE" | "MANUAL";
  actorName: string;
  createdAt: string;
  resultConfirmedAt?: string | null;
  evidenceLink?: string | null;
  status: ProofStatus;
}

export type TechAssetKind = "특허" | "벤처기업확인" | "연구개발 조직" | "기술인증" | "실증자료";
export type TechAssetStatus = "미확인" | "준비중" | "검토중" | "출원예정" | "출원완료" | "인증완료" | "해당없음";

export interface TechAsset {
  id: string;
  kind: TechAssetKind;
  title?: string;
  status: TechAssetStatus;
  referenceNo?: string;
  note?: string;
  updatedAt: string;
}

/** 월 매출 목표 — 대표가 입력 (시스템이 만들지 않는다) */
export interface MonthlyTarget {
  month: string; // YYYY-MM
  revenueTarget: number;
  note?: string | null;
  setBy?: string | null;
  updatedAt?: string;
}

export interface OrgSettings {
  name: string;
  pilotStartedOn?: string | null;
  /** 실증 책임자 (로그인 역할과 별개). 비어 있으면 REQUIRED / UNASSIGNED */
  axOwnerName?: string | null;
  /** 운영 기준값 (PASS 15) — 기본값과 다른 항목만 저장. 없으면 기본값 */
  planning?: Partial<PlanningSettings> | null;
}

/** 생산 계획·사후 성과 기준 (src/lib/planning.ts) */
export interface PlanningSettings {
  /** 생산기간 외 안전 여유 일수 */
  safetyDays: number;
  /** 입고 후 판매할 일수 (추천 생산량) */
  coverDays: number;
  /** 추천 생산량 올림 단위 */
  roundTo: number;
  /** Action 사후 성과 측정 기간 */
  outcomeDays: 7 | 14 | 28;
}

/** Money KPI 3 — PROJECT_SPEC 기준 */
export type KpiKey = "COST" | "REVENUE" | "SCALE";
export type BaselineSource = "SYSTEM" | "SELF_REPORT" | "DOCUMENT";

/** 잠근 기준값. 수정하지 않고 새로 잠그면 이전 행은 supersededAt이 기록되어 이력으로 남는다. */
export interface KpiBaseline {
  id: string;
  kpiKey: KpiKey;
  value: number;
  unit: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  method: string;
  source: BaselineSource;
  note?: string | null;
  lockedBy: string;
  lockedAt: string;
  supersededAt?: string | null;
}

export type Role = "OWNER" | "ADMIN" | "STAFF";

/* ---------- 고객 회원 (계약 별지 제1호 ⑥) ---------- */
export interface CustomerAccount {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  skinConcerns: SkinConcern[];
  marketingConsent: boolean;
  privacyAgreedAt: string;
  privacyVersion: string;
  createdAt: string;
}

export interface CustomerPurchase {
  id: string;
  customerUserId: string;
  productId: string;
  quantity: number;
  purchasedOn: string; // YYYY-MM-DD
  channelLabel?: string | null;
  source: "SELF" | "STAFF";
  note?: string | null;
  createdAt: string;
}

export interface SavedRecommendation {
  id: string;
  createdAt: string;
  productIds: string[];
  reasons: Record<string, string>;
}

/* ---------- 정산·미수금 (계약 별지 제1호 ①·③) ---------- */
export type SettlementKind = "B2B" | "EXPORT" | "CHANNEL" | "OTHER";
export type SettlementStatus = "OPEN" | "PARTIAL" | "PAID" | "CANCELLED";

export interface Settlement {
  id: string;
  kind: SettlementKind;
  counterparty: string;
  refId?: string | null;
  description?: string | null;
  amount: number;
  paidAmount: number;
  issuedOn: string;
  dueOn?: string | null;
  paidOn?: string | null;
  status: SettlementStatus;
  note?: string | null;
  updatedAt?: string;
  /** 이 정산을 들여온 파일 기록 (PASS 28) */
  importBatchId?: string | null;
}
