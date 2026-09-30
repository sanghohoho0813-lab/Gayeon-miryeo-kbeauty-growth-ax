"use client";

import type { Role } from "./types";
import { isLive } from "./config";
import { getSupabase } from "./data/supabase";

/* 구성원 관리 클라이언트 — Live: 서버 API(/api/org/members, service role은 서버에서만) / Demo: 브라우저 저장 */

export interface Member {
  userId: string;
  email: string;
  role: Role;
  joinedAt: string;
  invited: boolean;
  lastSignInAt: string | null;
  isSelf: boolean;
}

export class MembersError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface MembersApi {
  list(): Promise<Member[]>;
  invite(email: string, role: Role): Promise<{ emailSent: boolean }>;
  setRole(userId: string, role: Role): Promise<void>;
  remove(userId: string): Promise<void>;
}

async function call<T>(method: string, body?: unknown, query = ""): Promise<T> {
  const sb = getSupabase();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  if (!token) throw new MembersError("NO_TOKEN", "로그인이 필요합니다.");
  const res = await fetch(`/api/org/members${query}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new MembersError(data.error ?? String(res.status), data.message ?? "요청 실패");
  return data as T;
}

const liveApi: MembersApi = {
  list: async () => (await call<{ members: Member[] }>("GET")).members,
  invite: async (email, role) => call<{ emailSent: boolean }>("POST", { email, role }),
  setRole: async (userId, role) => void (await call("PATCH", { userId, role })),
  remove: async (userId) => void (await call("DELETE", undefined, `?userId=${encodeURIComponent(userId)}`)),
};

export const DEMO_MEMBERS_KEY = "miryeo-demo-members";
const demoSeed = (): Member[] => {
  const t = new Date().toISOString();
  return [
    { userId: "demo-owner", email: "owner@demo.local", role: "OWNER", joinedAt: t, invited: false, lastSignInAt: t, isSelf: true },
    { userId: "demo-admin", email: "admin@demo.local", role: "ADMIN", joinedAt: t, invited: false, lastSignInAt: t, isSelf: false },
    { userId: "demo-staff", email: "staff@demo.local", role: "STAFF", joinedAt: t, invited: false, lastSignInAt: null, isSelf: false },
  ];
};
function readDemo(): Member[] {
  try {
    const raw = localStorage.getItem(DEMO_MEMBERS_KEY);
    if (raw) return JSON.parse(raw) as Member[];
  } catch { /* noop */ }
  return demoSeed();
}
function writeDemo(list: Member[]) {
  try { localStorage.setItem(DEMO_MEMBERS_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

const demoApi: MembersApi = {
  list: async () => readDemo(),
  async invite(email, role) {
    const list = readDemo();
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new MembersError("BAD_EMAIL", "이메일 형식을 확인하세요.");
    if (list.some((m) => m.email === e)) throw new MembersError("ALREADY_MEMBER", "이미 조직에 속한 사용자입니다.");
    writeDemo([...list, { userId: `demo-${Date.now()}`, email: e, role, joinedAt: new Date().toISOString(), invited: true, lastSignInAt: null, isSelf: false }]);
    return { emailSent: false };
  },
  async setRole(userId, role) {
    writeDemo(readDemo().map((m) => (m.userId === userId && m.role !== "OWNER" ? { ...m, role } : m)));
  },
  async remove(userId) {
    writeDemo(readDemo().filter((m) => m.userId !== userId || m.role === "OWNER"));
  },
};

export const membersApi: MembersApi = isLive ? liveApi : demoApi;
