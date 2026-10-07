import { createClient } from "@supabase/supabase-js";
import { jsonResponse, requireOwnerAdmin } from "@/lib/server/auth";

/* 공개 전 점검 — 서버 환경변수 상태. 값은 절대 돌려주지 않고 설정 여부·유효 여부만 알린다.
   Live: 대표·관리자만. Demo: 같은 정보(참/거짓)만. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ServiceRoleState = "missing" | "ok" | "invalid";
export interface SystemStatus {
  mode: "demo" | "live";
  serviceRole: ServiceRoleState;
  ai: { enabled: boolean; credential: boolean; allowDemo: boolean };
  checkedAt: string;
}

async function serviceRoleState(): Promise<ServiceRoleState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return "missing";
  if (!url) return "invalid";
  // 키가 실제로 관리자 권한을 갖는지 1건 조회로 확인 (결과 내용은 쓰지 않음)
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  return error ? "invalid" : "ok";
}

export async function GET(req: Request) {
  const live = process.env.NEXT_PUBLIC_DATA_MODE === "live";
  if (live) {
    const who = await requireOwnerAdmin(req);
    if (who instanceof Response) return who;
  }
  const body: SystemStatus = {
    mode: live ? "live" : "demo",
    serviceRole: live ? await serviceRoleState().catch(() => "invalid" as const) : process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
    ai: {
      enabled: process.env.AI_BRIEFING_ENABLED === "true",
      credential: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
      allowDemo: process.env.AI_BRIEFING_ALLOW_DEMO === "true",
    },
    checkedAt: new Date().toISOString(),
  };
  return jsonResponse(body);
}
