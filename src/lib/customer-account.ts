"use client";

import type { CustomerAccount, CustomerPurchase, SavedRecommendation, SkinConcern } from "./types";
import { isLive, PRIVACY_VERSION, PUBLIC_ORG_ID } from "./config";
import { getSupabase } from "./data/supabase";
import { demoDb } from "./data/demo-store";
import { toCustomerAccount, toPurchase } from "./data/live-source";
import { newId } from "./data/source";
import { getSessionId } from "./customer-events";

/* 고객 회원 (계약 별지 제1호 ⑥ 고객 뷰티 기록·회원·재구매)
   Live: Supabase Auth + customer_accounts (RLS: 본인만, 대표·관리자 조회) / Demo: 브라우저 Demo DB
   운영자 계정(organization_members)은 고객으로 가입할 수 없다. */

export interface CustomerSession {
  userId: string;
  email?: string | null;
  account: CustomerAccount | null; // null = 로그인했지만 동의·가입 미완료
  operator: boolean; // 운영자 계정으로 고객 화면을 보는 중
}

export interface SignupInput {
  email: string;
  password: string;
  displayName?: string;
  concerns: SkinConcern[];
  marketingConsent: boolean;
}

export interface ConsentInput {
  displayName?: string;
  concerns: SkinConcern[];
  marketingConsent: boolean;
}

export interface CustomerApi {
  getSession(): Promise<CustomerSession | null>;
  signUp(input: SignupInput): Promise<{ needsEmailConfirm: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  completeSignup(c: ConsentInput): Promise<void>;
  updateAccount(patch: Partial<Pick<CustomerAccount, "displayName" | "skinConcerns" | "marketingConsent">>): Promise<void>;
  listMyRecommendations(): Promise<SavedRecommendation[]>;
  listMyPurchases(): Promise<CustomerPurchase[]>;
  addMyPurchase(p: { productId: string; quantity: number; purchasedOn: string; channelLabel?: string }): Promise<void>;
  deleteMyPurchase(id: string): Promise<void>;
  deleteAccount(): Promise<{ fullyDeleted: boolean }>;
  subscribe(cb: () => void): () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_KEY = "miryeo-pending-consent";
const CUSTOMER_EVENT = "miryeo-customer-change";
const notify = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(CUSTOMER_EVENT)); };

