"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import type { ActionStatus, GrowthAction } from "@/lib/types";

/* ---------- Count-up (첫 진입 1회, reduced-motion 존중) ---------- */
export function useCountUp(target: number, duration = 650): number {
  const [v, setV] = useState(target);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !Number.isFinite(target)) { setV(target); return; }
    done.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    if (reduce || target === 0) { setV(target); return; }
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

/* ---------- KPI Card ---------- */
export function KpiCard({
  label, value, format, icon, iconTone = "var(--primary)", trend, trendLabel, sub, href, tourId,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  icon?: ReactNode;
  iconTone?: string;
  trend?: number | null;
  trendLabel?: string;
  sub?: ReactNode;
  href?: string;
  tourId?: string;
}) {
  const animated = useCountUp(value);
  const up = trend != null && trend >= 0;
  // 컴팩트 stat tile: 라벨·아이콘 한 줄 → 값(비례 숫자, 큰 글씨) → 증감·보조. 카드 전체가 링크면 우상단 화살표로 표시
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg @md:flex [&>svg]:h-[18px] [&>svg]:w-[18px]" style={{ background: `color-mix(in srgb, ${iconTone} 13%, #fff)`, color: iconTone }} aria-hidden>
            {icon}
          </span>
        )}
        <span className="min-w-0 text-[0.86rem] font-semibold leading-snug text-ink-soft @md:text-[0.9rem]">{label}</span>
        {href && <ChevronRight size={16} className="ml-auto shrink-0 text-ink-soft opacity-50 transition-opacity group-hover:opacity-100" aria-hidden />}
      </div>
      <div className="mt-1.5 text-[1.3rem] font-bold leading-tight tracking-tight @md:mt-2 @md:text-[1.7rem] @4xl:text-[1.9rem]">{format(animated)}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.8rem] leading-snug @md:text-[0.85rem]">
        {trend != null && (
          <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: up ? "var(--success)" : "var(--danger)" }}>
            {up ? <ArrowUpRight size={15} aria-hidden /> : <ArrowDownRight size={15} aria-hidden />}
            {up ? "+" : ""}{Math.round(trend * 1000) / 10}%{trendLabel ? ` ${trendLabel}` : ""}
          </span>
        )}
        {sub && <span className="text-ink-soft">{sub}</span>}
      </div>
    </>
  );
  return href ? (
    <Link href={href} data-tour={tourId} className="ax-card ax-card-hover group block min-w-0 p-4 @md:p-5">{body}</Link>
  ) : (
    <div data-tour={tourId} className="ax-card min-w-0 p-4 @md:p-5">{body}</div>
  );
}

