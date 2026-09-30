import { ApiError, getAdmin, handle, json } from "@/lib/server/supabase-admin";

/* 고객 탈퇴 (Live 전용) — 본인 토큰 확인 후 고객 데이터와 로그인 정보(auth.users)를 삭제한다.
   운영자 계정은 이 경로로 삭제할 수 없다. 추천 기록은 계정 연결만 끊겨 익명 통계로 남는다 (FK on delete set null). */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function DELETE(req: Request) {
  return handle(async () => {
    const admin = getAdmin();
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new ApiError(401, "NO_TOKEN", "로그인이 필요합니다.");
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new ApiError(401, "INVALID_TOKEN", "세션이 만료되었습니다. 다시 로그인하세요.");
    const uid = data.user.id;
    const member = await admin.from("organization_members").select("user_id").eq("user_id", uid).limit(1);
    if (member.error) throw new ApiError(500, "DB", member.error.message);
    if (member.data.length > 0) throw new ApiError(403, "OPERATOR", "운영자 계정은 고객 탈퇴로 삭제할 수 없습니다.");
    for (const [table, col] of [["customer_purchases", "customer_user_id"], ["customer_accounts", "user_id"]] as const) {
      const r = await admin.from(table).delete().eq(col, uid);
      if (r.error) throw new ApiError(500, "DB", r.error.message);
    }
    const del = await admin.auth.admin.deleteUser(uid);
    if (del.error) throw new ApiError(500, "AUTH", del.error.message);
    return json({ ok: true });
  });
}
