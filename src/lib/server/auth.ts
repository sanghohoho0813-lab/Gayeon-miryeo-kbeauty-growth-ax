import { createClient } from "@supabase/supabase-js";

/* 서버 Route 공통: Live 로그인 사용자가 대표·관리자인지 확인 (service role 키 없이 — 사용자 토큰 + RLS로 조회). */

if (typeof window !== "undefined") throw new Error("server/auth is server-only");

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function requireOwnerAdmin(req: Request): Promise<{ orgId: string; role: "OWNER" | "ADMIN" } | Response> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return jsonResponse({ error: "NO_TOKEN", message: "로그인이 필요합니다." }, 401);
  const sb = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return jsonResponse({ error: "INVALID_TOKEN", message: "세션이 만료되었습니다." }, 401);
  const m = await sb.from("organization_members").select("organization_id, role").eq("user_id", data.user.id).limit(1);
  const row = m.data?.[0];
  if (!row || !["OWNER", "ADMIN"].includes(row.role)) return jsonResponse({ error: "FORBIDDEN", message: "대표·관리자만 사용할 수 있습니다." }, 403);
  return { orgId: row.organization_id, role: row.role };
}
