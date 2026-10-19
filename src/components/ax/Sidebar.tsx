"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, ShieldCheck } from "lucide-react";
import { AX_NAV, isActivePath, type NavGroup } from "./nav";
import { useSession } from "@/components/providers/SessionProvider";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { isLive, DATA_SOURCE_LABEL } from "@/lib/config";

/** dense: PC 사이드바 — 13개 메뉴가 높이 860px 화면에서 스크롤 없이 보이게. 모바일 서랍은 44px 터치 높이 유지 */
export function NavList({ onNavigate, dense = false }: { onNavigate?: () => void; dense?: boolean }) {
  const pathname = usePathname();
  const { role, roleReady } = useSession();
  // 역할 확인 전에는 권한이 필요한 메뉴를 숨긴 채 표시하지 않고, 확인 후 한 번에 그린다
  const groups: NavGroup[] = AX_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.requires || (roleReady && can(role, i.requires))) })).filter((g) => g.items.length);
  return (
    <nav aria-label="주요 메뉴">
      {groups.map((group) => (
        <div key={group.group} className={dense ? "mb-1.5" : "mb-3"}>
          <div className={`px-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${dense ? "pb-1" : "pb-1.5"}`} style={{ color: "var(--sidebar-heading)" }}>{group.group}</div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-[10px] px-3 transition-colors duration-150 hover:bg-[var(--sidebar-hover-bg)] ${active ? "font-semibold" : "font-medium"} ${dense ? "min-h-[38px] text-[0.92rem]" : "min-h-[44px] text-[0.98rem]"}`}
                    style={active ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-text)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.04)" } : { color: "var(--sidebar-text)" }}
                  >
                    {active && <span className="absolute -left-1 top-2.5 bottom-2.5 w-[3px] rounded-full" style={{ background: group.hue }} aria-hidden />}
                    {/* 목차(그룹)별 색 아이콘 칸 (PASS 26b, 사용자 요청) — 옅은 색 바탕 + 같은 색 테두리 + 색 아이콘, 선택된 메뉴는 조금 진하게 */}
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-[8px] border transition-colors ${dense ? "h-7 w-7" : "h-8 w-8"}`}
                      style={{ background: `color-mix(in srgb, ${group.hue} ${active ? 30 : 15}%, transparent)`, borderColor: `color-mix(in srgb, ${group.hue} ${active ? 55 : 32}%, transparent)`, color: `color-mix(in srgb, ${group.hue} 80%, var(--sidebar-icon-tint))` }}
                      aria-hidden
                    >
                      <item.icon size={dense ? 15 : 17} strokeWidth={2} />
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
  const { role, roleReady } = useSession();
  return (
    <aside data-print="hide" className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col lg:flex" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}>
      <Link href="/ax" className="flex items-center gap-3 px-6 pb-3.5 pt-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] font-display text-[1.1rem] font-bold" style={{ background: "var(--wordmark)", color: "var(--sidebar-bg)" }} aria-hidden>M</span>
        <span>
          <span className="block font-display text-[1.2rem] font-bold leading-none tracking-[0.06em]" style={{ color: "var(--sidebar-active-text)" }}>MIRYEO</span>
          <span className="mt-1 block text-[0.66rem] font-bold uppercase leading-none tracking-[0.2em]" style={{ color: "var(--wordmark)" }}>Business AX</span>
        </span>
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 [scrollbar-width:thin]">
        <NavList dense />
      </div>
      <div className="mx-4 mb-4 rounded-[12px] border px-3.5 py-2.5" style={{ background: "var(--sidebar-hover-bg)", borderColor: "rgba(255,255,255,.06)" }}>
        <div className="flex items-center justify-between gap-2 text-[0.82rem] font-semibold" style={{ color: "var(--sidebar-active-text)" }}>
          <span className="flex items-center gap-1.5"><Database size={14} aria-hidden /> {DATA_SOURCE_LABEL}</span>
          <span className="flex items-center gap-1" style={{ color: "var(--sidebar-text)" }}><ShieldCheck size={13} aria-hidden /> {roleReady ? ROLE_LABEL[role] : "확인 중"}</span>
        </div>
        <p className="mt-0.5 text-[0.72rem] leading-snug" style={{ color: "var(--sidebar-heading)" }}>
          {isLive ? "Supabase 실제 데이터" : "시연용 Demo — 실제 실적 아님"} · Powered by 미래AI랩
        </p>
      </div>
    </aside>
  );
}
