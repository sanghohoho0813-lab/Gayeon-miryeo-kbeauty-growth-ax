"use client";

import type { DataSnapshot, DataSource } from "./source";
import { newId } from "./source";
import type { GrowthAction } from "../types";
import { demoProducts, DEMO_LEAD_TIMES } from "../demo/products";
import { demoChannels, demoB2B, demoExports } from "../demo/channels";
import { demoInventory, demoProduction } from "../demo/inventory";
import { demoSales } from "../demo/sales";
import { demoCustomerEvents, demoCustomers, demoTechAssets, linkSeedFunnelSessions } from "../demo/customers";
import { demoCustomerAccounts, demoCustomerPurchases, demoSettlements } from "../demo/stage2";
import { addDaysISO, daysBetween, todayISO } from "../date";

/* DEMO 저장소 — localStorage 단일 JSON DB (DECISIONS D-002).
   같은 origin의 PC 화면과 Mobile iframe이 storage 이벤트로 같은 데이터를 공유한다. */

const KEY = "miryeo-demo-db-v2";
const CHANGE_EVENT = "miryeo-db-change";
/** 읽지 못한 Demo 자료 원본 (PASS 28, D-089) — 시연 데이터로 다시 시작하기 전에 같은 브라우저에 보관 (조용히 지우지 않음) */
const RECOVERY_KEY = "miryeo-demo-db-v2-recovered";
const RECOVERY_AT_KEY = "miryeo-demo-db-v2-recovered-at";
/** 브라우저 저장 한도 — 대부분 약 500만 글자 (UTF-16) */
export const DEMO_STORAGE_LIMIT = 5_000_000;

/** Demo 저장 실패 (공간 부족·자료 손상) — 저장된 척하지 않고 화면에 그대로 알린다 */
export class DemoStorageError extends Error {
  constructor(message: string) { super(message); this.name = "DemoStorageError"; }
}

/** Demo 고객 화면의 저장된 추천 결과 (Live: beauty_recommendations) */
export interface DemoBeautyResult { id: string; sessionId: string; customerUserId: string | null; productIds: string[]; reasons: Record<string, string>; createdAt: string }

interface DemoDB extends Omit<DataSnapshot, "loadedAt"> {
  version: 2;
  /** 2단계 보완 시드 적용 여부 (12개월 판매·회원·정산) */
  stage2?: boolean;
  /** Demo 판매 시드 형식 (2 = 일 단위) */
  seedSales?: number;
  /** PASS 10: Demo 상품 생산기간·MOQ 채움 */
  pass10?: boolean;
  /** PASS 33: 시드 고객 행동 전환 흐름 방문 번호 맞춤 (D-113) */
  pass33?: boolean;
  /** PASS 11: 샘플 자료 연습 모드 — 시드 없이 시작 */
  practice?: boolean;
  beautyResults: DemoBeautyResult[];
  seededOn: string;
  updatedAt: string;
}

function seed(): DemoDB {
  const now = new Date().toISOString();
  return {
    version: 2,
    seededOn: todayISO(),
    updatedAt: now,
    org: { name: "가연인터내셔널 (Demo)", pilotStartedOn: null },
    products: structuredClone(demoProducts),
    inventory: demoInventory(),
    production: demoProduction(),
    channels: structuredClone(demoChannels),
    sales: demoSales(),
    b2b: demoB2B(),
    exports: demoExports(),
    customers: demoCustomers(),
    customerEvents: demoCustomerEvents(),
    actions: [],
    actionEvents: [],
    proofEvents: [],
    techAssets: demoTechAssets(),
    baselines: [],
    customerAccounts: demoCustomerAccounts(),
    customerPurchases: demoCustomerPurchases(),
    settlements: demoSettlements(),
    monthlyTargets: [],
    importBatches: [],
    beautyResults: [],
    stage2: true,
    seedSales: 2,
    pass10: true,
    pass33: true,
  };
}

