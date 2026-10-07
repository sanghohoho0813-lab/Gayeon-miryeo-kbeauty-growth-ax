"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, LogIn, Sparkles, User } from "lucide-react";
import { useCustomerSession } from "./CustomerSession";
import { DeviceSwitch, useDeviceView } from "@/components/device/DeviceView";
import { isLive } from "@/lib/config";

const NAV = [
  { href: "/beauty", label: "홈" },
  { href: "/beauty/finder", label: "AI 뷰티 파인더" },
  { href: "/beauty/products", label: "제품" },
  { href: "/beauty/passport", label: "뷰티 패스포트" },
];

/* Demo/운영자 전용 Control Bar — 일반 고객에게는 노출하지 않는다 (Hybrid Demo Control Layer) */
function DemoControlBar() {
  const { isFrame } = useDeviceView();
  const [operator, setOperator] = useState(false);
  useEffect(() => {
    try { setOperator(!isLive || localStorage.getItem("miryeo-operator") === "1"); } catch { setOperator(!isLive); }
  }, []);
  if (!operator) return null;
  return (
    <div className="border-b text-[0.8rem]" style={{ background: "#171B20", borderColor: "#000", color: "#E5E7EB" }}>
      <div className="mx-auto flex min-h-[44px] w-full max-w-[1240px] items-center gap-3 px-4 md:px-6">
        <span className="font-semibold">{isLive ? "운영자 보기" : "DEMO 시연 모드"}</span>
        <span className="hidden text-[#AEB7C3] sm:inline">고객 행동은 Business AX 고객 인사이트로 즉시 전달됩니다</span>
        <span className="flex-1" />
        {!isFrame && <DeviceSwitch tone="beauty" />}
        <Link href="/ax/customers" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 font-semibold text-white hover:bg-white/10">
          <LayoutDashboard size={15} aria-hidden /> Business AX 보기
        </Link>
      </div>
    </div>
  );
}

function AccountLink() {
  const { session } = useCustomerSession();
  const member = !!session?.account && !session.operator;
  return member ? (
    <Link href="/beauty/me" data-testid="account-link" className="flex h-11 items-center gap-1.5 rounded-full px-2.5 text-[0.86rem] font-semibold hover:bg-black/5" aria-label="마이페이지">
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: "var(--b-navy)" }}><User size={17} aria-hidden /></span>
      <span className="hidden @xl:inline">마이페이지</span>
    </Link>
  ) : (
    <Link href="/beauty/login" data-testid="account-link" className="flex h-11 items-center gap-1.5 rounded-full px-2.5 text-[0.86rem] font-semibold hover:bg-black/5" aria-label="로그인 · 회원가입">
      <LogIn size={19} aria-hidden /><span className="hidden @xl:inline">로그인</span>
    </Link>
  );
}

export function BeautyHeader() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/beauty" ? pathname === "/beauty" : pathname.startsWith(href));
  return (
    <>
      <DemoControlBar />
      <header className="@container sticky top-0 z-30 border-b backdrop-blur" style={{ borderColor: "var(--b-border)", background: "rgba(250, 248, 244, 0.93)" }}>
        <div className="mx-auto flex h-[70px] w-full max-w-[1240px] items-center gap-4 px-4 md:px-6">
          <Link href="/beauty" className="shrink-0">
            <span className="font-display block text-[1.45rem] font-bold leading-none tracking-wide" style={{ color: "var(--b-navy)" }}>MIRYEO</span>
            <span className="text-[0.7rem] font-semibold tracking-[0.22em]" style={{ color: "var(--b-gold-ink)" }}>AI BEAUTY</span>
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-1 @3xl:flex" aria-label="주요 메뉴">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className="rounded-full px-4 py-2.5 text-[0.93rem] font-semibold transition-colors duration-150 hover:bg-black/5" style={active(n.href) ? { background: "var(--b-navy)", color: "#fff" } : { color: "var(--b-text-soft)" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-1 @3xl:flex-none">
            <Link href="/beauty/finder" className="pressable mr-1 hidden items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.88rem] font-bold text-white transition-transform hover:-translate-y-px @md:flex" style={{ background: "var(--b-navy)" }}>
              <Sparkles size={15} aria-hidden /> 내 피부 추천받기
            </Link>
            <Link href="/beauty/passport#saved" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5" aria-label="찜한 제품"><Heart size={20} /></Link>
            <AccountLink />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2.5 @3xl:hidden" aria-label="모바일 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="pressable shrink-0 rounded-full px-3.5 py-2 text-[0.86rem] font-semibold" style={active(n.href) ? { background: "var(--b-navy)", color: "#fff" } : { color: "var(--b-text-soft)", background: "var(--b-surface-warm)" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
