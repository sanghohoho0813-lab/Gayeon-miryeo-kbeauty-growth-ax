"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/* Modal / Drawer — ESC 닫기, 닫힌 뒤 Trigger로 포커스 복원, Backdrop 잔존 0 */
function useOverlayLifecycle(open: boolean, onClose: () => void) {
  const trigger = useRef<Element | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    trigger.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      (trigger.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);
  return panel;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; maxWidth?: string }) {
  const panel = useOverlayLifecycle(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="route-fade absolute inset-0 bg-black/45" aria-label="닫기" tabIndex={-1} onClick={onClose} />
      <div ref={panel} className={`ax-card modal-in relative max-h-[88vh] w-full overflow-y-auto p-6 ${maxWidth}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h2 className="text-[1.25rem] font-bold leading-snug">{title}</h2>}
          <button onClick={onClose} aria-label="닫기" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  const panel = useOverlayLifecycle(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button className="route-fade absolute inset-0 bg-black/45" aria-label="닫기" tabIndex={-1} onClick={onClose} />
      <div ref={panel} className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: "var(--border)" }}>
          {title && <h2 className="text-[1.25rem] font-bold leading-snug">{title}</h2>}
          <button onClick={onClose} aria-label="닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t px-6 py-4" style={{ borderColor: "var(--border)" }}>{footer}</div>}
      </div>
    </div>
  );
}