/** 샘플 자료 연습 — Live 첫날처럼 빈 상태. Demo 시드를 다시 채우지 않도록 시드 플래그는 켠다 */
function emptyPractice(): DemoDB {
  const now = new Date().toISOString();
  return {
    version: 2, seededOn: todayISO(), updatedAt: now,
    org: { name: "샘플 연습 (Demo)", pilotStartedOn: null },
    products: [], inventory: [], production: [], channels: [], sales: [], b2b: [], exports: [],
    customers: [], customerEvents: [], actions: [], actionEvents: [], proofEvents: [], techAssets: [], baselines: [],
    customerAccounts: [], customerPurchases: [], settlements: [], monthlyTargets: [], importBatches: [], beautyResults: [],
    stage2: true, seedSales: 2, pass10: true, pass33: true, practice: true,
  };
}

/** 며칠 뒤 다시 열어도 Demo 기준값이 "최근"으로 보이도록 seed 행의 날짜만 이동 */
function rebase(db: DemoDB): DemoDB {
  const today = todayISO();
  const delta = daysBetween(db.seededOn, today);
  if (delta <= 0) return db;
  const ms = delta * 86_400_000;
  db.sales = db.sales.map((s) => (s.source === "seed" ? { ...s, saleDate: addDaysISO(s.saleDate, delta) } : s));
  db.customerEvents = db.customerEvents.map((e) => (e.origin === "seed" ? { ...e, createdAt: new Date(Date.parse(e.createdAt) + ms).toISOString() } : e));
  db.customerPurchases = (db.customerPurchases ?? []).map((p) => (p.id.startsWith("demo-pur-") ? { ...p, purchasedOn: addDaysISO(p.purchasedOn, delta) } : p));
  db.settlements = (db.settlements ?? []).map((x) => (x.id.startsWith("demo-st-") ? { ...x, issuedOn: addDaysISO(x.issuedOn, delta), dueOn: x.dueOn ? addDaysISO(x.dueOn, delta) : x.dueOn, paidOn: x.paidOn ? addDaysISO(x.paidOn, delta) : x.paidOn } : x));
  db.seededOn = today;
  return db;
}

/** 화면이 쓰는 핵심 목록이 배열인지 — 아니면 손상으로 본다 */
const looksValid = (d: Partial<DemoDB>) => d.version === 2 && ["products", "sales", "channels", "inventory", "actions", "actionEvents", "proofEvents", "customerEvents"].every((k) => Array.isArray((d as Record<string, unknown>)[k]));

