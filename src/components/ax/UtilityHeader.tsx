"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, MonitorSmartphone, Palette, RefreshCw, Settings, X } from "lucide-react";
import { NavList } from "./Sidebar";
import { ThemePickerPanel } from "./ThemePicker";
import { LiveClock } from "./LiveClock";
import { OPEN_DRAWER_EVENT } from "./MobileBottomNav";
import { DeviceSwitch } from "@/components/device/DeviceView";
import { useSession } from "@/components/providers/SessionProvider";
import { useData } from "@/components/providers/DataProvider";
import { ROLE_LABEL } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { formatDateTimeKR, periodLabel } from "@/lib/date";
import { OPEN_STATUSES } from "@/lib/analytics";
import type { Role } from "@/lib/types";

function useClickOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

export function RoleMenu({ inline = false }: { inline?: boolean }) {
  const { role, setDemoRole, userEmail, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  const roles: Role[] = ["OWNER", "ADMIN", "STAFF"];

  if (inline && !isLive) {
    return (
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Demo 역할">
        {roles.map((r) => (
          <button key={r} role="radio" aria-checked={role === r} onClick={() => setDemoRole(r)} className="pressable min-h-[44px] rounded-xl border-2 text-[0.9rem] font-semibold" style={role === r ? { borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary)" } : { borderColor: "var(--border)" }}>
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="pressable flex min-h-[44px] items-center gap-2 rounded-xl px-1.5 hover:bg-surface-muted" data-tour="role">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-[0.85rem] font-bold text-white" style={{ background: "var(--primary)" }} aria-hidden>
          {ROLE_LABEL[role].slice(0, 1)}
        </span>
        <span className="hidden text-left leading-tight @4xl:block">
          <span className="block text-[0.85rem] font-semibold">{ROLE_LABEL[role]}{isLive ? "" : " (Demo)"}</span>
          <span className="block max-w-[12rem] truncate text-[0.72rem] text-ink-soft">{isLive ? userEmail : "역할 바꿔 보기"}</span>
        </span>
        <ChevronDown size={15} className="text-ink-soft" aria-hidden />
      </button>
      {open && (
        <div className="ax-card modal-in absolute right-0 top-[52px] z-40 w-64 p-3">
          {!isLive ? (
            <>
              <div className="px-1 pb-2 text-[0.8rem] font-semibold text-ink-soft">Demo 역할 (메뉴·민감정보가 실제로 달라집니다)</div>
              {roles.map((r) => (
                <button key={r} onClick={() => { setDemoRole(r); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[0.92rem] hover:bg-surface-muted" aria-pressed={role === r}>
                  {ROLE_LABEL[r]} <span className="text-[0.75rem] text-ink-soft">{r}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="px-2 pb-2 text-[0.85rem]"><div className="font-semibold">{userEmail}</div><div className="text-ink-soft">{ROLE_LABEL[role]} · {role}</div></div>
              <button onClick={async () => { await signOut(); router.replace("/login"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[0.92rem] hover:bg-surface-muted" style={{ color: "var(--danger)" }}>
                <LogOut size={16} aria-hidden /> 로그아웃
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function UtilityHeader() {
  const pathname = usePathname();
  const { model, refresh } = useData();
  const [themeOpen, setThemeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const themeRef = useClickOutside<HTMLDivElement>(themeOpen, () => setThemeOpen(false));
  const openCount = model?.actions.filter((a) => OPEN_STATUSES.includes(a.status)).length ?? 0;

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener(OPEN_DRAWER_EVENT, open);
    return () => window.removeEventListener(OPEN_DRAWER_EVENT, open);
  }, []);

  return (
    <header data-print="hide" className="@container sticky top-0 z-20 border-b bg-surface/95 backdrop-blur" style={{ borderColor: "var(--border)" }}>
      <div className="flex h-[68px] items-center gap-2 px-4 lg:px-8">
        <button className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted lg:hidden" aria-label="메뉴 열기" onClick={() => setDrawerOpen(true)}>
          <Menu size={22} />
        </button>
        <Link href="/ax" className="font-display text-[1.1rem] font-bold lg:hidden">MIRYEO</Link>

        <div className="ml-1 hidden @md:block"><LiveClock compact /></div>
        <div className="ml-3 hidden rounded-xl border px-3 py-1.5 text-[0.8rem] @5xl:block" style={{ borderColor: "var(--border)" }}>
          <span className="text-ink-soft">분석 기준</span> <span className="tabular font-semibold">최근 4주 · {periodLabel()}</span>
        </div>
        <span className="badge ml-1 hidden @2xl:inline-flex" style={isLive ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--warning-soft)", color: "var(--warning)" }}>
          {isLive ? "LIVE" : "DEMO"}
        </span>

        <div className="flex-1" />

        <DeviceSwitch labelClass="hidden @5xl:inline" />

        <button
          className="hidden h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted @2xl:flex"
          aria-label="데이터 새로고침"
          title={model ? `마지막 불러오기 ${formatDateTimeKR(model.snapshot.loadedAt)}` : "새로고침"}
          onClick={async () => { setSpinning(true); await refresh(); setTimeout(() => setSpinning(false), 400); }}
        >
          <RefreshCw size={19} className={spinning ? "animate-spin" : ""} />
        </button>

        <Link href="/ax/growth" className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted" aria-label={`처리할 Action ${openCount}건`}>
          <Bell size={20} />
          {openCount > 0 && (
            <span className="tabular absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.68rem] font-bold text-white" style={{ background: "var(--danger)" }}>
              {openCount}
            </span>
          )}
        </Link>

        <div className="relative hidden @sm:block" ref={themeRef}>
          <button className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted" aria-label="화면 색 고르기" aria-expanded={themeOpen} onClick={() => setThemeOpen((v) => !v)}>
            <Palette size={20} />
          </button>
          {themeOpen && (
            <div className="modal-in absolute right-0 top-[52px] z-40">
              <ThemePickerPanel onClose={() => setThemeOpen(false)} />
            </div>
          )}
        </div>

        <Link href="/beauty" className="btn-primary hidden !min-h-[42px] !px-3.5 text-[0.88rem] @4xl:inline-flex" data-tour="surface">
          <MonitorSmartphone size={16} aria-hidden /> 고객 화면
        </Link>
        <Link href="/ax/settings" className="hidden h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted @2xl:flex" aria-label="설정">
          <Settings size={20} />
        </Link>
        <RoleMenu />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button className="route-fade absolute inset-0 bg-black/45" aria-label="메뉴 닫기" tabIndex={-1} onClick={() => setDrawerOpen(false)} />
          <div className="route-fade absolute inset-y-0 left-0 w-[300px] max-w-[86vw] overflow-y-auto p-5" style={{ background: "var(--sidebar-bg)" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-display text-[1.3rem] font-bold" style={{ color: "var(--sidebar-active-text)" }}>MIRYEO</div>
                <div className="text-[0.9rem] font-semibold" style={{ color: "var(--wordmark)" }}>Business AX</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} aria-label="닫기" className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ color: "var(--sidebar-text)" }}>
                <X size={22} />
              </button>
            </div>
            <div className="mb-4 rounded-xl p-3" style={{ background: "var(--sidebar-active-bg)", color: "var(--sidebar-text)" }}>
              <LiveClock />
            </div>
            <NavList onNavigate={() => setDrawerOpen(false)} />
            <Link href="/beauty" className="mt-2 flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 font-semibold" style={{ background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-text)" }}>
              <MonitorSmartphone size={18} aria-hidden /> 고객 화면 보기
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
