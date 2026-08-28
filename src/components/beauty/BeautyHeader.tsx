"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Sparkles, User } from "lucide-react";

const NAV = [
  { href: "/beauty", label: "홈" },
  { href: "/beauty/finder", label: "AI 뷰티 파인더" },
  { href: "/beauty/products", label: "제품" },
  { href: "/beauty/passport", label: "뷰티 패스포트" },
];

export function BeautyHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: "var(--b-border)", background: "rgba(250, 248, 244, 0.92)" }}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1240px] items-center gap-5 px-4 md:px-6">
        <Link href="/beauty" className="shrink-0">
          <span className="font-display block text-[1.5rem] font-bold leading-none tracking-wide" style={{ color: "var(--b-navy)" }}>
            MIRYEO
          </span>
          <span className="text-[0.72rem] font-semibold tracking-[0.22em]" style={{ color: "var(--b-gold)" }}>
            AI BEAUTY
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="주요 메뉴">
          {NAV.map((n) => {
            const active = n.href === "/beauty" ? pathname === "/beauty" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className="rounded-full px-4 py-2.5 text-[0.95rem] font-semibold transition-colors"
                style={
                  active
                    ? { background: "var(--b-navy)", color: "#fff" }
                    : { color: "var(--b-text-soft)" }
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
          <Link
            href="/beauty/finder"
            className="mr-1 hidden items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.9rem] font-semibold text-white transition-transform hover:scale-[1.02] sm:flex"
            style={{ background: "var(--b-navy)" }}
          >
            <Sparkles size={16} aria-hidden />
            AI 파인더
          </Link>
          <Link
            href="/beauty/passport"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
            aria-label="찜한 제품"
          >
            <Heart size={20} />
          </Link>
          <Link
            href="/beauty/passport"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-black/5"
            aria-label="뷰티 패스포트"
          >
            <User size={20} />
          </Link>
        </div>
      </div>

      {/* 모바일 nav */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2.5 md:hidden" aria-label="모바일 메뉴">
        {NAV.map((n) => {
          const active = n.href === "/beauty" ? pathname === "/beauty" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 rounded-full px-3.5 py-2 text-[0.88rem] font-semibold"
              style={
                active
                  ? { background: "var(--b-navy)", color: "#fff" }
                  : { color: "var(--b-text-soft)", background: "var(--b-surface-warm)" }
              }
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
