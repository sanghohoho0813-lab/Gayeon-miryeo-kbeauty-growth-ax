"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, ShieldCheck } from "lucide-react";
import { AX_NAV, isActivePath, type NavGroup } from "./nav";
import { useSession } from "@/components/providers/SessionProvider";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { isLive, DATA_SOURCE_LABEL } from "@/lib/config";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useSession();
  const groups: NavGroup[] = AX_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.requires || can(role, i.requires)) })).filter((g) => g.items.length);
  return (
    <nav aria-label="주요 메뉴">
      {groups.map((group) => (
        <div key={group.group} className="mb-3">
          <div className="px-3 pb-1.5 text-[0.78rem] font-semibold tracking-wider" style={{ color: "var(--sidebar-heading)" }}>{group.group}</div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className="group relative flex min-h-[44px] items-center gap-3 rounded-xl px-2.5 text-[0.98rem] font-medium transition-colors duration-150 hover:bg-[var(--sidebar-hover-bg)]"
                    style={active ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-text)" } : { color: "var(--sidebar-text)" }}
                  >
                    {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: group.hue }} aria-hidden />}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105"
                      style={{ background: `color-mix(in srgb, ${group.hue} ${active ? 30 : 16}%, transparent)`, color: group.hue }}
                      aria-hidden
                    >
                      <item.icon size={18} />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { role } = useSession();
  return (
    <aside data-print="hide" className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col lg:flex" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}>
      <Link href="/ax" className="px-7 pb-4 pt-6">
        <div className="font-display text-[1.45rem] font-bold leading-tight" style={{ color: "var(--sidebar-active-text)" }}>MIRYEO</div>
        <div className="mt-0.5 text-[1rem] font-semibold tracking-wide" style={{ color: "var(--wordmark)" }}>Business AX</div>
      </Link>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <NavList />
      </div>
      <div className="mx-4 mb-4 rounded-xl px-3.5 py-3" style={{ background: "var(--sidebar-active-bg)" }}>
        <div className="flex items-center justify-between gap-2 text-[0.82rem] font-semibold" style={{ color: "var(--sidebar-active-text)" }}>
          <span className="flex items-center gap-1.5"><Database size={14} aria-hidden /> {DATA_SOURCE_LABEL}</span>
          <span className="flex items-center gap-1" style={{ color: "var(--sidebar-text)" }}><ShieldCheck size={13} aria-hidden /> {ROLE_LABEL[role]}</span>
        </div>
        <p className="mt-1 text-[0.74rem] leading-snug" style={{ color: "var(--sidebar-heading)" }}>
          {isLive ? "Supabase 실제 데이터" : "시연용 Demo — 실제 실적 아님"} · Powered by 미래AI랩
        </p>
      </div>
    </aside>
  );
}
