/* MIRYEO K-Beauty Growth AX — 핵심 데이터 모델 (MVP 최소 필드) */

export type ProductCategory =
  | "에센스/앰플"
  | "크림"
  | "토너/미스트"
  | "클렌저"
  | "선케어"
  | "마스크";

export type SkinConcern =
  | "수분"
  | "진정"
  | "탄력"
  | "피부결"
  | "광채"
  | "데일리 케어";

export type SaleStatus = "성장" | "안정" | "부진" | "신규";

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  sku: string;
  category: ProductCategory;
  line: string;
  price: number; // 판매가 (원)
  cost: number; // 원가 (원)
  status: SaleStatus;
  mainChannels: string[]; // channel ids
  description: string;
  concerns: SkinConcern[];
  texture: "가벼움" | "중간" | "리치";
  routineStep: number; // 1 토너 → 2 에센스 → 3 크림 → 4 선케어
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBest?: boolean;
}

export interface Inventory {
  productId: string;
  currentStock: number;
  safetyStock: number;
  incomingStock: number;
  incomingDate?: string;
}

export type ProductionStatus = "생산중" | "입고예정" | "완료" | "계획";

export interface ProductionPlan {
  id: string;
  productId: string;
  partner: string; // OEM/ODM 업체 (Demo)
  lastProducedAt: string;
  quantity: number;
  expectedArrival?: string;
  status: ProductionStatus;
  nextRecommendedAt?: string;
}

export interface SalesRecord {
  productId: string;
  channelId: string;
  /** 최근 8주 주간 판매수량 (index 0 = 가장 오래된 주) */
  weeklyUnits: number[];
}

export type ChannelType = "직영몰" | "온라인몰" | "오프라인" | "라이브/인플루언서" | "B2B" | "수출";

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  monthRevenue: number; // 이번 달 매출 (원)
  prevMonthRevenue: number;
  orders: number;
  avgDiscountRate: number; // 0~1
  topSkus: string[];
}

export type B2BStatus = "거래중" | "협의중" | "휴면";

export interface B2BAccount {
  id: string;
  name: string;
  status: B2BStatus;
  lastOrderAt: string;
  totalRevenue: number;
  mainProducts: string[];
  nextDelivery?: string;
  note?: string;
}

export interface ExportRecord {
  id: string;
  region: string;
  channel: string;
  totalRevenue: number;
  mainProducts: string[];
  lastOrderAt: string;
  growthRate: number; // 전분기 대비, 0~n
}

export interface CustomerProfile {
  id: string;
  name: string;
  joinedAt: string;
  lastOrderAt: string;
  orderCount: number;
  favoriteProducts: string[];
  concerns: SkinConcern[];
  repurchaseDue: boolean;
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

export type CustomerEventType = "view" | "wishlist" | "finder_complete" | "passport_save";

export interface CustomerEvent {
  productId: string;
  type: CustomerEventType;
  count: number; // 최근 30일 집계 (Demo)
}

export type ActionPriority = "우선" | "높음" | "중간";
export type ActionCategory = "재고" | "생산" | "채널" | "B2B" | "재구매" | "매출";

export interface GrowthAction {
  id: string;
  category: ActionCategory;
  priority: ActionPriority;
  title: string;
  judgement: string; // 한 줄 판단
  evidence: string[]; // 근거
  impact: string[]; // 예상 영향
  recommendation: string; // 권장 행동
  linkedProductId?: string;
  href: string;
  status: "대기" | "확인중" | "완료";
}
