"use client";

import { Check, X } from "lucide-react";
import { AX_THEMES, useSettings } from "@/components/providers/SettingsProvider";

/* Canonical 7 Theme Picker — 각 Theme 6색 Swatch */
export function ThemePickerPanel({ onClose, bare = false }: { onClose?: () => void; bare?: boolean }) {
  const { theme, setTheme } = useSettings();
  return (
    <div className={bare ? "" : "ax-card w-[340px] max-w-[calc(100vw-2rem)] p-5"} role="radiogroup" aria-label="화면 색 고르기">
      {!bare && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[1.02rem] font-bold">화면 색 고르기 (7)</h3>
          {onClose && (
            <button onClick={onClose} aria-label="닫기" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted">
              <X size={18} />
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {AX_THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(t.id)}
              className="pressable flex items-center gap-3 rounded-xl border-2 p-2.5 text-left transition-colors hover:bg-surface-muted"
              style={{ borderColor: active ? "var(--primary)" : "var(--border)" }}
            >
              <span className="flex overflow-hidden rounded-md border" style={{ borderColor: "var(--border)" }} aria-hidden>
                {t.colors.map((c) => <span key={c} className="h-6 w-3.5" style={{ background: c }} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.72rem] font-semibold text-ink-soft">{t.no}</span>
                <span className="block text-[0.88rem] font-semibold leading-tight">{t.name}</span>
              </span>
              {active && <Check size={16} style={{ color: "var(--primary)" }} aria-label="선택됨" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
