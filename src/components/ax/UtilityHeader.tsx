"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  Lightbulb,
  Menu,
  MonitorSmartphone,
  Palette,
  RefreshCw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { AX_NAV, isActivePath } from "./Sidebar";
import { ThemePickerPanel } from "./ThemePicker";

export function UtilityHeader() {
  const [themeOpen, setThemeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    }
    if (themeOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [themeOpen]);

  return (
    <header
      className="sticky top-0 z-20 border-b bg-surface"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex h-[68px] items-center gap-3 px-4 lg:px-8">
        {/* 모바일: 메뉴 + 로고 */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted lg:hidden"
          aria-label="메뉴 열기"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} />
        </button>
        <Link href="/ax" className="font-display text-[1.15rem] font-bold lg:hidden">
          MIRYEO <span className="text-[0.85rem] font-medium text-ink-soft">Business AX</span>
        </Link>

        {/* 검색 */}
        <div className="relative hidden max-w-[320px] flex-1 items-center md:flex">
          <Search size={18} className="absolute left-3.5 text-ink-soft" aria-hidden />
          <input
            type="search"
            placeholder="메뉴, 데이터, 리포트 검색"
            aria-label="검색"
            className="h-11 w-full rounded-xl border bg-surface-muted pl-10 pr-3 text-[0.95rem] outline-none placeholder:text-ink-soft focus:border-primary"
            style={{ borderColor: "var(--border)" }}
          />
        </div>

        <div className="flex-1" />

        {/* 조회기간 */}
        <div
          className="hidden items-center gap-2 rounded-xl border px-3.5 py-2 text-[0.92rem] font-medium xl:flex"
          style={{ borderColor: "var(--border)" }}
        >
          <Calendar size={17} className="text-ink-soft" aria-hidden />
          2025.05.01 ~ 2025.05.31
        </div>

        {/* 새로고침 */}
        <button
          className="hidden h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted md:flex"
          aria-label="데이터 새로고침"
          title={refreshedAt ? `마지막 새로고침 ${refreshedAt}` : "데이터 새로고침"}
          onClick={() => setRefreshedAt(new Date().toLocaleTimeString("ko-KR"))}
        >
          <RefreshCw size={19} />
        </button>

        {/* 알림 */}
        <button
          className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted"
          aria-label="알림 12건"
        >
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[0.68rem] font-bold text-white">
            12
          </span>
        </button>

        {/* 테마 */}
        <div className="relative" ref={themeRef}>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted"
            aria-label="화면 색 고르기"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((v) => !v)}
          >
            <Palette size={20} />
          </button>
          {themeOpen && (
            <div className="absolute right-0 top-[52px] reveal">
              <ThemePickerPanel onClose={() => setThemeOpen(false)} />
            </div>
          )}
        </div>

        {/* 고객 화면 */}
        <Link
          href="/beauty"
          className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.92rem] font-semibold text-white transition-colors hover:bg-primary-hover sm:flex"
        >
          <MonitorSmartphone size={17} aria-hidden />
          고객 화면
        </Link>

        {/* 기획의도 */}
        <Link
          href="/ax/why"
          className="hidden items-center gap-2 rounded-xl border px-4 py-2.5 text-[0.92rem] font-semibold hover:bg-surface-muted xl:flex"
          style={{ borderColor: "var(--border)" }}
        >
          <Lightbulb size={17} aria-hidden />
          기획의도
        </Link>

        {/* 설정 */}
        <Link
          href="/ax/settings"
          className="hidden h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted md:flex"
          aria-label="설정"
        >
          <Settings size={20} />
        </Link>

        {/* 프로필 */}
        <div className="flex items-center gap-2.5 pl-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-[0.9rem] font-bold text-white"
            style={{ background: "var(--primary)" }}
            aria-hidden
          >
            가
          </div>
          <div className="hidden leading-tight xl:block">
            <div className="text-[0.9rem] font-semibold">김가연</div>
            <div className="text-[0.78rem] text-ink-soft">MIRYEO 팀</div>
          </div>
        </div>
      </div>

      {/* 모바일 Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="메뉴">
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="메뉴 닫기"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] overflow-y-auto p-5 reveal"
            style={{ background: "var(--sidebar-bg)" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-display text-[1.3rem] font-bold text-white">MIRYEO</div>
                <div className="text-[0.85rem]" style={{ color: "var(--sidebar-heading)" }}>
                  Business AX
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="닫기"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80"
              >
                <X size={22} />
              </button>
            </div>
            {AX_NAV.map((group) => (
              <div key={group.group} className="mb-5">
                <div
                  className="pb-2 text-[0.8rem] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--sidebar-heading)" }}
                >
                  {group.group}
                </div>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-[1rem] font-medium"
                          style={
                            active
                              ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-text)" }
                              : { color: "var(--sidebar-text)" }
                          }
                        >
                          <item.icon size={20} aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <Link
              href="/beauty"
              className="mt-2 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white/10 px-4 font-semibold text-white"
            >
              <MonitorSmartphone size={18} aria-hidden />
              고객 화면 보기
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
