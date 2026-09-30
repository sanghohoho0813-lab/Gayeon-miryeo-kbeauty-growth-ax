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

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  avgDiscountRate: number;
  active: boolean;
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
export type ActionCategory = "재고" | "생산" | "채널" | "B2B" | "재구매" | "고객 관심";
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

export interface OrgSettings {
  name: string;
  pilotStartedOn?: string | null;
  /** 실증 책임자 (로그인 역할과 별개). 비어 있으면 REQUIRED / UNASSIGNED */
  axOwnerName?: string | null;
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
