"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { isLive, liveConfigured } from "@/lib/config";
import { getSupabase } from "@/lib/data/supabase";

/* Live 모드 로그인 — Supabase Auth (email + password). 계정 생성은 Supabase Dashboard/초대로 (SETUP.md) */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  // 초대 메일 링크로 들어온 경우: 세션이 URL에서 복원되면 첫 비밀번호 설정
  useEffect(() => {
    if (!isLive || !liveConfigured || !window.location.search.includes("invited=1")) return;
    const sb = getSupabase()!;
    sb.auth.getSession().then(({ data }) => { if (data.session) setInvitedEmail(data.session.user.email ?? ""); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { if (session) setInvitedEmail(session.user.email ?? ""); });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isLive) {
    return (
      <Shell>
        <h1 className="text-[1.35rem] font-bold">Demo 모드에서는 로그인이 필요 없습니다</h1>
        <p className="break-any mt-2 text-[0.95rem] leading-relaxed text-[#4A5361]">Demo에서는 화면 우측 상단 역할 메뉴로 대표·관리자·직원 화면을 바꿔 볼 수 있습니다. 실제 로그인은 <code>NEXT_PUBLIC_DATA_MODE=live</code>에서 활성화됩니다.</p>
        <Link href="/ax" className="btn-primary mt-5 w-full">Business AX로 이동</Link>
      </Shell>
    );
  }
  if (!liveConfigured) {
    return (
      <Shell>
        <h1 className="text-[1.35rem] font-bold">Supabase 설정 필요</h1>
        <p className="mt-2 text-[0.95rem] text-[#4A5361]">NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요 (SETUP.md).</p>
      </Shell>
    );
  }

  if (invitedEmail !== null) {
    return (
      <Shell>
        <h1 className="text-[1.35rem] font-bold">초대를 수락했습니다</h1>
        <p className="mt-1 text-[0.92rem] text-[#4A5361]">{invitedEmail} — 다음 로그인부터 사용할 비밀번호를 지정하세요.</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password.length < 8) { setErr("비밀번호는 8자 이상"); return; }
            setBusy(true);
            setErr(undefined);
            const { error } = await getSupabase()!.auth.updateUser({ password });
            setBusy(false);
            if (error) setErr(error.message);
            else router.replace("/ax");
          }}
        >
          <div>
            <label className="field-label" htmlFor="new-password">새 비밀번호 (8자 이상)</label>
            <input id="new-password" type="password" autoComplete="new-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p className="text-[0.88rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>비밀번호 저장하고 시작</button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-[1.35rem] font-bold">MIRYEO Business AX 로그인</h1>
      <p className="mt-1 text-[0.92rem] text-[#4A5361]">가연인터내셔널 구성원 계정으로 로그인하세요.</p>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(undefined);
          const { error } = await getSupabase()!.auth.signInWithPassword({ email, password });
          setBusy(false);
          if (error) setErr("이메일 또는 비밀번호를 확인하세요.");
          else router.replace("/ax");
        }}
      >
        <div>
          <label className="field-label" htmlFor="email">이메일</label>
          <input id="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="password">비밀번호</label>
          <input id="password" type="password" autoComplete="current-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p className="text-[0.88rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          <LogIn size={17} aria-hidden /> {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F7F9] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E3E7EC] bg-white p-7 shadow-sm">
        <div className="font-display text-[1.4rem] font-bold text-[#171B20]">MIRYEO</div>
        <div className="mb-5 text-[0.95rem] font-semibold" style={{ color: "var(--wordmark)" }}>Business AX</div>
        {children}
      </div>
    </main>
  );
}
