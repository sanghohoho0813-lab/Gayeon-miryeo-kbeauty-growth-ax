"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Globe, Sparkles, FileBarChart } from "lucide-react";
import { isActivePath } from "./Sidebar";

const ITEMS = [
  { href: "/ax", label: "홈", icon: LayoutDashboard },
  { href: "/ax/products", label: "상품·재고", icon: Package },
  { href: "/ax/channels", label: "채널", icon: Globe },
  { href: "/ax/growth", label: "AI Growth", icon: Sparkles },
  { href: "/ax/reports", label: "리포트", icon: FileBarChart },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ borderColor: "var(--border)" }}
      aria-label="하단 메뉴"
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[0.72rem] font-medium"
                style={{ color: active ? "var(--primary)" : "var(--text-secondary)" }}
              >
                <item.icon size={21} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
