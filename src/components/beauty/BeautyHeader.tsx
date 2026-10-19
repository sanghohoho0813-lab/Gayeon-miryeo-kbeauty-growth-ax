"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, Heart, Home, LayoutDashboard, LogIn, Search, ShoppingBag, Sparkles, User } from "lucide-react";
import { useCustomerSession } from "./CustomerSession";
import { DeviceSwitch, useDeviceView } from "@/components/device/DeviceView";
import { isLive } from "@/lib/config";

const NAV = [
  { href: "/beauty", label: "홈", short: "홈", icon: Home },
  { href: "/beauty/finder", label: "AI 뷰티 파인더", short: "AI 파인더", icon: Sparkles },
  { href: "/beauty/products", label: "제품", short: "제품", icon: ShoppingBag },
  { href: "/beauty/passport", label: "뷰티 패스포트", short: "패스포트", icon: BookHeart },
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
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: "var(--b-rose-ink)" }}><User size={17} aria-hidden /></span>
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
  // 제품 상세는 앱의 '다음 화면'처럼 하단 탭 대신 찜·구매 채널 고정 버튼을 쓴다
  const detail = /^\/beauty\/products\/[^/]+/.test(pathname ?? "");
  return (
    <>
      <DemoControlBar />
      <header className="@container sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ borderColor: "var(--b-border)" }}>
        <div className="mx-auto flex h-[58px] w-full max-w-[1240px] items-center gap-4 px-4 md:h-[72px] md:px-6">
          <Link href="/beauty" className="shrink-0">
            <span className="b-serif block text-[1.32rem] font-bold leading-none tracking-[0.08em]" style={{ color: "var(--b-text)" }}>MIRYEO</span>
            <span className="text-[0.58rem] font-extrabold tracking-[0.28em]" style={{ color: "var(--b-rose-ink)" }}>AI BEAUTY</span>
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-1 @3xl:flex" aria-label="주요 메뉴">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className="flex min-h-[40px] items-center rounded-full px-4 text-[0.92rem] font-bold transition-colors duration-150"
                style={active(n.href) ? { background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" } : { color: "var(--b-text-soft)" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-0.5 @3xl:flex-none">
            <Link href="/beauty/finder" className="pressable mr-1.5 hidden items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.86rem] font-bold text-white @3xl:flex" style={{ background: "var(--b-rose-ink)" }}>
              <Sparkles size={15} aria-hidden /> 내 피부 추천받기
            </Link>
            <Link href="/beauty/products?focus=search" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5" aria-label="제품 찾기"><Search size={20} /></Link>
            <Link href="/beauty/passport#saved" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5" aria-label="찜한 제품"><Heart size={20} /></Link>
            <AccountLink />
          </div>
        </div>
      </header>
      {/* 모바일: 앱처럼 하단 탭 (홈 · AI 파인더 · 제품 · 패스포트) — 현재 화면 표시. 제품 상세에서는 숨김 */}
      <nav className={`fixed inset-x-0 bottom-0 z-30 border-t bg-white/97 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${detail ? "hidden" : ""}`}
        style={{ borderColor: "var(--b-border)", boxShadow: "0 -6px 20px -14px rgba(0,0,0,.18)" }} aria-label="모바일 메뉴" data-testid="beauty-mobile-nav">
        <div className="mx-auto grid max-w-[560px] grid-cols-4">
          {NAV.map((n) => {
            const on = active(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className="pressable flex min-h-[62px] flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[0.72rem] font-bold"
                style={{ color: on ? "var(--b-rose-ink)" : "var(--b-text-soft)" }}>
                <span className="flex h-7 w-12 items-center justify-center rounded-full transition-colors" style={on ? { background: "var(--b-rose-soft)" } : undefined}><n.icon size={21} strokeWidth={on ? 2.3 : 1.8} aria-hidden /></span>
                <span>{n.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
