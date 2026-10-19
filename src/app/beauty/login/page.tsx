"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarClock, History, LogIn, Sparkles, UserPlus } from "lucide-react";
import { customerApi } from "@/lib/customer-account";
import { useCustomerSession } from "@/components/beauty/CustomerSession";
import { ConcernPicker, ConsentSummary } from "@/components/beauty/AccountParts";
import { customerSignupEnabled, isLive } from "@/lib/config";
import type { SkinConcern } from "@/lib/types";

/* 고객 로그인·회원가입 — 필수 동의(개인정보 수집·이용)와 선택 동의(마케팅)를 분리한다.
   화면 (PASS 25 D-080 → PASS 26 D-082): 앱 가입 화면형 — 파스텔 소개 판(제목·그림·혜택) + 양식 카드(분할 버튼 · 로즈 버튼).
   모바일은 소개(짧게) → 양식 → 혜택 순. */

const BENEFITS = [
  { t: "AI 추천 기록을 계정에 보관", d: "기기를 바꿔도 지난 추천 루틴을 이어서 볼 수 있어요." },
  { t: "구매 기록과 재구매 예상 시점", d: "구매일과 제품 사용기간으로 다시 필요할 때를 알려 드려요." },
  { t: "피부 고민에 맞춘 추천 업데이트", d: "저장한 피부 고민을 바탕으로 다음 추천을 이어 갑니다." },
];

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
      <Notice title="운영자 계정으로 로그인되어 있습니다" body="운영자 계정은 고객으로 가입할 수 없습니다. 고객 화면 확인은 로그아웃 후 다른 계정으로 해 주세요.">
        <button className="b-btn pressable mt-6 w-full" onClick={async () => { await customerApi().signOut(); await refresh(); }}>로그아웃</button>
      </Notice>
    );
  }
  if (sent) return <Notice title="인증 메일을 보냈습니다" body={`${f.email} 메일함의 링크로 접속하면 가입이 완료되고 마이페이지로 이동합니다.`} />;

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

  const benefits = (
    <ul className="space-y-3">
      {BENEFITS.map((b, i) => {
        const Icon = [History, CalendarClock, Sparkles][i];
        return (
          <li key={b.t} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}><Icon size={19} aria-hidden /></span>
            <span><span className="block text-[0.93rem] font-bold">{b.t}</span><span className="b-caption block">{b.d}</span></span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="grid items-stretch gap-6 pt-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @3xl:gap-10 @3xl:pt-10">
      {/* 소개 — 모바일은 짧게(그림·제목), PC는 파스텔 판 + 혜택 */}
      <div className="flex flex-col rounded-[28px] p-6 @3xl:p-10" style={{ background: "linear-gradient(160deg, #FDE6EC 0%, #F8D4DE 55%, #FBE7D6 100%)" }}>
        <span className="b-pill self-start bg-white" style={{ color: "var(--b-rose-ink)" }}>MIRYEO MEMBERSHIP</span>
        <h1 className="b-display mt-3 text-[1.6rem] @3xl:text-[2.3rem]">
          {mode === "signup" ? <>회원이 되면<br />뷰티 기록이 이어져요</> : <>나의 뷰티 기록을<br />계정에 보관하세요</>}
        </h1>
        <p className="mt-2 max-w-[30rem] text-[0.92rem] leading-relaxed" style={{ color: "var(--b-text)" }}>비회원으로도 AI 추천을 받을 수 있어요. 회원이 되면 기기와 상관없이 기록을 보관하고, 다시 필요할 시점을 알려 드려요.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
        <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} decoding="async" className="mx-auto mt-4 hidden h-[200px] w-auto @3xl:block" />
        <div className="mt-6 hidden rounded-[20px] bg-white/80 p-5 @3xl:block" data-testid="login-benefits">{benefits}</div>
      </div>

      {/* 양식 — 로그인 / 회원가입 */}
      <div className="b-card self-start p-6 @md:p-8" data-testid="login-panel">
        <div className="grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ background: "var(--b-soft)" }} role="tablist" aria-label="로그인 또는 회원가입">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(undefined); }}
              className="min-h-[44px] rounded-xl text-[0.95rem] font-bold transition-colors"
              style={mode === m ? { background: "#fff", color: "var(--b-text)", boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "var(--b-text-soft)" }}>
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>
        {mode === "signup" && !customerSignupEnabled ? (
          <p className="b-body mt-6">회원가입을 준비 중입니다. 지금은 비회원으로 AI 추천과 뷰티 패스포트를 이용할 수 있습니다.</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div><label className="field-label" htmlFor="c-email">이메일</label><input id="c-email" type="email" autoComplete="email" required className="field" placeholder="example@email.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label className="field-label" htmlFor="c-password">비밀번호{mode === "signup" ? " (8자 이상)" : ""}</label><input id="c-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required className="field" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            {mode === "signup" && (
              <>
                <div><label className="field-label" htmlFor="c-name">이름 (선택)</label><input id="c-name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                <div><span className="field-label">피부 고민 (선택)</span><ConcernPicker value={f.concerns} onChange={(concerns) => setF({ ...f, concerns })} /></div>
                <ConsentSummary />
                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#C2385F]" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} /> <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다</span></label>
                  <label className="flex items-start gap-2.5 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#C2385F]" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} /> <span>[선택] 재구매 시점·신제품 안내 수신에 동의합니다 (언제든 마이페이지에서 변경)</span></label>
                </div>
              </>
            )}
            {err && <p className="text-[0.88rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}
            <button className="b-btn pressable w-full" disabled={busy || (mode === "signup" && !f.agree)}>
              {mode === "login" ? <><LogIn size={18} aria-hidden /> 로그인</> : <><UserPlus size={18} aria-hidden /> 동의하고 가입하기</>}
            </button>
            {!isLive && <p className="b-caption text-center">Demo: 메일 발송·비밀번호 확인 없이 이 브라우저에만 저장됩니다.</p>}
          </form>
        )}
        <div className="mt-5 border-t pt-3 text-center" style={{ borderColor: "var(--b-line)" }}>
          <Link href="/beauty/finder" className="b-link text-[0.92rem]">비회원으로 추천 먼저 받아보기 <ArrowRight size={15} aria-hidden /></Link>
        </div>
      </div>

      {/* 모바일: 혜택은 양식 아래 */}
      <div className="b-card p-5 @3xl:hidden" data-testid="login-benefits">{benefits}</div>
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[480px] pt-10 text-center @3xl:pt-16">
      <span className="b-pill" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}>MIRYEO MEMBERSHIP</span>
      <h1 className="b-section mt-3 text-[1.6rem]">{title}</h1>
      <p className="b-body mt-3">{body}</p>
      {children}
    </div>
  );
}

export default function CustomerLoginPage() {
  return <Suspense><Inner /></Suspense>;
}
