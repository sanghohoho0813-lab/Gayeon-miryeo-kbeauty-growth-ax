"use client";

import { useState } from "react";
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
