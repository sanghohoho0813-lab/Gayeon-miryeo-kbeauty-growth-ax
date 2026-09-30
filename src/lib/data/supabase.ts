"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, liveConfigured } from "../config";

let client: SupabaseClient | null = null;

/** Live 모드 Supabase 클라이언트. 설정이 없으면 null (Demo로 fallback하지 않는다). */
export function getSupabase(): SupabaseClient | null {
  if (!liveConfigured) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
