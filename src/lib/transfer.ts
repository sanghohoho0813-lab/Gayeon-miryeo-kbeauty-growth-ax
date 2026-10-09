import type { DataSnapshot, DataSource } from "./data/source";
import { uuidv4 } from "./data/source";
import type { Channel, Inventory, Product, ProductCategory, SalesRecord, Settlement, SettlementKind, SettlementStatus, SkinConcern, Texture } from "./types";
import { realScope } from "./start-guide";

/* 작업 데이터 백업·이관 (계약 3단계 "실제 자료 적용" — Supabase 연결 전 입력한 실데이터를 다시 입력하지 않게)
   - 내보내기: Demo 시드를 뺀 실데이터만 (채널·상품·재고·판매·정산 + Pilot 시작일·AX OWNER).
     고객 개인정보·고객 행동·Action/Proof 이력·Baseline은 넣지 않는다 (Baseline은 운영 환경에서 다시 잠근다).
   - 가져오기: 같은 상품(SKU)·채널(이름)·정산·판매는 건너뛰어 여러 번 가져와도 중복되지 않는다. 기존 값은 덮어쓰지 않는다.
   - 파일은 외부 입력이므로 모든 필드를 하나씩 검사해 새 객체로 만든다. */

export const TRANSFER_KIND = "miryeo-transfer";
export const TRANSFER_VERSION = 1;
const MAX_ROWS = 200_000;

export interface TransferFile {
  kind: typeof TRANSFER_KIND;
  version: number;
  exportedAt: string;
  fromMode: "demo" | "live";
  orgName: string;
  org: { pilotStartedOn: string | null; axOwnerName: string | null };
  channels: Channel[];
  products: Product[];
  inventory: Inventory[];
  sales: SalesRecord[];
  settlements: Settlement[];
}

export interface TransferSummary { channels: number; products: number; inventory: number; sales: number; settlements: number; skippedDemoSales: number }

/** 내보낼 실데이터. Demo 상품에 대한 판매는 빼고(시연용), 실판매가 쓴 Demo 채널은 함께 넣는다 (이름은 가져온 뒤 바꿀 수 있음). */
export function buildTransfer(s: DataSnapshot, mode: "demo" | "live", now = new Date().toISOString()): { file: TransferFile; summary: TransferSummary } {
  const real = realScope(s);
  const productIds = real.ids;
  const salesAll = real.sales;
  const sales = salesAll.filter((x) => productIds.has(x.productId));
  const usedChannels = new Set(sales.map((x) => x.channelId));
  const channels = s.channels.filter((c) => real.channels.some((r) => r.id === c.id) || usedChannels.has(c.id));
  const file: TransferFile = {
    kind: TRANSFER_KIND,
    version: TRANSFER_VERSION,
    exportedAt: now,
    fromMode: mode,
    orgName: s.org.name,
    org: { pilotStartedOn: s.org.pilotStartedOn ?? null, axOwnerName: s.org.axOwnerName ?? null },
    channels,
    products: real.products,
    inventory: real.inventory,
    sales,
    settlements: real.settlements,
  };
  return { file, summary: { channels: channels.length, products: real.products.length, inventory: real.inventory.length, sales: sales.length, settlements: real.settlements.length, skippedDemoSales: salesAll.length - sales.length } };
}

