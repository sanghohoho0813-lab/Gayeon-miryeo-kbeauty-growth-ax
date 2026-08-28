"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Globe,
  Sparkles,
  FileBarChart,
  Lightbulb,
  Settings,
  Database,
} from "lucide-react";

export const AX_NAV = [
  {
    group: "핵심 운영",
    items: [
      { href: "/ax", label: "대시보드", icon: LayoutDashboard },
      { href: "/ax/products", label: "상품·재고·생산", icon: Package },
      { href: "/ax/channels", label: "채널·B2B·수출", icon: Globe },
      { href: "/ax/growth", label: "AI Growth Center", icon: Sparkles },
    ],
  },
  {
    group: "성과·사업화",
    items: [
      { href: "/ax/reports", label: "실증·리포트", icon: FileBarChart },
      { href: "/ax/why", label: "기획의도", icon: Lightbulb },
    ],
  },
  {
    group: "관리",
    items: [{ href: "/ax/settings", label: "설정", icon: Settings }],
  },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/ax") return pathname === "/ax";
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col lg:flex"
      style={{ background: "var(--sidebar-bg)" }}
    >
      <Link href="/ax" className="px-7 pb-6 pt-8">
        <div className="font-display text-[1.45rem] font-bold leading-tight text-white">
          MIRYEO
        </div>
        <div className="mt-0.5 text-[0.95rem] font-medium tracking-wide" style={{ color: "var(--sidebar-heading)" }}>
          Business AX
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-4 pb-4" aria-label="주요 메뉴">
        {AX_NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <div
              className="px-3 pb-2 text-[0.8rem] font-semibold uppercase tracking-wider"
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
                      aria-current={active ? "page" : undefined}
                      className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-[0.98rem] font-medium transition-colors"
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
      </nav>

      <div className="mx-4 mb-4 rounded-xl p-4" style={{ background: "var(--sidebar-active-bg)" }}>
        <div className="flex items-center gap-2 text-[0.9rem] font-semibold text-white">
          <Database size={16} aria-hidden />
          DEMO DATA
        </div>
        <p className="mt-1 text-[0.82rem] leading-snug" style={{ color: "var(--sidebar-text)" }}>
          현재 화면은 데모 데이터입니다. 실제 자료 연동 시 자동 교체됩니다.
        </p>
      </div>

      <div className="px-7 pb-6 text-[0.78rem] leading-relaxed" style={{ color: "var(--sidebar-heading)" }}>
        가연인터내셔널
        <br />
        MIRYEO Business AX
        <br />
        <span className="opacity-80">Powered by 미래AI랩</span>
      </div>
    </aside>
  );
}
