"use client";

import type { DataSnapshot, DataSource } from "./source";
import { newId } from "./source";
import type { GrowthAction } from "../types";
import { demoProducts, DEMO_LEAD_TIMES } from "../demo/products";
import { demoChannels, demoB2B, demoExports } from "../demo/channels";
import { demoInventory, demoProduction } from "../demo/inventory";
import { demoSales } from "../demo/sales";
import { demoCustomerEvents, demoCustomers, demoTechAssets } from "../demo/customers";
import { demoCustomerAccounts, demoCustomerPurchases, demoSettlements } from "../demo/stage2";
import { addDaysISO, daysBetween, todayISO } from "../date";

/* DEMO 저장소 — localStorage 단일 JSON DB (DECISIONS D-002).
   같은 origin의 PC 화면과 Mobile iframe이 storage 이벤트로 같은 데이터를 공유한다. */

const KEY = "miryeo-demo-db-v2";
const CHANGE_EVENT = "miryeo-db-change";

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
    beautyResults: [],
    stage2: true,
    seedSales: 2,
    pass10: true,
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
    customerAccounts: [], customerPurchases: [], settlements: [], monthlyTargets: [], beautyResults: [],
    stage2: true, seedSales: 2, pass10: true, practice: true,
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

function read(): DemoDB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB;
      if (parsed.version === 2) {
        parsed.baselines ??= []; // PASS 2에서 추가된 필드
        parsed.monthlyTargets ??= []; // PASS 10
        if (!parsed.pass10) {
          // PASS 10: 저장된 Demo 상품에 시연용 생산기간·MOQ (직접 입력한 상품은 그대로)
          parsed.products = parsed.products.map((p) => (p.isDemo && DEMO_LEAD_TIMES[p.id] && p.leadTimeDays == null ? { ...p, ...DEMO_LEAD_TIMES[p.id] } : p));
          parsed.pass10 = true;
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
    /* 손상된 데이터 → 재시드 */
  }
  const fresh = seed();
  write(fresh, false);
  return fresh;
}

function write(db: DemoDB, notify = true) {
  db.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* 용량 초과 등 — Demo에서는 무시 */
  }
  if (notify && typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

function mutate(fn: (db: DemoDB) => void): Promise<void> {
  const db = read();
  fn(db);
  write(db);
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
    return { ...db, loadedAt: new Date().toISOString() };
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
  async addSales(rows) {
    await mutate((db) => {
      db.sales = [...db.sales, ...rows.map((r) => ({ ...r, id: newId("sale") }))];
    });
    return rows.length;
  },
  async deleteSales(ids) {
    const set = new Set(ids);
    let n = 0;
    await mutate((db) => { const before = db.sales.length; db.sales = db.sales.filter((x) => !set.has(x.id)); n = before - db.sales.length; });
    return n;
  },
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

/** 고객 계정 Demo 구현(customer-account.ts)용 — 같은 Demo DB를 읽고 쓴다 */
export const demoDb = { read: () => read(), mutate: (fn: (db: DemoDB) => void) => mutate(fn), CHANGE_EVENT };
