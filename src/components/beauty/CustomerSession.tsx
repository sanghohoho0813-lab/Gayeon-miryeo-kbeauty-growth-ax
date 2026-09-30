"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { customerApi, type CustomerSession } from "@/lib/customer-account";
import { isLive, liveConfigured } from "@/lib/config";

/* 고객 로그인 상태 — 고객 화면 전체에서 공유 */
interface Value { status: "loading" | "ready" | "error"; session: CustomerSession | null; error?: string; refresh: () => Promise<void> }
const Ctx = createContext<Value>({ status: "loading", session: null, refresh: async () => undefined });

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [status, setStatus] = useState<Value["status"]>("loading");
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    if (isLive && !liveConfigured) { setSession(null); setStatus("ready"); return; }
    try { setSession(await customerApi().getSession()); setStatus("ready"); setError(undefined); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setStatus("error"); }
  }, []);
  useEffect(() => {
    void refresh();
    if (isLive && !liveConfigured) return;
    return customerApi().subscribe(() => void refresh());
  }, [refresh]);
  return <Ctx.Provider value={{ status, session, error, refresh }}>{children}</Ctx.Provider>;
}

export const useCustomerSession = () => useContext(Ctx);
/** 로그인한 고객 계정 id (운영자·미가입이면 null) — 추천 결과 저장 시 계정 연결용 */
export function useCustomerId(): string | null {
  const { session } = useCustomerSession();
  return session?.account && !session.operator ? session.userId : null;
}
