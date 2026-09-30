"use client";

import type { CustomerEventType } from "./types";
import { isLive, PUBLIC_ORG_ID } from "./config";
import { demoSource } from "./data/demo-store";
import { createLiveSource } from "./data/live-source";
import { getSupabase } from "./data/supabase";
import type { DataSource } from "./data/source";

/* Customer Event Bridge — 고객 화면의 행동을 익명 session_id로 기록한다.
   Demo: 브라우저 Demo DB → Business AX가 storage 이벤트로 즉시 반영
   Live: Supabase customer_events insert (anon RLS) */

const SESSION_KEY = "miryeo-session-id";

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "s-anonymous";
  }
}

let publicSource: DataSource | null | undefined;
export function getPublicSource(): DataSource | null {
  if (publicSource !== undefined) return publicSource;
  if (!isLive) publicSource = demoSource;
  else {
    const sb = getSupabase();
    publicSource = sb && PUBLIC_ORG_ID ? createLiveSource(sb, PUBLIC_ORG_ID, null) : null;
  }
  return publicSource;
}

export function track(eventType: CustomerEventType, productId?: string | null, payload?: Record<string, unknown>): void {
  const src = getPublicSource();
  if (!src) {
    console.warn("[MIRYEO] Live 이벤트 기록 설정(NEXT_PUBLIC_MIRYEO_ORG_ID)이 없어 이벤트를 저장하지 않았습니다:", eventType);
    return;
  }
  src.trackEvent({ sessionId: getSessionId(), eventType, productId: productId ?? null, payload }).catch((e) => console.warn("[MIRYEO] event failed", e));
}
