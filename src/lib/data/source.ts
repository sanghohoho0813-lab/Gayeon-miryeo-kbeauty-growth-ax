import type {
  ActionStatus,
  B2BAccount,
  BeautyProfile,
  Channel,
  CustomerEvent,
  CustomerEventType,
  CustomerProfile,
  ExportRecord,
  GrowthAction,
  GrowthActionCandidate,
  KpiBaseline,
  ActionEvent,
  CustomerAccount,
  CustomerPurchase,
  Inventory,
  OrgSettings,
  Product,
  ProductionPlan,
  ProofEvent,
  SalesRecord,
  Settlement,
  TechAsset,
  MonthlyTarget,
} from "../types";
import type { DataMode } from "../config";

/* UI → Service(DataSource) → DEMO 또는 LIVE.
   화면 코드는 Demo 배열이나 Supabase를 직접 import하지 않는다. */

export interface DataSnapshot {
  org: OrgSettings;
  products: Product[];
  inventory: Inventory[];
  production: ProductionPlan[];
  channels: Channel[];
  sales: SalesRecord[];
  b2b: B2BAccount[];
  exports: ExportRecord[];
  customers: CustomerProfile[];
  customerEvents: CustomerEvent[];
  actions: GrowthAction[];
  actionEvents: ActionEvent[];
  proofEvents: ProofEvent[];
  techAssets: TechAsset[];
  /** 활성 + 이력(superseded) 전체 */
  baselines: KpiBaseline[];
  /** 고객 개인정보 — Live RLS상 OWNER/ADMIN만 (STAFF는 빈 배열) */
  customerAccounts: CustomerAccount[];
  customerPurchases: CustomerPurchase[];
  /** 정산·미수금 — OWNER/ADMIN만 */
  settlements: Settlement[];
  /** 월 매출 목표 — 조회 OWNER/ADMIN, 입력 OWNER (migration 008) */
  monthlyTargets: MonthlyTarget[];
  /** Demo 전용: 샘플 자료 연습 모드 (Demo 시드 없이 빈 상태에서 샘플 파일로 실제 업무 리허설) */
  practice?: boolean;
  loadedAt: string;
}

export interface TrackInput {
  sessionId: string;
  eventType: CustomerEventType;
  productId?: string | null;
  payload?: Record<string, unknown>;
}

export interface ActionTransition {
  from: ActionStatus | null;
  to: ActionStatus;
  note?: string;
  actorName: string;
}

export interface DataSource {
  mode: DataMode;
  loadAx(): Promise<DataSnapshot>;
  loadPublicProducts(): Promise<Product[]>;
  subscribe(cb: () => void): () => void;

  upsertProduct(p: Product): Promise<void>;
  upsertInventory(i: Inventory): Promise<void>;
  upsertChannel(c: Channel): Promise<void>;
  upsertProduction(p: ProductionPlan): Promise<void>;
  upsertB2B(b: B2BAccount): Promise<void>;
  addSales(rows: Omit<SalesRecord, "id">[]): Promise<number>;
  /** 판매 행 삭제 — 대표·관리자 (DB 정책 sales_delete). 데이터 품질 점검의 잘못 들어온 행 정리용 */
  deleteSales(ids: string[]): Promise<number>;

  createActions(c: GrowthActionCandidate[]): Promise<void>;
  updateAction(id: string, patch: Partial<GrowthAction>, t: ActionTransition): Promise<void>;
  createProof(p: Omit<ProofEvent, "id" | "createdAt">): Promise<void>;
  updateProof(id: string, patch: Partial<ProofEvent>): Promise<void>;
  setProductFeatured(productId: string, until: string | null): Promise<void>;

  upsertTechAsset(t: TechAsset): Promise<void>;
  updateOrg(patch: Partial<OrgSettings>): Promise<void>;
  lockBaseline(b: Omit<KpiBaseline, "id" | "lockedAt" | "supersededAt">): Promise<void>;
  upsertSettlement(s: Settlement): Promise<void>;
  upsertMonthlyTarget(t: MonthlyTarget): Promise<void>;
  deleteMonthlyTarget(month: string): Promise<void>;
  /** 운영자가 고객 구매를 기록 (source=STAFF) */
  addStaffPurchase(p: Omit<CustomerPurchase, "id" | "createdAt" | "source">): Promise<void>;

  trackEvent(e: TrackInput): Promise<void>;
  saveBeautyResult(sessionId: string, profile: BeautyProfile, productIds: string[], reasons: Record<string, string>, customerUserId?: string | null): Promise<void>;

  /** Demo 전용 — Live에서는 호출 불가 */
  reset(): Promise<void>;
}

/** DB uuid 컬럼용 v4 UUID (비보안 컨텍스트에서도 동작) */
export function uuidv4(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) {
    try { return c.randomUUID(); } catch { /* insecure context */ }
  }
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function newId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* insecure context */
    }
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
