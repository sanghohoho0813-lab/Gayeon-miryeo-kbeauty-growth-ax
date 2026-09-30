import { ApiError, getAdmin, getCaller, handle, json } from "@/lib/server/supabase-admin";
import type { Role } from "@/lib/types";

/* 구성원 관리 API (Live 전용) — 조회: OWNER/ADMIN · 초대/역할변경/제거: OWNER
   service role 키는 서버에서만 사용하며, 모든 요청은 호출자의 로그인 토큰과 역할을 먼저 확인한다. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSIGNABLE: Role[] = ["ADMIN", "STAFF"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try { return (await req.json()) as Record<string, unknown>; } catch { throw new ApiError(400, "BAD_JSON", "요청 형식 오류"); }
}

export function GET(req: Request) {
  return handle(async () => {
    const admin = getAdmin();
    const caller = await getCaller(admin, req);
    if (caller.role === "STAFF") throw new ApiError(403, "FORBIDDEN", "구성원 목록은 대표·관리자만 볼 수 있습니다.");
    const rows = await admin.from("organization_members").select("user_id, role, created_at").eq("organization_id", caller.orgId).order("created_at");
    if (rows.error) throw new ApiError(500, "DB", rows.error.message);
    const members = await Promise.all(rows.data.map(async (r) => {
      const u = await admin.auth.admin.getUserById(r.user_id);
      return {
        userId: r.user_id, role: r.role, joinedAt: r.created_at,
        email: u.data.user?.email ?? "-",
        invited: !u.data.user?.last_sign_in_at,
        lastSignInAt: u.data.user?.last_sign_in_at ?? null,
        isSelf: r.user_id === caller.user.id,
      };
    }));
    return json({ members });
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const admin = getAdmin();
    const caller = await getCaller(admin, req);
    if (caller.role !== "OWNER") throw new ApiError(403, "FORBIDDEN", "구성원 초대는 대표(OWNER)만 가능합니다.");
    const body = await readBody(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = body.role as Role;
    if (!EMAIL_RE.test(email)) throw new ApiError(400, "BAD_EMAIL", "이메일 형식을 확인하세요.");
    if (!ASSIGNABLE.includes(role)) throw new ApiError(400, "BAD_ROLE", "초대 역할은 관리자 또는 직원입니다.");

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    let userId: string | null = null;
    const invited = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/login?invited=1` });
    if (invited.data.user) userId = invited.data.user.id;
    else {
      // 이미 가입된 사용자 → 메일 발송 없이 조직에만 추가
      for (let page = 1; page <= 20 && !userId; page++) {
        const list = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (list.error) throw new ApiError(500, "AUTH", list.error.message);
        userId = list.data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
        if (list.data.users.length < 200) break;
      }
      if (!userId) throw new ApiError(400, "INVITE_FAILED", invited.error?.message ?? "초대 실패");
    }
    const existing = await admin.from("organization_members").select("organization_id").eq("user_id", userId);
    if (existing.error) throw new ApiError(500, "DB", existing.error.message);
    if (existing.data.length > 0) throw new ApiError(409, "ALREADY_MEMBER", "이미 조직에 속한 사용자입니다.");
    const ins = await admin.from("organization_members").insert({ organization_id: caller.orgId, user_id: userId, role });
    if (ins.error) throw new ApiError(500, "DB", ins.error.message);
    await admin.from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
    return json({ ok: true, userId, emailSent: !!invited.data.user }, 201);
  });
}

async function targetMember(admin: ReturnType<typeof getAdmin>, orgId: string, userId: string) {
  const t = await admin.from("organization_members").select("role").eq("organization_id", orgId).eq("user_id", userId).maybeSingle();
  if (t.error) throw new ApiError(500, "DB", t.error.message);
  if (!t.data) throw new ApiError(404, "NOT_FOUND", "구성원을 찾을 수 없습니다.");
  if (t.data.role === "OWNER") throw new ApiError(400, "OWNER_LOCKED", "대표(OWNER) 계정은 여기서 변경할 수 없습니다.");
}

export function PATCH(req: Request) {
  return handle(async () => {
    const admin = getAdmin();
    const caller = await getCaller(admin, req);
    if (caller.role !== "OWNER") throw new ApiError(403, "FORBIDDEN", "역할 변경은 대표(OWNER)만 가능합니다.");
    const body = await readBody(req);
    const userId = String(body.userId ?? "");
    const role = body.role as Role;
    if (!ASSIGNABLE.includes(role)) throw new ApiError(400, "BAD_ROLE", "역할은 관리자 또는 직원입니다.");
    if (userId === caller.user.id) throw new ApiError(400, "SELF", "자기 역할은 바꿀 수 없습니다.");
    await targetMember(admin, caller.orgId, userId);
    const up = await admin.from("organization_members").update({ role }).eq("organization_id", caller.orgId).eq("user_id", userId);
    if (up.error) throw new ApiError(500, "DB", up.error.message);
    return json({ ok: true });
  });
}

export function DELETE(req: Request) {
  return handle(async () => {
    const admin = getAdmin();
    const caller = await getCaller(admin, req);
    if (caller.role !== "OWNER") throw new ApiError(403, "FORBIDDEN", "구성원 제거는 대표(OWNER)만 가능합니다.");
    const userId = new URL(req.url).searchParams.get("userId") ?? "";
    if (userId === caller.user.id) throw new ApiError(400, "SELF", "자기 자신은 제거할 수 없습니다.");
    await targetMember(admin, caller.orgId, userId);
    const del = await admin.from("organization_members").delete().eq("organization_id", caller.orgId).eq("user_id", userId);
    if (del.error) throw new ApiError(500, "DB", del.error.message);
    return json({ ok: true });
  });
}
