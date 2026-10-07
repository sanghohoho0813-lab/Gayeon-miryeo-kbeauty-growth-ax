"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, LogIn, UserPlus } from "lucide-react";
import { customerApi } from "@/lib/customer-account";
import { useCustomerSession } from "@/components/beauty/CustomerSession";
import { ConcernPicker, ConsentSummary } from "@/components/beauty/AccountParts";
import { customerSignupEnabled, isLive } from "@/lib/config";
import type { SkinConcern } from "@/lib/types";

/* 고객 로그인·회원가입 — 필수 동의(개인정보 수집·이용)와 선택 동의(마케팅)를 분리한다 */

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, refresh } = useCustomerSession();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [f, setF] = useState({ email: "", password: "", name: "", concerns: [] as SkinConcern[], agree: false, marketing: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session?.account && !session.operator) router.replace("/beauty/me");
  }, [session, router]);

  if (session?.operator) {
    return (
      <Card>
        <h1 className="text-[1.4rem] font-bold">운영자 계정으로 로그인되어 있습니다</h1>
        <p className="mt-2 text-[0.95rem]" style={{ color: "var(--b-text-soft)" }}>운영자 계정은 고객으로 가입할 수 없습니다. 고객 화면 확인은 로그아웃 후 다른 계정으로 해 주세요.</p>
        <button className="mt-4 min-h-[48px] w-full rounded-xl border font-bold" style={{ borderColor: "var(--b-border)" }} onClick={async () => { await customerApi().signOut(); await refresh(); }}>로그아웃</button>
      </Card>
    );
  }
  if (sent) {
    return (
      <Card>
        <h1 className="text-[1.4rem] font-bold">인증 메일을 보냈습니다</h1>
        <p className="mt-2 text-[0.95rem]" style={{ color: "var(--b-text-soft)" }}>{f.email} 메일함의 링크로 접속하면 가입이 완료되고 마이페이지로 이동합니다.</p>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(undefined);
    try {
      if (mode === "login") {
        await customerApi().signIn(f.email, f.password);
        await refresh();
        router.replace("/beauty/me");
      } else {
        if (!f.agree) throw new Error("개인정보 수집·이용(필수)에 동의해 주세요.");
        const r = await customerApi().signUp({ email: f.email, password: f.password, displayName: f.name, concerns: f.concerns, marketingConsent: f.marketing });
        if (r.needsEmailConfirm) setSent(true);
        else { await refresh(); router.replace("/beauty/me"); }
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ background: "var(--b-surface-warm)" }} role="tablist">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(undefined); }} className="min-h-[44px] rounded-xl text-[0.95rem] font-bold" style={mode === m ? { background: "#fff", color: "var(--b-navy)", boxShadow: "0 1px 3px rgba(0,0,0,.08)" } : { color: "var(--b-text-soft)" }}>
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>
      {mode === "signup" && !customerSignupEnabled ? (
        <p className="mt-5 rounded-xl p-4 text-[0.92rem]" style={{ background: "var(--b-surface-warm)" }}>회원가입을 준비 중입니다. 지금은 비회원으로 AI 추천과 뷰티 패스포트를 이용할 수 있습니다.</p>
      ) : (
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <div><label className="field-label" htmlFor="c-email">이메일</label><input id="c-email" type="email" autoComplete="email" required className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="field-label" htmlFor="c-password">비밀번호{mode === "signup" ? " (8자 이상)" : ""}</label><input id="c-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required className="field" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          {mode === "signup" && (
            <>
              <div><label className="field-label" htmlFor="c-name">이름 (선택)</label><input id="c-name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><span className="field-label">피부 고민 (선택)</span><ConcernPicker value={f.concerns} onChange={(concerns) => setF({ ...f, concerns })} /></div>
              <ConsentSummary />
              <label className="flex items-start gap-2 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} /> <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다</span></label>
              <label className="flex items-start gap-2 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} /> <span>[선택] 재구매 시점·신제품 안내 수신에 동의합니다 (언제든 마이페이지에서 변경)</span></label>
            </>
          )}
          {err && <p className="text-[0.88rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}
          <button className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[1rem] font-bold text-white disabled:opacity-50" style={{ background: "var(--b-navy)" }} disabled={busy || (mode === "signup" && !f.agree)}>
            {mode === "login" ? <><LogIn size={18} aria-hidden /> 로그인</> : <><UserPlus size={18} aria-hidden /> 동의하고 가입하기</>}
          </button>
          {!isLive && <p className="text-center text-[0.8rem]" style={{ color: "var(--b-text-soft)" }}>Demo: 메일 발송·비밀번호 확인 없이 이 브라우저에만 저장됩니다.</p>}
        </form>
      )}
      <ul className="mt-6 space-y-1.5 text-[0.88rem]" style={{ color: "var(--b-text-soft)" }}>
        {["AI 추천 기록을 계정에 보관", "구매 기록과 재구매 예상 시점 확인", "피부 고민에 맞춘 추천 업데이트"].map((t) => <li key={t} className="flex items-center gap-2"><Check size={15} style={{ color: "var(--b-gold-ink)" }} aria-hidden />{t}</li>)}
      </ul>
      <Link href="/beauty/finder" className="mt-4 block text-center text-[0.9rem] font-semibold underline" style={{ color: "var(--b-navy)" }}>비회원으로 추천 먼저 받아보기</Link>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto mt-8 max-w-[480px] rounded-3xl border bg-white p-6 md:p-8" style={{ borderColor: "var(--b-border)" }}>{children}</div>;
}

export default function CustomerLoginPage() {
  return <Suspense><Inner /></Suspense>;
}
