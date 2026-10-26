"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { InfoTip } from "./InfoTip";
import type { ActionStatus, GrowthAction } from "@/lib/types";
import { ACTION_WAIT_ALERT_DAYS } from "@/lib/analytics";

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
  label, value, format, icon, iconTone = "var(--primary)", trend, trendLabel, sub, href, tourId, bare = false, spark, foot,
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
  /** 묶음 패널 안의 숫자 칸 (테두리·그림자 없음, 조금 작게) — 대시보드 핵심 숫자 (PASS 21, D-075) */
  bare?: boolean;
  /** 값 옆 작은 추세선 (주 단위, 오래된 순) — 숫자 하나로는 안 보이는 흐름 (PASS 30, D-095) */
  spark?: { data: number[]; label: string };
  /** 증감·보조 줄 아래 작은 시각 요소 (예: 받을 돈 연령 막대 — PASS 31) */
  foot?: ReactNode;
}) {
  const animated = useCountUp(value);
  const up = trend != null && trend >= 0;
  const sparkTone = trend == null ? "var(--chart-1)" : up ? "var(--success)" : "var(--danger)";
  // 컴팩트 stat tile: 라벨·아이콘 한 줄 → 값(비례 숫자, 큰 글씨) → 증감·보조. 카드 전체가 링크면 우상단 화살표로 표시
  const body = (
    <>
      <div className={`flex items-center ${spark ? "gap-2 @md:gap-2.5" : "gap-2.5"}`}>
        {icon && !bare && (
          <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg @md:flex [&>svg]:h-[18px] [&>svg]:w-[18px]" style={{ background: `color-mix(in srgb, ${iconTone} 13%, #fff)`, color: iconTone }} aria-hidden>
            {icon}
          </span>
        )}
        <span className={`min-w-0 text-[0.86rem] font-semibold leading-snug text-ink-soft @md:text-[0.9rem] ${spark ? "whitespace-nowrap" : ""}`}>{label}</span>
        {/* 좁은 칸: 값이 두 줄로 끊기지 않게 추세선은 라벨 줄 오른쪽 (한 번에 하나만 보여 화면 읽기도 한 번 — PASS 30) */}
        {spark && <span className="ml-auto @md:hidden"><Sparkline data={spark.data} label={spark.label} tone={sparkTone} width={44} height={20} /></span>}
        {href && <ChevronRight size={16} className={`${spark ? "@md:ml-auto" : "ml-auto"} shrink-0 text-ink-soft opacity-50 transition-opacity group-hover:opacity-100`} aria-hidden />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className={`tabular min-w-0 whitespace-nowrap ${bare ? "mt-1 text-[1.2rem] font-extrabold leading-tight tracking-[-0.03em] @md:text-[1.5rem]" : "mt-1.5 text-[1.3rem] font-extrabold leading-tight tracking-[-0.03em] @md:mt-2 @md:text-[1.7rem] @4xl:text-[1.9rem]"}`}>{format(animated)}</div>
        {spark && <span className="hidden @md:block"><Sparkline data={spark.data} label={spark.label} tone={sparkTone} /></span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.8rem] leading-snug @md:text-[0.85rem]">
        {trend != null && (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {/* 증감 숫자만 색 알약, 비교 기준은 옆 글자 (PASS 26, D-083) */}
            <span className="tabular inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 font-bold" style={{ color: up ? "var(--success)" : "var(--danger)", background: up ? "var(--success-soft)" : "var(--danger-soft)" }}>
              {up ? <ArrowUpRight size={15} aria-hidden /> : <ArrowDownRight size={15} aria-hidden />}
              {up ? "+" : ""}{Math.round(trend * 1000) / 10}%
            </span>
            {/* 묶음 패널의 좁은 칸(모바일)은 비교 기준을 패널 제목 줄에 한 번만 — 칸마다 두 줄로 감기지 않게 (PASS 30) */}
            {trendLabel && <span className={`font-semibold ${bare ? "hidden @md:inline" : ""}`} style={{ color: up ? "var(--success)" : "var(--danger)" }}>{trendLabel}</span>}
          </span>
        )}
        {sub && <span className="text-ink-soft">{sub}</span>}
      </div>
      {foot}
    </>
  );
  const cls = bare ? "group block min-w-0 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted" : "ax-card ax-card-hover group block min-w-0 p-4 @md:p-5";
  return href ? (
    <Link href={href} data-tour={tourId} className={cls}>{body}</Link>
  ) : (
    <div data-tour={tourId} className={bare ? "min-w-0 px-3 py-2.5" : "ax-card min-w-0 p-4 @md:p-5"}>{body}</div>
  );
}

/* ---------- Sparkline (PASS 30, D-095) ---------- */
/** 작은 추세선 — 축·숫자 없이 모양만. 마지막 점 강조. 화면 읽기 프로그램에는 처음·마지막 값을 글로 알림 */
export function Sparkline({ data, label, tone = "var(--chart-1)", width = 76, height = 26 }: { data: number[]; label: string; tone?: string; width?: number; height?: number }) {
  // useId 값의 특수문자는 url(#…) 참조에서 깨질 수 있어 영문·숫자만
  const gid = `spark${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (data.length < 2 || data.every((v) => v === 0)) return null;
  const max = Math.max(...data), min = Math.min(0, ...data);
  const span = max - min || 1;
  const pad = 3;
  const pts = data.map((v, i) => [pad + (i * (width - pad * 2)) / (data.length - 1), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mb-0.5 shrink-0 overflow-visible" role="img" aria-label={label} data-testid="sparkline">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.22" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts[0][0]},${height} ${line} ${lx},${height}`} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.6" fill={tone} stroke="var(--surface)" strokeWidth="1.2" />
    </svg>
  );
}

