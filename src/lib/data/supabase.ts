"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isLive, liveConfigured } from "../config";

let client: SupabaseClient | null = null;

/** Live 모드 Supabase 클라이언트. Demo이거나 설정이 없으면 null (Demo로 fallback하지 않는다).
 *  Demo 빌드의 브라우저 묶음에는 실제 라이브러리가 없다 (next.config.ts, PASS 38 D-140) */
export function getSupabase(): SupabaseClient | null {
  if (!isLive || !liveConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
