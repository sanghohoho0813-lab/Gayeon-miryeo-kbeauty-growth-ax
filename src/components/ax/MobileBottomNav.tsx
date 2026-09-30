"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Package, Sparkles, Users } from "lucide-react";
import { isActivePath } from "./nav";

export const OPEN_DRAWER_EVENT = "miryeo-open-drawer";

const ITEMS = [
  { href: "/ax", label: "홈", icon: LayoutDashboard },
  { href: "/ax/products", label: "상품·재고", icon: Package },
  { href: "/ax/customers", label: "고객", icon: Users },
  { href: "/ax/growth", label: "AI Growth", icon: Sparkles },
];

/* 핵심 4개 + 더보기(= 전체 메뉴 Drawer 열기, Navigation Semantics) */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ borderColor: "var(--border)" }} aria-label="하단 메뉴">
      <ul className="flex">
        {ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link href={item.href} aria-current={active ? "page" : undefined} className="pressable flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[0.72rem] font-semibold" style={{ color: active ? "var(--primary)" : "var(--text-secondary)" }}>
                <item.icon size={21} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button onClick={() => window.dispatchEvent(new Event(OPEN_DRAWER_EVENT))} className="pressable flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 text-[0.72rem] font-semibold" style={{ color: "var(--text-secondary)" }}>
            <Menu size={21} aria-hidden />
            더보기
          </button>
        </li>
      </ul>
    </nav>
  );
}
