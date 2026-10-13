"use client";

import { useRef, type KeyboardEvent } from "react";

/* 탭 — ←/→/Home/End로 이동(roving tabindex), panelId를 주면 aria-controls 연결 */
export function Tabs<T extends string>({ tabs, value, onChange, className = "mb-6", panelId, label }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (t: T) => void; className?: string; panelId?: string; label?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(tabs[to].id);
    refs.current[to]?.focus();
  };
  return (
    <div className={`flex gap-1 overflow-x-auto rounded-2xl border bg-surface p-1.5 ${className}`} style={{ borderColor: "var(--border)" }} role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          id={panelId ? `${panelId}-tab-${t.id}` : undefined}
          aria-selected={value === t.id}
          aria-controls={panelId}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
          className="pressable min-h-[44px] shrink-0 rounded-xl px-4 text-[0.94rem] font-semibold transition-colors @md:px-5 @md:text-[0.96rem]"
          style={value === t.id ? { background: "var(--primary)", color: "#fff" } : { color: "var(--text-secondary)" }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
