"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/45" aria-label="닫기" onClick={onClose} />
      <div className={`ax-card relative max-h-[88vh] w-full overflow-y-auto p-6 reveal ${maxWidth}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h2 className="text-[1.3rem] font-bold leading-snug">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* 우측 Drawer (상품 상세 등) */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/45" aria-label="닫기" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-[560px] overflow-y-auto bg-surface p-6 shadow-2xl reveal lg:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          {title && <h2 className="text-[1.35rem] font-bold leading-snug">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
