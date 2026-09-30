"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, UserX } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { ErrorState } from "./States";
import { toast } from "./Toast";
import { useSession } from "@/components/providers/SessionProvider";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { formatDateTimeKR } from "@/lib/date";
import { getSupabase } from "@/lib/data/supabase";
import { membersApi, MembersError, type Member } from "@/lib/members";
import type { Role } from "@/lib/types";

/* 구성원 — 조회: OWNER/ADMIN · 초대/역할/제거: OWNER. Live는 서버 API가 한 번 더 검사한다. */
export function MembersCard() {
  const { role, userEmail, actorName } = useSession();
  const owner = can(role, "manage_org");
  const canView = role !== "STAFF";
  const [list, setList] = useState<Member[] | null>(null);
  const [err, setErr] = useState<MembersError | null>(null);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("STAFF");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    try { setList(await membersApi.list()); setErr(null); } catch (e) { setErr(e instanceof MembersError ? e : new MembersError("UNKNOWN", String(e))); }
  }, [canView]);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await fn(); toast(msg); await load(); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); } finally { setBusy(false); }
  };

  return (
    <DataCard title="구성원" className="@4xl:col-span-2" id="members">
      <p className="text-[0.92rem]">현재 로그인: <b>{isLive ? userEmail : actorName}</b> · {ROLE_LABEL[role]}</p>

      {!canView ? (
        <p className="mt-3 rounded-xl bg-surface-muted p-3.5 text-[0.9rem] text-ink-soft">구성원 목록은 대표·관리자만 볼 수 있습니다.</p>
      ) : err ? (
        err.code === "SERVER_KEY_MISSING" ? (
          <div className="mt-3 rounded-xl p-3.5 text-[0.9rem]" style={{ background: "var(--warning-soft)" }}>
            <b style={{ color: "var(--warning)" }}>USER ACTION 필요</b> — 서버 환경변수 <code>SUPABASE_SERVICE_ROLE_KEY</code>가 없어 앱 내 초대를 쓸 수 없습니다. Vercel 환경변수에 추가 후 재배포하거나, SETUP.md §C의 SQL로 추가하세요.
          </div>
        ) : <div className="mt-3"><ErrorState message={err.message} onRetry={() => void load()} /></div>
      ) : !list ? (
        <p className="mt-3 text-[0.9rem] text-ink-soft">불러오는 중…</p>
      ) : (
        <div className="table-scroll mt-3">
          <table className="!min-w-[560px] w-full text-[0.88rem]">
            <thead><tr className="border-b text-left text-ink-soft" style={{ borderColor: "var(--border)" }}><th className="py-2 pr-3 font-semibold">이메일</th><th className="py-2 pr-3 font-semibold">역할</th><th className="py-2 pr-3 font-semibold">상태</th><th className="py-2 font-semibold"><span className="sr-only">작업</span></th></tr></thead>
            <tbody>
              {list.map((m) => {
                const editable = owner && m.role !== "OWNER" && !m.isSelf;
                return (
                  <tr key={m.userId} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="break-any py-2 pr-3">{m.email}{m.isSelf && <span className="ml-1.5 text-ink-soft">(나)</span>}</td>
                    <td className="py-2 pr-3">
                      {editable ? (
                        <select className="field !min-h-[36px] !w-auto !py-1 text-[0.86rem]" aria-label={`${m.email} 역할`} value={m.role} disabled={busy} onChange={(e) => act(() => membersApi.setRole(m.userId, e.target.value as Role), "역할을 변경했습니다")}>
                          <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
                          <option value="STAFF">{ROLE_LABEL.STAFF}</option>
                        </select>
                      ) : `${ROLE_LABEL[m.role]} (${m.role})`}
                    </td>
                    <td className="py-2 pr-3">{m.invited ? <StatusBadge tone="warning">초대됨 · 미접속</StatusBadge> : <span className="text-ink-soft">{m.lastSignInAt ? `최근 ${formatDateTimeKR(m.lastSignInAt)}` : "-"}</span>}</td>
                    <td className="py-2 text-right">
                      {editable && <button className="btn-ghost !min-h-[36px] text-[0.84rem]" style={{ color: "var(--danger)" }} disabled={busy} onClick={() => { if (window.confirm(`${m.email}을(를) 조직에서 제거할까요? 계정은 삭제되지 않습니다.`)) void act(() => membersApi.remove(m.userId), "구성원을 제거했습니다"); }}><UserX size={15} aria-hidden /> 제거</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {owner && !(err?.code === "SERVER_KEY_MISSING") && (
        <form className="mt-4 grid gap-2 @xl:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); void act(async () => { const r = await membersApi.invite(email, newRole); setEmail(""); return r; }, isLive ? "초대 메일을 보냈습니다 (이미 가입된 사용자는 바로 추가)" : "Demo: 초대 대기 구성원으로 추가했습니다"); }}>
          <label className="sr-only" htmlFor="invite-email">초대할 이메일</label>
          <input id="invite-email" type="email" required className="field" placeholder="초대할 이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="sr-only" htmlFor="invite-role">역할</label>
          <select id="invite-role" className="field @xl:!w-auto" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            <option value="STAFF">{ROLE_LABEL.STAFF}</option>
            <option value="ADMIN">{ROLE_LABEL.ADMIN}</option>
          </select>
          <button className="btn-primary" disabled={busy || !email.trim()}><UserPlus size={16} aria-hidden /> 초대</button>
        </form>
      )}
      <p className="mt-2 text-[0.8rem] text-ink-soft">
        {isLive ? "초대받은 사람은 메일 링크로 접속해 비밀번호를 지정합니다. 대표(OWNER) 계정 변경은 Supabase에서 직접 처리합니다." : "Demo: 초대는 이 브라우저에만 기록되며 메일은 발송되지 않습니다."}
      </p>
      {isLive && <PasswordChange />}
    </DataCard>
  );
}

function PasswordChange() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <summary className="cursor-pointer text-[0.9rem] font-semibold">내 비밀번호 변경</summary>
      <form className="mt-2 flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 8) { toast("비밀번호는 8자 이상", "error"); return; }
        setBusy(true);
        const { error } = await getSupabase()!.auth.updateUser({ password: pw });
        setBusy(false);
        if (error) toast(error.message, "error"); else { toast("비밀번호를 변경했습니다"); setPw(""); }
      }}>
        <label className="sr-only" htmlFor="pw-new">새 비밀번호</label>
        <input id="pw-new" type="password" autoComplete="new-password" className="field" placeholder="새 비밀번호 (8자 이상)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn-secondary" disabled={busy}>변경</button>
      </form>
    </details>
  );
}
