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
  Inventory,
  OrgSettings,
  Product,
  ProductionPlan,
  ProofEvent,
  SalesRecord,
  TechAsset,
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

  createActions(c: GrowthActionCandidate[]): Promise<void>;
  updateAction(id: string, patch: Partial<GrowthAction>, t: ActionTransition): Promise<void>;
  createProof(p: Omit<ProofEvent, "id" | "createdAt">): Promise<void>;
  updateProof(id: string, patch: Partial<ProofEvent>): Promise<void>;
  setProductFeatured(productId: string, until: string | null): Promise<void>;

  upsertTechAsset(t: TechAsset): Promise<void>;
  updateOrg(patch: Partial<OrgSettings>): Promise<void>;
  lockBaseline(b: Omit<KpiBaseline, "id" | "lockedAt" | "supersededAt">): Promise<void>;

  trackEvent(e: TrackInput): Promise<void>;
  saveBeautyResult(sessionId: string, profile: BeautyProfile, productIds: string[], reasons: Record<string, string>): Promise<void>;

  /** Demo 전용 — Live에서는 호출 불가 */
  reset(): Promise<void>;
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
