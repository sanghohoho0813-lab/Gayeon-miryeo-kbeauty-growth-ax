"use client";

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border bg-surface p-1.5" style={{ borderColor: "var(--border)" }} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className="pressable min-h-[44px] shrink-0 rounded-xl px-5 text-[0.96rem] font-semibold transition-colors" style={value === t.id ? { background: "var(--primary)", color: "#fff" } : { color: "var(--text-secondary)" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