/* ---------- Section Card ---------- */
export function DataCard({ title, subtitle, action, children, className = "", tourId, id }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; tourId?: string; id?: string }) {
  return (
    <section id={id} data-tour={tourId} className={`ax-card min-w-0 p-4 @md:p-5 @3xl:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 @md:mb-4 @md:gap-3">
          {title && (subtitle ? (
            <div className="min-w-0">
              <h2 className="text-[1.08rem] font-bold leading-snug @md:text-[1.15rem] @3xl:text-[1.25rem]">{title}</h2>
              <p className="mt-0.5 text-[0.84rem] text-ink-soft">{subtitle}</p>
            </div>
          ) : <h2 className="text-[1.08rem] font-bold leading-snug @md:text-[1.15rem] @3xl:text-[1.25rem]">{title}</h2>)}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SeeAllLink({ href, label = "전체 보기" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-[0.9rem] font-semibold text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink">
      {label}
      <ChevronRight size={16} aria-hidden />
    </Link>
  );
}

/* ---------- Badges ---------- */
const TONES = {
  success: { bg: "var(--success-soft)", fg: "var(--success)" },
  warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  info: { bg: "var(--info-soft)", fg: "var(--info)" },
  neutral: { bg: "var(--surface-muted)", fg: "var(--text-secondary)" },
  primary: { bg: "var(--primary-soft)", fg: "var(--primary)" },
} as const;
export type Tone = keyof typeof TONES;

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return <span className="badge" style={{ background: t.bg, color: t.fg }}>{children}</span>;
}

export function stockStatusTone(s: string): Tone {
  return s === "안정" ? "success" : s === "부족주의" ? "warning" : s === "품절위험" ? "danger" : s === "과잉" ? "info" : "neutral";
}
export function saleStatusTone(s: string): Tone {
  return s === "성장" ? "success" : s === "안정" ? "primary" : s === "부진" ? "warning" : s === "신규" ? "info" : "neutral";
}

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  NEW: "새 추천",
  REVIEWED: "검토 완료",
  IN_PROGRESS: "실행 중",
  DONE: "완료",
  DISMISSED: "보류·제외",
};
export const ACTION_STATUS_TONE: Record<ActionStatus, Tone> = { NEW: "info", REVIEWED: "primary", IN_PROGRESS: "warning", DONE: "success", DISMISSED: "neutral" };
const PRIORITY_TONE = { 우선: "danger", 높음: "warning", 중간: "neutral" } as const;

/* ---------- AI Insight Card ---------- */
export function InsightCard({ title = "AI Growth Insight", method = "RULE", summary, evidence, action, compact = false }: { title?: string; method?: string; summary: string; evidence?: string[]; action?: ReactNode; compact?: boolean }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--primary-soft)", borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center gap-2 text-[0.95rem] font-bold" style={{ color: "var(--primary)" }}>
        <Sparkles size={17} aria-hidden />
        {title}
        <span className="badge" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>{method} 기반</span>
      </div>
      <p className={`mt-2.5 leading-relaxed ${compact ? "text-[0.95rem]" : "text-[1rem]"}`}>{summary}</p>
      {evidence && evidence.length > 0 && (
        <ul className="mt-3 space-y-1 text-[0.9rem] text-ink-soft">
          {evidence.map((e) => (
            <li key={e} className="flex items-start gap-1.5">
              <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Action 컴팩트 행 (대시보드 '오늘 먼저 할 일'·Growth Center 목록) — 카드보다 2~3배 많이 한 화면에 ---------- */
export function ActionRow({ action, onOpen, rank, today = false }: { action: GrowthAction; onOpen: () => void; rank?: number; today?: boolean }) {
  return (
    <button onClick={onOpen} className="row-hover group flex w-full items-start gap-3 rounded-xl border p-3 text-left @md:p-3.5" style={{ borderColor: today ? "color-mix(in srgb, var(--primary) 35%, var(--border))" : "var(--border)" }} data-action-row={action.ruleKey}>
      {rank ? (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.82rem] font-bold text-white" style={{ background: "var(--primary)" }} aria-hidden>{rank}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={PRIORITY_TONE[action.priority]}>{action.priority}</StatusBadge>
          <StatusBadge tone="neutral">{action.category}</StatusBadge>
          <StatusBadge tone={ACTION_STATUS_TONE[action.status]}>{ACTION_STATUS_LABEL[action.status]}</StatusBadge>
          {today && <StatusBadge tone="primary">오늘 먼저</StatusBadge>}
        </span>
        <span className="mt-1.5 block text-[0.98rem] font-bold leading-snug">{action.title}</span>
        <span className="mt-0.5 line-clamp-2 text-[0.88rem] leading-relaxed text-ink-soft">{action.judgement}</span>
        <span className="mt-1 block text-[0.8rem] text-ink-soft">{action.assigneeName ? `담당 ${action.assigneeName}` : "담당 미지정"}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-0.5 self-center text-[0.86rem] font-semibold @md:inline-flex" style={{ color: "var(--primary)" }}>
        처리하기 <ChevronRight size={15} aria-hidden />
      </span>
    </button>
  );
}

/* ---------- Mini bar (reveal) ---------- */
export function MiniBar({ ratio, color = "var(--chart-1)" }: { ratio: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-muted)" }}>
      <div className="bar-reveal h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%`, background: color }} />
    </div>
  );
}