function read(): DemoDB {
  if (typeof window === "undefined") return seed();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB;
      if (looksValid(parsed)) {
        parsed.baselines ??= []; // PASS 2에서 추가된 필드
        parsed.monthlyTargets ??= []; // PASS 10
        parsed.importBatches ??= []; // PASS 28
        if (!parsed.pass10) {
          // PASS 10: 저장된 Demo 상품에 시연용 생산기간·MOQ (직접 입력한 상품은 그대로)
          parsed.products = parsed.products.map((p) => (p.isDemo && DEMO_LEAD_TIMES[p.id] && p.leadTimeDays == null ? { ...p, ...DEMO_LEAD_TIMES[p.id] } : p));
          parsed.pass10 = true;
          write(parsed, false);
        }
        if (!parsed.pass33) {
          // PASS 33 (D-113): 시드 고객 행동의 전환 흐름 방문 번호를 맞춤 (건수·시각 그대로, 직접 생긴 행동은 그대로)
          linkSeedFunnelSessions(parsed.customerEvents);
          parsed.pass33 = true;
          write(parsed, false);
        }
        if (parsed.stage2 && parsed.seedSales !== 2) {
          parsed.sales = [...demoSales(), ...parsed.sales.filter((x) => x.source !== "seed")];
          parsed.seedSales = 2;
          parsed.seededOn = todayISO();
          write(parsed, false);
        }
        if (!parsed.stage2) {
          // 2단계 보완: 12개월 판매 시드·회원·정산 추가 (직접 입력한 데이터는 유지)
          parsed.sales = [...demoSales(), ...parsed.sales.filter((x) => x.source !== "seed")];
          parsed.customerAccounts = [...demoCustomerAccounts(), ...(parsed.customerAccounts ?? []).filter((a) => !a.userId.startsWith("demo-cust-0"))];
          parsed.customerPurchases = [...demoCustomerPurchases(), ...(parsed.customerPurchases ?? []).filter((p) => !p.id.startsWith("demo-pur-"))];
          parsed.settlements = [...demoSettlements(), ...(parsed.settlements ?? []).filter((x) => !x.id.startsWith("demo-st-"))];
          parsed.beautyResults ??= [];
          parsed.stage2 = true;
          parsed.seedSales = 2;
          parsed.seededOn = todayISO();
          write(parsed, false);
        }
        const rebased = rebase(parsed);
        if (rebased.seededOn !== JSON.parse(raw).seededOn) write(rebased, false);
        return rebased;
      }
    }
  } catch {
    /* 아래에서 원본 보관 후 재시드 */
  }
  // 읽지 못한 자료는 지우기 전에 원본을 보관 → 시연 데이터로 다시 시작 + 안내 배너(원본 받기).
  // 보관할 공간도 없으면 덮어쓰지 않고 오류 → 복구 화면에서 원본 받기·다시 시작 (PASS 28, D-089)
  if (raw) {
    try {
      localStorage.setItem(RECOVERY_KEY, raw);
      localStorage.setItem(RECOVERY_AT_KEY, new Date().toISOString());
    } catch {
      throw new DemoStorageError("저장된 Demo 자료를 읽지 못했고, 원본을 따로 보관할 저장 공간도 부족합니다. '원본 파일 받기'로 자료를 받은 뒤 '시연 데이터로 다시 시작'을 누르세요.");
    }
  }
  const fresh = seed();
  write(fresh, false);
  return fresh;
}

