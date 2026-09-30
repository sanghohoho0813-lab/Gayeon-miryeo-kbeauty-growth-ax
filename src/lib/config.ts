/* 명시적 Data Mode — Live인데 Demo로 조용히 fallback하지 않는다 (DECISIONS D-001). */

export type DataMode = "demo" | "live";

export const DATA_MODE: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Customer Platform(비로그인)이 이벤트를 기록할 조직 ID */
export const PUBLIC_ORG_ID = process.env.NEXT_PUBLIC_MIRYEO_ORG_ID ?? "";

export const isLive = DATA_MODE === "live";
export const liveConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const DATA_SOURCE_LABEL = isLive ? "SUPABASE LIVE" : "DEMO DATA";
