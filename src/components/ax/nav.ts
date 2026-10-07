import { CalendarRange, Database, Rocket, FileBarChart, ShieldCheck, Globe, LayoutDashboard, Lightbulb, Package, Settings, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/permissions";

/* Business AX IA — 4 Group / 12 Primary (v4.1: 3~4 Group, 8~12, 14 초과 금지). 같은 Group = 같은 Icon Hue */
export interface NavItem { href: string; label: string; icon: LucideIcon; requires?: Permission; tour?: string }
export interface NavGroup { group: string; hue: string; items: NavItem[] }

export const AX_NAV: NavGroup[] = [
  { group: "운영", hue: "var(--grp-ops)", items: [
    { href: "/ax", label: "대시보드", icon: LayoutDashboard },
    { href: "/ax/monthly", label: "월별 실적", icon: CalendarRange, requires: "view_financials" },
    { href: "/ax/products", label: "상품·재고·생산", icon: Package },
  ] },
  { group: "고객·매출", hue: "var(--grp-growth)", items: [
    { href: "/ax/channels", label: "채널·B2B·수출", icon: Globe, requires: "view_commercial" },
    { href: "/ax/customers", label: "고객 인사이트", icon: Users },
  ] },
  { group: "AX·실증", hue: "var(--grp-ax)", items: [
    { href: "/ax/growth", label: "AI Growth Center", icon: Sparkles },
    { href: "/ax/reports", label: "실증·Evidence", icon: FileBarChart },
    { href: "/ax/why", label: "기획의도", icon: Lightbulb },
  ] },
  { group: "관리", hue: "var(--grp-sys)", items: [
    { href: "/ax/start", label: "시작 가이드", icon: Rocket, requires: "edit_master" },
    { href: "/ax/data", label: "데이터 관리", icon: Database },
    { href: "/ax/system", label: "공개 전 점검", icon: ShieldCheck, requires: "edit_master" },
    { href: "/ax/settings", label: "설정", icon: Settings },
  ] },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/ax") return pathname === "/ax";
  return pathname === href || pathname.startsWith(`${href}/`);
}