/* ---------- 파일 검사 ---------- */
const CATEGORIES: ProductCategory[] = ["에센스/앰플", "크림", "토너/미스트", "클렌저", "선케어", "마스크"];
const CHANNEL_TYPES: Channel["type"][] = ["직영몰", "온라인몰", "오프라인", "라이브/인플루언서", "B2B", "수출"];
const CONCERNS: SkinConcern[] = ["수분", "진정", "탄력", "피부결", "광채", "데일리 케어"];
const TEXTURES: Texture[] = ["가벼움", "중간", "리치"];
const S_KINDS: SettlementKind[] = ["B2B", "EXPORT", "CHANNEL", "OTHER"];
const S_STATUS: SettlementStatus[] = ["OPEN", "PARTIAL", "PAID", "CANCELLED"];
const SALE_SOURCES: SalesRecord["source"][] = ["manual", "csv", "api"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);
const optStr = (v: unknown, max = 500): string | null => (v == null || v === "" ? null : typeof v === "string" && v.length <= max ? v : null);
const num = (v: unknown, min = 0, max = 1e13): number | null => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
const int = (v: unknown, min = 0, max = 1e9): number | null => { const n = num(v, min, max); return n != null && Number.isInteger(n) ? n : null; };
const date = (v: unknown): string | null => (typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
const httpUrl = (v: unknown): string | null => (typeof v === "string" && v.length <= 1000 && (v === "" || /^https?:\/\/\S+$/i.test(v)) ? v : null);

export interface ParsedTransfer { file: TransferFile; errors: string[] }

export function parseTransfer(text: string): ParsedTransfer | { fatal: string } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { fatal: "JSON 형식이 아닙니다. 이 화면에서 받은 백업 파일(.json)을 선택하세요." }; }
  if (!isObj(raw) || raw.kind !== TRANSFER_KIND) return { fatal: "MIRYEO 백업 파일이 아닙니다." };
  if (raw.version !== TRANSFER_VERSION) return { fatal: `지원하지 않는 백업 파일 버전입니다 (${String(raw.version)}).` };
  const arr = (k: string): unknown[] => (Array.isArray(raw[k]) ? (raw[k] as unknown[]) : []);
  const total = ["channels", "products", "inventory", "sales", "settlements"].reduce((a, k) => a + arr(k).length, 0);
  if (total > MAX_ROWS) return { fatal: `행이 너무 많습니다 (${total.toLocaleString()} > ${MAX_ROWS.toLocaleString()}).` };
  const errors: string[] = [];
  const bad = (what: string, i: number) => { if (errors.length < 50) errors.push(`${what} ${i + 1}번째 항목 형식 오류 — 건너뜀`); };

  const channels: Channel[] = [];
  arr("channels").forEach((v, i) => {
    if (!isObj(v)) return bad("채널", i);
    const id = str(v.id, 80), name = str(v.name, 100), type = oneOf(v.type, CHANNEL_TYPES), rate = num(v.avgDiscountRate, 0, 0.95);
    if (!id || !name || !type || rate == null) return bad("채널", i);
    channels.push({ id, name, type, avgDiscountRate: rate, active: v.active !== false });
  });
  const products: Product[] = [];
  arr("products").forEach((v, i) => {
    if (!isObj(v)) return bad("상품", i);
    const id = str(v.id, 80), sku = str(v.sku, 80), name = str(v.name, 200), category = oneOf(v.category, CATEGORIES), price = int(v.price, 0, 1e9);
    if (!id || !sku || !name || !category || price == null) return bad("상품", i);
    const links = Array.isArray(v.purchaseLinks) ? v.purchaseLinks.filter(isObj).slice(0, 5).map((l) => ({ label: str(l.label, 60) ?? "구매처", url: httpUrl(l.url) ?? "" })) : [];
    products.push({
      id, sku, name, category, price,
      cost: v.cost == null ? undefined : num(v.cost, 0, 1e9) ?? undefined,
      line: optStr(v.line, 100) ?? undefined,
      status: oneOf(v.status, ["성장", "안정", "부진", "신규"] as const) ?? "신규",
      description: optStr(v.description, 2000) ?? undefined,
      concerns: Array.isArray(v.concerns) ? v.concerns.map((c) => oneOf(c, CONCERNS)).filter((c): c is SkinConcern => !!c) : [],
      texture: oneOf(v.texture, TEXTURES) ?? undefined,
      routineStep: int(v.routineStep, 1, 4) ?? undefined,
      isNew: v.isNew === true, isBest: v.isBest === true,
      isPublished: v.isPublished === true,
      purchaseLinks: links,
      mainChannelIds: [],
      usageDays: int(v.usageDays, 1, 365),
      isDemo: false,
    });
  });
  const pIds = new Set(products.map((p) => p.id));
  const cIds = new Set(channels.map((c) => c.id));
  const inventory: Inventory[] = [];
  arr("inventory").forEach((v, i) => {
    if (!isObj(v)) return bad("재고", i);
    const productId = str(v.productId, 80), cur = int(v.currentStock, 0, 1e9), safe = int(v.safetyStock, 0, 1e9), inc = int(v.incomingStock, 0, 1e9);
    if (!productId || !pIds.has(productId) || cur == null || safe == null || inc == null) return bad("재고", i);
    inventory.push({ productId, currentStock: cur, safetyStock: safe, incomingStock: inc, incomingDate: date(v.incomingDate) });
  });
  const sales: SalesRecord[] = [];
  arr("sales").forEach((v, i) => {
    if (!isObj(v)) return bad("판매", i);
    const productId = str(v.productId, 80), channelId = str(v.channelId, 80), saleDate = date(v.saleDate), units = int(v.units, 0, 1e7), revenue = num(v.revenue, 0, 1e12);
    if (!productId || !pIds.has(productId) || !channelId || !cIds.has(channelId) || !saleDate || units == null || revenue == null) return bad("판매", i);
    sales.push({ id: "", productId, channelId, saleDate, units, revenue, source: oneOf(v.source, SALE_SOURCES) ?? "manual" });
  });
  const settlements: Settlement[] = [];
  arr("settlements").forEach((v, i) => {
    if (!isObj(v)) return bad("정산", i);
    const id = str(v.id, 80), kind = oneOf(v.kind, S_KINDS), counterparty = str(v.counterparty, 100), amount = num(v.amount, 0, 1e12), paid = num(v.paidAmount, 0, 1e12), issuedOn = date(v.issuedOn), status = oneOf(v.status, S_STATUS);
    if (!id || !kind || !counterparty || amount == null || paid == null || !issuedOn || !status) return bad("정산", i);
    settlements.push({ id, kind, counterparty, refId: optStr(v.refId, 100), description: optStr(v.description, 300), amount, paidAmount: paid, issuedOn, dueOn: date(v.dueOn), paidOn: date(v.paidOn), status, note: optStr(v.note, 500) });
  });
  const org = isObj(raw.org) ? raw.org : {};
  return {
    errors,
    file: {
      kind: TRANSFER_KIND, version: TRANSFER_VERSION,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt.slice(0, 40) : "",
      fromMode: raw.fromMode === "live" ? "live" : "demo",
      orgName: str(raw.orgName, 100) ?? "",
      org: { pilotStartedOn: date(org.pilotStartedOn), axOwnerName: optStr(org.axOwnerName, 60) },
      channels, products, inventory, sales, settlements,
    },
  };
}

