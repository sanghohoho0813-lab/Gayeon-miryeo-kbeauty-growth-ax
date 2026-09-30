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

/** 고객 회원가입: 가연인터내셔널의 개인정보 처리방침 URL·버전 (Live에서 URL이 없으면 가입을 막는다 — 계약 제17조) */
export const PRIVACY_POLICY_URL = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ?? "";
export const PRIVACY_VERSION = process.env.NEXT_PUBLIC_PRIVACY_VERSION ?? (isLive ? "" : "demo-draft");
export const customerSignupEnabled = !isLive || Boolean(PRIVACY_POLICY_URL && PRIVACY_VERSION);