function savePending(c: ConsentInput) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ ...c, agreedAt: new Date().toISOString() })); } catch { /* noop */ }
}
function readPending(): (ConsentInput & { agreedAt: string }) | null {
  try { const raw = localStorage.getItem(PENDING_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function clearPending() { try { localStorage.removeItem(PENDING_KEY); } catch { /* noop */ } }

/* ---------------- Live ---------------- */
function liveApi(): CustomerApi {
  const sb = () => {
    const c = getSupabase();
    if (!c) throw new Error("Supabase 설정이 없습니다.");
    return c;
  };
  const uid = async () => {
    const { data } = await sb().auth.getSession();
    if (!data.session) throw new Error("로그인이 필요합니다.");
    return data.session.user.id;
  };
  async function createAccount(c: ConsentInput & { agreedAt?: string }) {
    const userId = await uid();
    if (!PUBLIC_ORG_ID) throw new Error("NEXT_PUBLIC_MIRYEO_ORG_ID가 설정되지 않았습니다.");
    const { error } = await sb().from("customer_accounts").insert({
      user_id: userId, organization_id: PUBLIC_ORG_ID, display_name: c.displayName?.trim() || null, skin_concerns: c.concerns,
      marketing_consent: c.marketingConsent, privacy_agreed_at: c.agreedAt ?? new Date().toISOString(), privacy_version: PRIVACY_VERSION,
    });
    if (error) throw new Error(error.message.includes("row-level security") ? "운영자 계정은 고객으로 가입할 수 없습니다." : error.message);
    clearPending();
    await sb().rpc("claim_session", { p_session: getSessionId() });
    notify();
  }
  const api: CustomerApi = {
    async getSession() {
      const { data } = await sb().auth.getSession();
      const s = data.session;
      if (!s) return null;
      const [acc, mem] = await Promise.all([
        sb().from("customer_accounts").select("*").eq("user_id", s.user.id).maybeSingle(),
        sb().from("organization_members").select("organization_id").eq("user_id", s.user.id).limit(1),
      ]);
      if (acc.error) throw new Error(acc.error.message);
      const operator = (mem.data?.length ?? 0) > 0;
      let account = acc.data ? toCustomerAccount(acc.data) : null;
      // 이메일 인증 후 첫 로그인: 가입 시 받은 동의로 계정 생성
      if (!account && !operator) {
        const pending = readPending();
        if (pending) { await createAccount(pending); const again = await sb().from("customer_accounts").select("*").eq("user_id", s.user.id).maybeSingle(); account = again.data ? toCustomerAccount(again.data) : null; }
      }
      return { userId: s.user.id, email: s.user.email, account, operator };
    },
    async signUp(input) {
      if (!EMAIL_RE.test(input.email)) throw new Error("이메일 형식을 확인하세요.");
      if (input.password.length < 8) throw new Error("비밀번호는 8자 이상");
      savePending({ displayName: input.displayName, concerns: input.concerns, marketingConsent: input.marketingConsent });
      const { data, error } = await sb().auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo: `${window.location.origin}/beauty/me` } });
      if (error) throw new Error(error.message);
      if (data.session) await createAccount({ ...readPending()!, agreedAt: readPending()?.agreedAt });
      notify();
      return { needsEmailConfirm: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb().auth.signInWithPassword({ email, password });
      if (error) throw new Error("이메일 또는 비밀번호를 확인하세요.");
      notify();
    },
    async signOut() { await sb().auth.signOut(); notify(); },
    completeSignup: (c) => createAccount(c),
    async updateAccount(patch) {
      const row: Record<string, unknown> = {};
      if ("displayName" in patch) row.display_name = patch.displayName?.trim() || null;
      if (patch.skinConcerns) row.skin_concerns = patch.skinConcerns;
      if ("marketingConsent" in patch) row.marketing_consent = patch.marketingConsent;
      const { error } = await sb().from("customer_accounts").update(row).eq("user_id", await uid());
      if (error) throw new Error(error.message);
      notify();
    },
    async listMyRecommendations() {
      const { data, error } = await sb().from("beauty_recommendations").select("id, created_at, product_ids, reasons").eq("customer_user_id", await uid()).order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({ id: r.id, createdAt: r.created_at, productIds: r.product_ids ?? [], reasons: r.reasons ?? {} }));
    },
    async listMyPurchases() {
      const { data, error } = await sb().from("customer_purchases").select("*").eq("customer_user_id", await uid()).order("purchased_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(toPurchase);
    },
    async addMyPurchase(p) {
      const { error } = await sb().from("customer_purchases").insert({ organization_id: PUBLIC_ORG_ID, customer_user_id: await uid(), product_id: p.productId, quantity: p.quantity, purchased_on: p.purchasedOn, channel_label: p.channelLabel || null, source: "SELF" });
      if (error) throw new Error(error.message);
      notify();
    },
    async deleteMyPurchase(id) {
      const { error } = await sb().from("customer_purchases").delete().eq("id", id);
      if (error) throw new Error(error.message);
      notify();
    },
    async deleteAccount() {
      const token = (await sb().auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/customer/account", { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
      if (res.ok) { await sb().auth.signOut(); notify(); return { fullyDeleted: true }; }
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (body.error !== "SERVER_KEY_MISSING") throw new Error(body.message ?? "탈퇴 처리 실패");
      // 서버 키 미설정: 본인 권한으로 지울 수 있는 정보(계정·자기기록 구매)만 삭제, 로그인 정보는 운영자 처리
      const id = await uid();
      await sb().from("customer_purchases").delete().eq("customer_user_id", id);
      const { error } = await sb().from("customer_accounts").delete().eq("user_id", id);
      if (error) throw new Error(error.message);
      await sb().auth.signOut();
      notify();
      return { fullyDeleted: false };
    },
    subscribe(cb) {
      const { data } = sb().auth.onAuthStateChange(() => cb());
      window.addEventListener(CUSTOMER_EVENT, cb);
      return () => { data.subscription.unsubscribe(); window.removeEventListener(CUSTOMER_EVENT, cb); };
    },
  };
  return api;
}

/* ---------------- Demo ---------------- */
const DEMO_CUSTOMER_KEY = "miryeo-demo-customer";
function demoCurrent(): string | null {
  try { return localStorage.getItem(DEMO_CUSTOMER_KEY); } catch { return null; }
}
function setDemoCurrent(id: string | null) {
  try { if (id) localStorage.setItem(DEMO_CUSTOMER_KEY, id); else localStorage.removeItem(DEMO_CUSTOMER_KEY); } catch { /* noop */ }
  notify();
}
function demoApi(): CustomerApi {
  const need = () => {
    const id = demoCurrent();
    if (!id) throw new Error("로그인이 필요합니다.");
    return id;
  };
  const claim = (userId: string) => demoDb.mutate((db) => {
    const sid = getSessionId();
    db.beautyResults = db.beautyResults.map((r) => (r.sessionId === sid && !r.customerUserId ? { ...r, customerUserId: userId } : r));
  });
  return {
    async getSession() {
      const id = demoCurrent();
      if (!id) return null;
      const account = demoDb.read().customerAccounts.find((a) => a.userId === id) ?? null;
      if (!account) { setDemoCurrent(null); return null; }
      return { userId: id, email: account.email, account, operator: false };
    },
    async signUp(input) {
      const email = input.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw new Error("이메일 형식을 확인하세요.");
      if (input.password.length < 8) throw new Error("비밀번호는 8자 이상");
      if (demoDb.read().customerAccounts.some((a) => a.email === email)) throw new Error("이미 가입된 이메일입니다.");
      const userId = newId("demo-user");
      const now = new Date().toISOString();
      await demoDb.mutate((db) => {
        db.customerAccounts.push({ userId, email, displayName: input.displayName?.trim() || null, skinConcerns: input.concerns, marketingConsent: input.marketingConsent, privacyAgreedAt: now, privacyVersion: PRIVACY_VERSION, createdAt: now });
      });
      await claim(userId);
      setDemoCurrent(userId);
      return { needsEmailConfirm: false };
    },
    async signIn(email) {
      const acc = demoDb.read().customerAccounts.find((a) => a.email === email.trim().toLowerCase());
      if (!acc) throw new Error("가입된 이메일이 아닙니다. (Demo)");
      setDemoCurrent(acc.userId);
    },
    async signOut() { setDemoCurrent(null); },
    async completeSignup() { /* Demo는 가입 시 바로 계정 생성 */ },
    async updateAccount(patch) {
      const id = need();
      await demoDb.mutate((db) => {
        db.customerAccounts = db.customerAccounts.map((a) => (a.userId === id ? { ...a, ...(patch.displayName !== undefined ? { displayName: patch.displayName?.trim() || null } : {}), ...(patch.skinConcerns ? { skinConcerns: patch.skinConcerns } : {}), ...(patch.marketingConsent !== undefined ? { marketingConsent: patch.marketingConsent } : {}) } : a));
      });
      notify();
    },
    async listMyRecommendations() {
      const id = need();
      return demoDb.read().beautyResults.filter((r) => r.customerUserId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => ({ id: r.id, createdAt: r.createdAt, productIds: r.productIds, reasons: r.reasons }));
    },
    async listMyPurchases() {
      const id = need();
      return demoDb.read().customerPurchases.filter((p) => p.customerUserId === id).sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn));
    },
    async addMyPurchase(p) {
      const id = need();
      await demoDb.mutate((db) => void db.customerPurchases.push({ id: newId("pur"), customerUserId: id, productId: p.productId, quantity: p.quantity, purchasedOn: p.purchasedOn, channelLabel: p.channelLabel || null, source: "SELF", createdAt: new Date().toISOString() }));
      notify();
    },
    async deleteMyPurchase(pid) {
      const id = need();
      await demoDb.mutate((db) => void (db.customerPurchases = db.customerPurchases.filter((p) => !(p.id === pid && p.customerUserId === id && p.source === "SELF"))));
      notify();
    },
    async deleteAccount() {
      const id = need();
      await demoDb.mutate((db) => {
        db.customerAccounts = db.customerAccounts.filter((a) => a.userId !== id);
        db.customerPurchases = db.customerPurchases.filter((p) => p.customerUserId !== id);
        db.beautyResults = db.beautyResults.map((r) => (r.customerUserId === id ? { ...r, customerUserId: null } : r));
      });
      setDemoCurrent(null);
      return { fullyDeleted: true };
    },
    subscribe(cb) {
      const onStorage = (e: StorageEvent) => { if (e.key === DEMO_CUSTOMER_KEY || e.key === null) cb(); };
      window.addEventListener("storage", onStorage);
      window.addEventListener(CUSTOMER_EVENT, cb);
      window.addEventListener(demoDb.CHANGE_EVENT, cb);
      return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(CUSTOMER_EVENT, cb); window.removeEventListener(demoDb.CHANGE_EVENT, cb); };
    },
  };
}

let api: CustomerApi | null = null;
export function customerApi(): CustomerApi {
  if (!api) api = isLive ? liveApi() : demoApi();
  return api;
}
