"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";
import { isLive, liveConfigured } from "@/lib/config";
import { getSupabase } from "@/lib/data/supabase";
import { demoSource } from "@/lib/data/demo-store";
import { createLiveSource } from "@/lib/data/live-source";
import type { DataSource } from "@/lib/data/source";
import { ROLE_LABEL } from "@/lib/permissions";

/* Session / Role — Demo: Role Switcher(localStorage, iframe 공유) / Live: Supabase Auth + organization_members */

export type SessionStatus = "loading" | "ready" | "signed_out" | "no_org" | "customer" | "misconfigured" | "error";

interface SessionValue {
  status: SessionStatus;
  error?: string;
  role: Role;
  /** Live에서 organization_members 확인 전에는 false — 역할 기반 메뉴·표시를 보류한다 (기본값 STAFF를 보여주지 않음) */
  roleReady: boolean;
  actorName: string;
  userEmail?: string;
  orgId?: string;
  source: DataSource | null;
  setDemoRole: (r: Role) => void;
  signOut: () => Promise<void>;
  refreshMembership: () => void;
}

const Ctx = createContext<SessionValue | null>(null);
const ROLE_KEY = "miryeo-demo-role";
export const OPERATOR_KEY = "miryeo-operator";

function readDemoRole(): Role {
  try {
    const r = localStorage.getItem(ROLE_KEY) as Role | null;
    if (r === "OWNER" || r === "ADMIN" || r === "STAFF") return r;
  } catch {
    /* noop */
  }
  return "OWNER";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [demoRole, setDemoRoleState] = useState<Role>("OWNER");
  const [status, setStatus] = useState<SessionStatus>(isLive ? "loading" : "ready");
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<{ orgId: string; role: Role } | null>(null);
  const [tick, setTick] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  // Demo role
  useEffect(() => {
    if (isLive) return;
    setDemoRoleState(readDemoRole());
    try { localStorage.setItem(OPERATOR_KEY, "1"); } catch { /* noop */ }
    const onStorage = (e: StorageEvent) => { if (e.key === ROLE_KEY) setDemoRoleState(readDemoRole()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Live auth
  useEffect(() => {
    if (!isLive) return;
    if (!liveConfigured) { setStatus("misconfigured"); return; }
    const sb = getSupabase()!;
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isLive || !liveConfigured || !authChecked) return;
    if (!session) { setMembership(null); setStatus("signed_out"); return; }
    const sb = getSupabase()!;
    setStatus("loading");
    sb.from("organization_members").select("organization_id, role").eq("user_id", session.user.id).limit(1).then(({ data, error: err }) => {
      if (err) { setError(err.message); setStatus("error"); return; }
      if (!data || data.length === 0) {
        setMembership(null);
        // 고객 계정으로 Business AX에 들어온 경우: 조직 만들기 대신 고객 화면 안내
        sb.from("customer_accounts").select("user_id").eq("user_id", session.user.id).maybeSingle().then(({ data: c }) => setStatus(c ? "customer" : "no_org"));
        return;
      }
      setMembership({ orgId: data[0].organization_id, role: data[0].role as Role });
      try { localStorage.setItem(OPERATOR_KEY, "1"); } catch { /* noop */ }
      setStatus("ready");
    });
  }, [session, tick, authChecked]);

  const setDemoRole = useCallback((r: Role) => {
    setDemoRoleState(r);
    try { localStorage.setItem(ROLE_KEY, r); } catch { /* noop */ }
  }, []);

  const signOut = useCallback(async () => {
    if (isLive) await getSupabase()?.auth.signOut();
    try { localStorage.removeItem(OPERATOR_KEY); } catch { /* noop */ }
  }, []);

  const value = useMemo<SessionValue>(() => {
    if (!isLive) {
      return { status: "ready", role: demoRole, roleReady: true, actorName: `${ROLE_LABEL[demoRole]} (Demo)`, orgId: "demo", source: demoSource, setDemoRole, signOut, refreshMembership: () => undefined };
    }
    const role = membership?.role ?? "STAFF";
    const sb = getSupabase();
    return {
      status, error, role, roleReady: status === "ready" && !!membership,
      actorName: session?.user.email ?? "-",
      userEmail: session?.user.email,
      orgId: membership?.orgId,
      source: sb && membership ? createLiveSource(sb, membership.orgId, session?.user.id ?? null) : null,
      setDemoRole, signOut, refreshMembership: () => setTick((t) => t + 1),
    };
  }, [demoRole, status, error, membership, session, setDemoRole, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}
