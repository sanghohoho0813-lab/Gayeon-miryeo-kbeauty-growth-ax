"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertOctagon, AlertTriangle, Bell, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { buildNotifications, type NoticeTone } from "@/lib/notifications";
import { isLive } from "@/lib/config";

const TONE: Record<NoticeTone, { fg: string; bg: string; icon: typeof Info; label: string }> = {
  danger: { fg: "var(--danger)", bg: "var(--danger-soft)", icon: AlertOctagon, label: "위험" },
  warning: { fg: "var(--warning)", bg: "var(--warning-soft)", icon: AlertTriangle, label: "주의" },
  success: { fg: "var(--success)", bg: "var(--success-soft)", icon: CheckCircle2, label: "결과" },
  info: { fg: "var(--primary)", bg: "var(--primary-soft)", icon: Info, label: "안내" },
};

/* 알림 센터 — 종 아이콘: 오늘 확인할 것 (생산 착수·연체·데이터 오류·입력 지연·새 Action·사후 성과·확정 대기) */
export function NotificationCenter() {
  const { model } = useData();
  const { role, roleReady } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = model && roleReady ? buildNotifications(model, role, { allowPractice: !isLive }) : [];
  const urgent = list.filter((n) => n.tone === "danger").length;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => wrap.current?.querySelector<HTMLElement>("[data-notice-first]")?.focus(), 20);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open]);

  return (
    <div className="relative" ref={wrap}>
      <button
        ref={btn}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-muted"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="notice-open"
      >
        <Bell size={20} aria-hidden />
        {/* 이름은 숨김 글자 '알림 3건 (위험 2)', 배지 숫자는 보이기만 — aria-label로 덮으면 보이는 '3'과 이름이 어긋남 (WCAG 2.5.3) */}
        <span className="sr-only">알림 {list.length}건{urgent ? ` (위험 ${urgent})` : ""}</span>
        {list.length > 0 && (
          <span className="tabular absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[0.68rem] font-bold text-white" style={{ background: urgent ? "var(--danger)" : "var(--primary)" }} aria-hidden data-testid="notice-badge">
            {list.length}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="알림" className="ax-card modal-in fixed left-3 right-3 top-[64px] z-40 !p-0 sm:absolute sm:left-auto sm:right-0 sm:top-[52px] sm:w-[25rem]" data-testid="notice-panel">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <h2 className="whitespace-nowrap text-[1rem] font-bold">오늘 확인할 것</h2>
            <span className="text-[0.78rem] text-ink-soft">데이터에서 자동 계산 · 해결하면 사라짐</span>
          </div>
          {list.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-[0.92rem] text-ink-soft"><CheckCircle2 size={18} style={{ color: "var(--success)" }} aria-hidden /> 지금 확인할 알림이 없습니다.</p>
          ) : (
            <ul className="max-h-[min(70vh,28rem)] overflow-y-auto p-2" data-testid="notice-list">
              {list.map((n, i) => {
                const t = TONE[n.tone];
                return (
                  <li key={n.id}>
                    <Link href={n.href} onClick={() => setOpen(false)} className="row-hover flex items-start gap-3 rounded-xl px-3 py-2.5" data-notice={n.id} data-tone={n.tone} {...(i === 0 ? { "data-notice-first": "" } : {})}>
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: t.bg, color: t.fg }}><t.icon size={16} aria-hidden /><span className="sr-only">{t.label}</span></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.93rem] font-semibold leading-snug">{n.title}</span>
                        <span className="mt-0.5 line-clamp-2 text-[0.82rem] leading-snug text-ink-soft">{n.detail}</span>
                      </span>
                      <ChevronRight size={16} className="mt-1 shrink-0 text-ink-soft" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
