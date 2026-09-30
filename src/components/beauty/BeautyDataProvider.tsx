"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";
import { getPublicSource } from "@/lib/customer-events";
import { isLive } from "@/lib/config";

/* Customer Platform 데이터 — 공개 상품만 로드 (Live: anon RLS is_published). Demo fallback 없음. */
type Status = "loading" | "ready" | "error" | "misconfigured";
interface Value { status: Status; products: Product[]; error?: string; reload: () => void }
const Ctx = createContext<Value>({ status: "loading", products: [], reload: () => undefined });

export function BeautyDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const src = getPublicSource();
    if (!src) { setStatus("misconfigured"); return; }
    try {
      setProducts(await src.loadPublicProducts());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    const src = getPublicSource();
    if (!src || isLive) return; // Live 공개 화면은 실시간 구독하지 않음 (anon)
    return src.subscribe(() => void load());
  }, [load]);

  return <Ctx.Provider value={{ status, products, error, reload: load }}>{children}</Ctx.Provider>;
}

export const useBeautyData = () => useContext(Ctx);

export function isFeatured(p: Product, now = Date.now()): boolean {
  return !!p.featuredUntil && Date.parse(p.featuredUntil) > now;
}
