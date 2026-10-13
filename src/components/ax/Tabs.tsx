"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

/* 탭 — ←/→/Home/End로 이동(roving tabindex), panelId를 주면 aria-controls 연결.
   탭이 화면보다 넓으면(모바일) 가려진 쪽 가장자리를 흐리게 하고, 선택된 탭이 보이도록 가로로 스크롤한다. */
export function Tabs<T extends string>({ tabs, value, onChange, className = "mb-6", panelId, label }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (t: T) => void; className?: string; panelId?: string; label?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = box.current;
    const i = tabs.findIndex((t) => t.id === value);
    const btn = refs.current[i];
    if (el && btn && el.scrollWidth > el.clientWidth) {
      const left = btn.offsetLeft - 8, right = btn.offsetLeft + btn.offsetWidth + 8;
      if (left < el.scrollLeft) el.scrollLeft = left;
      else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
    }
    measure();
  }, [value, tabs, measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(tabs[to].id);
    refs.current[to]?.focus();
  };
  const fade = edge.l || edge.r ? `linear-gradient(to right, ${edge.l ? "transparent, #000 28px" : "#000"}, ${edge.r ? "#000 calc(100% - 28px), transparent" : "#000"})` : undefined;
  return (
    <div
      ref={box}
      onScroll={measure}
      className={`flex gap-1 overflow-x-auto rounded-2xl border bg-surface p-1.5 [scrollbar-width:none] ${className}`}
      style={{ borderColor: "var(--border)", maskImage: fade, WebkitMaskImage: fade }}
      role="tablist"
      aria-label={label}
      data-overflow={edge.l || edge.r ? (edge.r ? "right" : "left") : undefined}
    >
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
