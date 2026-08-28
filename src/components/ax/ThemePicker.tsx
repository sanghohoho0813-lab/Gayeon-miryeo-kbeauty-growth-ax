"use client";

import { X } from "lucide-react";
import { AX_THEMES, useSettings } from "@/components/providers/SettingsProvider";

export function ThemePickerPanel({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme } = useSettings();

  return (
    <div className="ax-card w-[320px] max-w-[calc(100vw-2rem)] p-5" role="dialog" aria-label="화면 색 고르기">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[1.05rem] font-bold">화면 색 고르기</h3>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {AX_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-pressed={theme === t.id}
            className="rounded-xl border-2 p-2.5 text-left transition-colors"
            style={{
              borderColor: theme === t.id ? "var(--primary)" : "var(--border)",
              background: theme === t.id ? "var(--primary-soft)" : "var(--surface)",
            }}
          >
            <span className="flex gap-1" aria-hidden>
              {t.colors.map((c) => (
                <span key={c} className="h-3.5 w-3.5 rounded-full" style={{ background: c }} />
              ))}
            </span>
            <span className="mt-1.5 block text-[0.82rem] font-semibold leading-tight">{t.name}</span>
            <span className="block text-[0.72rem] leading-tight text-ink-soft">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