function write(db: DemoDB, notify = true): boolean {
  db.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    return false; // 용량 초과 등 — mutate가 오류로 알린다 (예전처럼 저장된 척하지 않음)
  }
  if (notify && typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

function mutate(fn: (db: DemoDB) => void): Promise<void> {
  const db = read();
  fn(db);
  if (!write(db)) return Promise.reject(new DemoStorageError("이 브라우저의 저장 공간이 부족해 저장하지 못했습니다. 데이터 관리 > 내보내기에서 백업 파일을 받은 뒤 오래된 자료를 정리하거나, 실제 자료는 Live 주소를 사용하세요."));
  return Promise.resolve();
}

/** 새 레코드(id가 "new-"로 시작)는 저장 시 고유 id를 부여 */
function withId<T extends { id: string }>(item: T): T {
  return item.id.startsWith("new-") ? { ...item, id: newId(item.id.split("-")[1] ?? "id") } : item;
}

function upsertBy<T>(list: T[], item: T, key: (x: T) => string): T[] {
  const i = list.findIndex((x) => key(x) === key(item));
  if (i >= 0) {
    const next = [...list];
    next[i] = item;
    return next;
  }
  return [...list, item];
}

export const demoSource: DataSource = {
  mode: "demo",
  async loadAx() {
    const db = read();
    return { ...db, importLogReady: true, loadedAt: new Date().toISOString() };
  },
  async loadPublicProducts() {
    return read().products.filter((p) => p.isPublished);
  },
  subscribe(cb) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) cb();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, cb);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, cb);
    };
  },
  upsertProduct: (p) => mutate((db) => void (db.products = upsertBy(db.products, withId(p), (x) => x.id))),
  upsertInventory: (i) => mutate((db) => void (db.inventory = upsertBy(db.inventory, { ...i, updatedAt: new Date().toISOString() }, (x) => x.productId))),
  upsertChannel: (c) => mutate((db) => void (db.channels = upsertBy(db.channels, withId(c), (x) => x.id))),
  upsertProduction: (p) => mutate((db) => void (db.production = upsertBy(db.production, withId(p), (x) => x.id))),
  upsertB2B: (b) => mutate((db) => void (db.b2b = upsertBy(db.b2b, withId(b), (x) => x.id))),
  async addSales(rows, opts) {
    await mutate((db) => {
      db.sales = [...db.sales, ...rows.map((r) => ({ ...r, id: newId("sale"), importBatchId: opts?.batchId ?? r.importBatchId ?? null }))];
    });
    opts?.onProgress?.(rows.length, rows.length);
    return rows.length;
  },
  async createImportBatch(b) {
    const id = newId("imp");
    await mutate((db) => {
      db.importBatches = [{ id, kind: b.kind, fileName: b.fileName.slice(0, 200), rowCount: b.rowCount, createdAt: new Date().toISOString(), createdBy: b.actorName ?? null, undoneAt: null }, ...(db.importBatches ?? [])].slice(0, 100);
    });
    return id;
  },
  async undoImport(batchId) {
    let sales = 0, settlements = 0;
    await mutate((db) => {
      const b = (db.importBatches ?? []).find((x) => x.id === batchId);
      if (!b) throw new Error("가져오기 기록을 찾을 수 없습니다");
      if (b.undoneAt) throw new Error("이미 되돌린 파일입니다");
      const s0 = db.sales.length, t0 = db.settlements.length;
      db.sales = db.sales.filter((x) => x.importBatchId !== batchId);
      db.settlements = db.settlements.filter((x) => x.importBatchId !== batchId);
      sales = s0 - db.sales.length;
      settlements = t0 - db.settlements.length;
      db.importBatches = (db.importBatches ?? []).map((x) => (x.id === batchId ? { ...x, undoneAt: new Date().toISOString(), undoneBy: "Demo" } : x));
    });
    return { sales, settlements };
  },
  async deleteSales(ids) {
    const set = new Set(ids);
    let n = 0;
    await mutate((db) => { const before = db.sales.length; db.sales = db.sales.filter((x) => !set.has(x.id)); n = before - db.sales.length; });
    return n;
  },
  updateSale: (id, patch) =>
    mutate((db) => {
      const i = db.sales.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("판매 기록을 찾지 못했습니다 — 다시 불러온 뒤 시도하세요");
      db.sales[i] = { ...db.sales[i], saleDate: patch.saleDate, units: patch.units, revenue: patch.revenue };
    }),
  createActions: (cands) =>
    mutate((db) => {
      const now = new Date().toISOString();
      for (const c of cands) {
        if (db.actions.some((a) => a.ruleKey === c.ruleKey && ["NEW", "REVIEWED", "IN_PROGRESS"].includes(a.status))) continue;
        const action: GrowthAction = { ...c, id: newId("act"), status: "NEW", createdAt: now, updatedAt: now };
        db.actions.push(action);
        db.actionEvents.push({ id: newId("ae"), growthActionId: action.id, fromStatus: null, toStatus: "NEW", note: "RULE 감지로 생성", actorName: "시스템 (RULE)", createdAt: now });
      }
    }),
  updateAction: (id, patch, t) =>
    mutate((db) => {
      const now = new Date().toISOString();
      db.actions = db.actions.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now } : a));
      if (t.from !== t.to || t.note) db.actionEvents.push({ id: newId("ae"), growthActionId: id, fromStatus: t.from, toStatus: t.to, note: t.note ?? null, actorName: t.actorName, createdAt: now });
    }),
  createProof: (p) => mutate((db) => void db.proofEvents.push({ ...p, id: newId("proof"), createdAt: new Date().toISOString() })),
  updateProof: (id, patch) => mutate((db) => void (db.proofEvents = db.proofEvents.map((p) => (p.id === id ? { ...p, ...patch } : p)))),
  setProductFeatured: (productId, until) => mutate((db) => void (db.products = db.products.map((p) => (p.id === productId ? { ...p, featuredUntil: until } : p)))),
  upsertTechAsset: (t) => mutate((db) => void (db.techAssets = upsertBy(db.techAssets, { ...t, updatedAt: new Date().toISOString() }, (x) => x.id))),
  updateOrg: (patch) => mutate((db) => void (db.org = { ...db.org, ...patch })),
  upsertMonthlyTarget: (t) => mutate((db) => void (db.monthlyTargets = upsertBy(db.monthlyTargets ?? [], { ...t, setBy: t.setBy ?? "대표 (Demo)", updatedAt: new Date().toISOString() }, (x) => x.month))),
  deleteMonthlyTarget: (month) => mutate((db) => void (db.monthlyTargets = (db.monthlyTargets ?? []).filter((x) => x.month !== month))),
  upsertSettlement: (st) => mutate((db) => void (db.settlements = upsertBy(db.settlements, { ...withId(st), updatedAt: new Date().toISOString() }, (x) => x.id))),
  addStaffPurchase: (p) =>
    mutate((db) => {
      if (!db.customerAccounts.some((a) => a.userId === p.customerUserId)) throw new Error("고객 계정을 찾을 수 없습니다");
      db.customerPurchases.push({ ...p, id: newId("pur"), source: "STAFF", createdAt: new Date().toISOString() });
    }),
  lockBaseline: (b) =>
    mutate((db) => {
      const now = new Date().toISOString();
      db.baselines = db.baselines.map((x) => (x.kpiKey === b.kpiKey && !x.supersededAt ? { ...x, supersededAt: now } : x));
      db.baselines.push({ ...b, id: newId("bl"), lockedAt: now, supersededAt: null });
    }),
  trackEvent: (e) =>
    mutate((db) => {
      db.customerEvents.push({ id: newId("ev"), sessionId: e.sessionId, eventType: e.eventType, productId: e.productId ?? null, payload: e.payload, createdAt: new Date().toISOString(), origin: "live" });
      if (db.customerEvents.length > 5000) db.customerEvents = db.customerEvents.slice(-5000);
    }),
  saveBeautyResult: (sessionId, _profile, productIds, reasons, customerUserId) =>
    mutate((db) => {
      db.beautyResults.push({ id: newId("rec"), sessionId, customerUserId: customerUserId ?? null, productIds, reasons, createdAt: new Date().toISOString() });
      if (db.beautyResults.length > 500) db.beautyResults = db.beautyResults.slice(-500);
    }),
  async reset() {
    write(seed());
  },
};

