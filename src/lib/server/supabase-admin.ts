import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Role } from "../types";

/* 서버 전용 — SUPABASE_SERVICE_ROLE_KEY는 이 파일(Route Handler)에서만 읽는다.
   클라이언트 컴포넌트에서 import 금지 (NEXT_PUBLIC_ 접두사도 금지). */

if (typeof window !== "undefined") throw new Error("supabase-admin is server-only");

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "live") throw new ApiError(400, "NOT_LIVE", "Demo 모드에서는 서버 구성원 관리를 사용하지 않습니다.");
  if (!url || !key) throw new ApiError(503, "SERVER_KEY_MISSING", "서버 환경변수 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다 (USER ACTION).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface Caller {
  user: User;
  orgId: string;
  role: Role;
}

/** Authorization: Bearer <access_token> → 로그인 사용자 + 소속 조직·역할 */
export async function getCaller(admin: SupabaseClient, req: Request): Promise<Caller> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new ApiError(401, "NO_TOKEN", "로그인이 필요합니다.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "INVALID_TOKEN", "세션이 만료되었습니다. 다시 로그인하세요.");
  const m = await admin.from("organization_members").select("organization_id, role").eq("user_id", data.user.id).limit(1).maybeSingle();
  if (m.error) throw new ApiError(500, "DB", m.error.message);
  if (!m.data) throw new ApiError(403, "NO_ORG", "소속 조직이 없습니다.");
  return { user: data.user, orgId: m.data.organization_id, role: m.data.role as Role };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    if (e instanceof ApiError) return json({ error: e.code, message: e.message }, e.status);
    console.error("[api]", e);
    return json({ error: "INTERNAL", message: "서버 오류" }, 500);
  });
}