/* ---------- Section Card ---------- */
/* 카드 (D-075): info = 제목 옆 ⓘ 안내(설명 문장 대신), collapsible = 제목을 눌러 접고 펼침(덜 자주 보는 파트는 defaultOpen=false) */
export function DataCard({ title, subtitle, info, action, children, className = "", tourId, id, collapsible = false, defaultOpen = true, testId }: { title?: ReactNode; subtitle?: ReactNode; info?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; tourId?: string; id?: string; collapsible?: boolean; defaultOpen?: boolean; testId?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const h2 = "text-[1.08rem] font-bold leading-snug tracking-[-0.02em] @md:text-[1.15rem] @3xl:text-[1.22rem]";
  const heading = collapsible ? (
    <h2 className={h2}>
      <button type="button" className="inline-flex items-center gap-1.5 text-left" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        <ChevronDown size={18} className="shrink-0 text-ink-soft transition-transform" style={{ transform: open ? "none" : "rotate(-90deg)" }} aria-hidden />
        {title}
      </button>
    </h2>
  ) : <h2 className={h2}>{title}</h2>;
  return (
    <section id={id} data-tour={tourId} data-testid={testId} data-collapsed={collapsible && !open ? "" : undefined} className={`ax-card min-w-0 p-4 @md:p-5 @3xl:p-6 ${className}`}>
      {(title || action) && (
        <div className={`flex flex-wrap items-center justify-between gap-2 @md:gap-3 ${collapsible && !open ? "" : "mb-3 @md:mb-4"}`}>
          {title && (
            <div className="min-w-0">
              <div className="flex items-center gap-1">{heading}{info && <InfoTip text={info} label={`${typeof title === "string" ? title : "이 파트"} 설명`} />}</div>
              {subtitle && <p className="mt-0.5 text-[0.84rem] text-ink-soft">{subtitle}</p>}
            </div>
          )}
          {action}
        </div>
      )}
      <div id={bodyId} className={collapsible && !open ? "is-folded" : undefined}>{children}</div>
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
export function ActionRow({ action, onOpen, rank, today = false, waitDays }: { action: GrowthAction; onOpen: () => void; rank?: number; today?: boolean; waitDays?: number | null }) {
  const waiting = waitDays != null && waitDays >= ACTION_WAIT_ALERT_DAYS;
  return (
    <button onClick={onOpen} className="row-hover group flex w-full items-start gap-3 rounded-xl border p-3 text-left @md:p-3.5" style={{ borderColor: today ? "color-mix(in srgb, var(--primary) 35%, var(--border))" : "var(--border)" }} data-action-row={action.ruleKey}>
      {rank ? (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.82rem] font-bold text-white" style={{ background: "var(--primary)" }} aria-hidden>{rank}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={PRIORITY_TONE[action.priority]}>{action.priority}</StatusBadge>
          {/* 대기 꼬리표가 붙으면 좁은 화면은 카테고리를 숨겨 꼬리표 한 줄 유지 (처리 창에는 항상 보임) */}
          <span className={waiting ? "hidden @md:inline-flex" : "inline-flex"}><StatusBadge tone="neutral">{action.category}</StatusBadge></span>
          <StatusBadge tone={ACTION_STATUS_TONE[action.status]}>{ACTION_STATUS_LABEL[action.status]}</StatusBadge>
          {/* 오래 기다린 Action (PASS 32, D-107) — 새 추천·검토 완료로 3일 이상 머물면 표시 */}
          {waiting && <span data-wait-days={waitDays}><StatusBadge tone="warning">{waitDays}일째 대기</StatusBadge></span>}
          {/* 좁은 화면은 순위 동그라미(1~3)가 '오늘 먼저'를 뜻하므로 꼬리표 생략 — 한 줄에 들어가게 (PASS 30) */}
          {today && <span className={rank ? "hidden @md:inline-flex" : "inline-flex"}><StatusBadge tone="primary">오늘 먼저</StatusBadge></span>}
          {/* 좁은 화면: '담당 미지정'은 숨겨 꼬리표가 한 줄에 들어가게 (담당자가 있으면 표시, 처리 창에서는 항상 보임 — PASS 30) */}
          <span className={`text-[0.78rem] text-ink-soft ${action.assigneeName ? "" : "hidden @md:inline"}`}>{action.assigneeName ? `담당 ${action.assigneeName}` : "담당 미지정"}</span>
        </span>
        <span className="mt-1 block text-[0.98rem] font-bold leading-snug">{action.title}</span>
        <span className="mt-0.5 line-clamp-1 text-[0.86rem] leading-relaxed text-ink-soft" title={action.judgement}>{action.judgement}</span>
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