/** Demo 전용: 샘플 자료 연습 시작 (이 브라우저의 Demo 데이터를 비움 — 끝나면 reset()으로 시연 데이터 복원) */
export function startPracticeDemo() {
  write(emptyPractice());
}

/** 읽지 못해 보관한 원본이 있으면 그 시각·크기 (안내 배너용) */
export function demoRecoveryInfo(): { at: string | null; chars: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    return raw ? { at: localStorage.getItem(RECOVERY_AT_KEY), chars: raw.length } : null;
  } catch { return null; }
}

/** 원본 Demo 자료 내려받기 — 보관본이 있으면 보관본, 없으면 지금 저장된 그대로 (손상돼도 글자 그대로) */
export function downloadDemoRaw(): boolean {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY) ?? localStorage.getItem(KEY);
    if (!raw) return false;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `miryeo_demo_raw_${todayISO()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}

export function clearDemoRecovery() {
  try { localStorage.removeItem(RECOVERY_KEY); localStorage.removeItem(RECOVERY_AT_KEY); } catch { /* 무시 */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 복구 화면 '시연 데이터로 다시 시작' — 손상된 자료를 지우고(원본은 먼저 받도록 안내) 새 시연 데이터 */
export function restartDemoFromSeed() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
  write(seed(), false);
}

/** 이 사이트가 브라우저에 쓰는 저장 공간 (글자 수 기준, 한도 약 500만) */
export function demoStorageUsage(): { chars: number; ratio: number } {
  if (typeof window === "undefined") return { chars: 0, ratio: 0 };
  let chars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? "";
      chars += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
  } catch { /* 무시 */ }
  return { chars, ratio: chars / DEMO_STORAGE_LIMIT };
}

/** 고객 계정 Demo 구현(customer-account.ts)용 — 같은 Demo DB를 읽고 쓴다 */
export const demoDb = { read: () => read(), mutate: (fn: (db: DemoDB) => void) => mutate(fn), CHANGE_EVENT };