/* ---------- 가져오기 계획 (현재 데이터와 맞춰 보기) ---------- */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const norm = (v: string) => v.trim().toLowerCase();
const saleKey = (x: { saleDate: string; productId: string; channelId: string; units: number; revenue: number }) => `${x.saleDate}|${x.productId}|${x.channelId}|${x.units}|${Math.round(x.revenue)}`;

export interface TransferPlan {
  channels: { create: Channel[]; matched: number };
  products: { create: Product[]; matched: number };
  inventory: Inventory[];
  sales: { create: Omit<SalesRecord, "id">[]; duplicate: number };
  settlements: { create: Settlement[]; matched: number };
  org: { pilotStartedOn?: string; axOwnerName?: string };
  /** 가져올 Demo 이름 채널 (가져온 뒤 이름 변경 권장) */
  demoNamedChannels: string[];
  empty: boolean;
}

export function planTransfer(f: TransferFile, cur: DataSnapshot): TransferPlan {
  const chMap = new Map<string, string>();
  const chCreate: Channel[] = [];
  let chMatched = 0;
  const curChById = new Set(cur.channels.map((c) => c.id));
  const curChByName = new Map(cur.channels.map((c) => [norm(c.name), c.id]));
  for (const c of f.channels) {
    const hit = curChById.has(c.id) ? c.id : curChByName.get(norm(c.name));
    if (hit) { chMap.set(c.id, hit); chMatched++; continue; }
    const id = UUID.test(c.id) ? c.id : uuidv4();
    chMap.set(c.id, id);
    curChByName.set(norm(c.name), id);
    chCreate.push({ ...c, id });
  }
  const pMap = new Map<string, string>();
  const pCreate: Product[] = [];
  let pMatched = 0;
  const curPById = new Set(cur.products.map((p) => p.id));
  const curPBySku = new Map(cur.products.map((p) => [norm(p.sku), p.id]));
  for (const p of f.products) {
    const hit = curPById.has(p.id) ? p.id : curPBySku.get(norm(p.sku));
    if (hit) { pMap.set(p.id, hit); pMatched++; continue; }
    const id = UUID.test(p.id) ? p.id : uuidv4();
    pMap.set(p.id, id);
    curPBySku.set(norm(p.sku), id);
    pCreate.push({ ...p, id, mainChannelIds: [], isDemo: false });
  }
  const createdP = new Set(pCreate.map((p) => p.id));
  const hasInv = new Set(cur.inventory.map((i) => i.productId));
  const inventory = f.inventory.map((i) => ({ ...i, productId: pMap.get(i.productId)! })).filter((i) => i.productId && (createdP.has(i.productId) || !hasInv.has(i.productId)));
  const seen = new Set(cur.sales.map(saleKey));
  const salesCreate: Omit<SalesRecord, "id">[] = [];
  let dup = 0;
  for (const x of f.sales) {
    const row = { productId: pMap.get(x.productId)!, channelId: chMap.get(x.channelId)!, saleDate: x.saleDate, units: x.units, revenue: x.revenue, source: x.source };
    const k = saleKey(row);
    if (seen.has(k)) { dup++; continue; }
    seen.add(k);
    salesCreate.push(row);
  }
  const stKey = (s: Settlement) => `${norm(s.counterparty)}|${s.issuedOn}|${Math.round(s.amount)}|${s.kind}`;
  const curSt = new Set(cur.settlements.map(stKey));
  const curStIds = new Set(cur.settlements.map((s) => s.id));
  const stCreate: Settlement[] = [];
  let stMatched = 0;
  for (const s of f.settlements) {
    if (curStIds.has(s.id) || curSt.has(stKey(s))) { stMatched++; continue; }
    curSt.add(stKey(s));
    stCreate.push({ ...s, id: UUID.test(s.id) ? s.id : uuidv4() });
  }
  const org: TransferPlan["org"] = {};
  if (!cur.org.pilotStartedOn && f.org.pilotStartedOn) org.pilotStartedOn = f.org.pilotStartedOn;
  if (!cur.org.axOwnerName?.trim() && f.org.axOwnerName) org.axOwnerName = f.org.axOwnerName;
  return {
    channels: { create: chCreate, matched: chMatched },
    products: { create: pCreate, matched: pMatched },
    inventory,
    sales: { create: salesCreate, duplicate: dup },
    settlements: { create: stCreate, matched: stMatched },
    org,
    demoNamedChannels: chCreate.filter((c) => /demo/i.test(c.name)).map((c) => c.name),
    empty: !chCreate.length && !pCreate.length && !inventory.length && !salesCreate.length && !stCreate.length && !Object.keys(org).length,
  };
}

/** 순서: 채널 → 상품 → 재고 → 판매(500행씩) → 정산 → 조직 설정. 중간 실패 시 이미 들어간 항목은 남으며, 다시 가져오면 들어간 항목은 건너뛴다. */
export async function applyTransfer(plan: TransferPlan, s: DataSource, onProgress?: (label: string) => void): Promise<void> {
  for (const c of plan.channels.create) await s.upsertChannel(c);
  onProgress?.("채널");
  for (const p of plan.products.create) await s.upsertProduct(p);
  onProgress?.("상품");
  for (const i of plan.inventory) await s.upsertInventory(i);
  onProgress?.("재고");
  for (let i = 0; i < plan.sales.create.length; i += 500) {
    await s.addSales(plan.sales.create.slice(i, i + 500));
    onProgress?.(`판매 ${Math.min(i + 500, plan.sales.create.length).toLocaleString()}/${plan.sales.create.length.toLocaleString()}`);
  }
  for (const st of plan.settlements.create) await s.upsertSettlement(st);
  if (Object.keys(plan.org).length) await s.updateOrg(plan.org);
}
