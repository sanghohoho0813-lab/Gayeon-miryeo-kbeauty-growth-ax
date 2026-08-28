"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import type { GrowthAction } from "@/lib/types";

/* ---------- KPI Card ---------- */
export function KpiCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  /** 증감률 (양수=상승) */
  trend?: number;
  trendLabel?: string;
  sub?: ReactNode;
  tone?: "default" | "danger" | "warning";
}) {
  const trendUp = trend !== undefined && trend >= 0;
  return (
    <div className="ax-card ax-card-hover p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.95rem] font-semibold text-ink-soft">{label}</span>
        {icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background:
                tone === "danger" ? "var(--danger-soft)" : tone === "warning" ? "var(--warning-soft)" : "var(--primary-soft)",
              color:
                tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--primary)",
            }}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-[2.1rem] font-bold leading-none tracking-tight lg:text-[2.3rem]">
        {value}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem]">
        {trend !== undefined && (
          <span
            className="inline-flex items-center gap-0.5 font-semibold"
            style={{ color: trendUp ? "var(--success)" : "var(--danger)" }}
          >
            {trendUp ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
            {trendUp ? "+" : ""}
            {Math.round(trend * 1000) / 10}%{trendLabel ? ` ${trendLabel}` : ""}
          </span>
        )}
        {sub && <span className="text-ink-soft">{sub}</span>}
      </div>
    </div>
  );
}

/* ---------- Section / Data Card ---------- */
export function DataCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ax-card min-w-0 p-5 lg:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[1.18rem] font-bold lg:text-[1.28rem]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SeeAllLink({ href, label = "전체 보기" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-[0.92rem] font-semibold text-ink-soft transition-colors hover:text-primary"
    >
      {label}
      <ChevronRight size={16} aria-hidden />
    </Link>
  );
}

/* ---------- Status Badge ---------- */
const badgeTones: Record<string, { bg: string; fg: string }> = {
  success: { bg: "var(--success-soft)", fg: "var(--success)" },
  warning: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  info: { bg: "var(--info-soft)", fg: "var(--info)" },
  neutral: { bg: "var(--surface-muted)", fg: "var(--text-secondary)" },
  primary: { bg: "var(--primary-soft)", fg: "var(--primary)" },
};

export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof badgeTones;
  children: ReactNode;
}) {
  const t = badgeTones[tone];
  return (
    <span className="badge" style={{ background: t.bg, color: t.fg }}>
      {children}
    </span>
  );
}

export function stockStatusTone(status: string): keyof typeof badgeTones {
  switch (status) {
    case "안정":
      return "success";
    case "부족주의":
      return "warning";
    case "품절위험":
      return "danger";
    case "과잉":
      return "info";
    default:
      return "neutral";
  }
}

export function saleStatusTone(status: string): keyof typeof badgeTones {
  switch (status) {
    case "성장":
      return "success";
    case "안정":
      return "primary";
    case "부진":
      return "warning";
    case "신규":
      return "info";
    default:
      return "neutral";
  }
}

/* ---------- AI Insight Card ---------- */
export function InsightCard({
  title = "AI Growth Insight",
  summary,
  evidence,
  action,
  compact = false,
}: {
  title?: string;
  summary: string;
  evidence?: string[];
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--primary-soft)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 text-[0.95rem] font-bold" style={{ color: "var(--primary)" }}>
        <Sparkles size={17} aria-hidden />
        {title}
        <span className="badge ml-1" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
          Demo 분석
        </span>
      </div>
      <p className={`mt-2.5 leading-relaxed ${compact ? "text-[0.95rem]" : "text-[1.02rem]"}`}>{summary}</p>
      {evidence && evidence.length > 0 && (
        <ul className="mt-3 space-y-1 text-[0.9rem] text-ink-soft">
          {evidence.map((e) => (
            <li key={e} className="flex items-start gap-1.5">
              <span className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- AI Action Card ---------- */
const priorityTone: Record<GrowthAction["priority"], keyof typeof badgeTones> = {
  우선: "danger",
  높음: "warning",
  중간: "info",
};

export function ActionCard({ action, detailed = false }: { action: GrowthAction; detailed?: boolean }) {
  return (
    <div className="ax-card ax-card-hover flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <StatusBadge tone={priorityTone[action.priority]}>{action.priority}</StatusBadge>
        <StatusBadge tone="neutral">{action.category}</StatusBadge>
      </div>
      <h3 className="mt-3 text-[1.08rem] font-bold leading-snug">{action.title}</h3>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">{action.judgement}</p>

      {detailed && (
        <div className="mt-4 space-y-3 text-[0.92rem]">
          <div>
            <div className="font-semibold">근거</div>
            <ul className="mt-1 space-y-0.5 text-ink-soft">
              {action.evidence.map((e) => (
                <li key={e} className="flex items-start gap-1.5">
                  <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">예상 영향</div>
            <ul className="mt-1 space-y-0.5 text-ink-soft">
              {action.impact.map((e) => (
                <li key={e} className="flex items-start gap-1.5">
                  <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">권장 행동</div>
            <p className="mt-1 text-ink-soft">{action.recommendation}</p>
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Link
          href={action.href}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-[var(--radius-button)] border px-4 text-[0.92rem] font-semibold transition-colors hover:bg-primary-soft"
          style={{ borderColor: "var(--border)", color: "var(--primary)" }}
        >
          확인하기
          <ChevronRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
