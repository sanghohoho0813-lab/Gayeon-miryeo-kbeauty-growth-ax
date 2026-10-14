"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* 모바일 하단 시트 · PC 가운데 창 — 추천 근거처럼 '눌러서 확인'하는 내용 (D-073)
   Esc·바깥 누르면 닫힘, 열릴 때 시트로 포커스, 닫히면 연 버튼으로 포커스 복귀 */
export function BottomSheet({ open, onClose, title, children, eyebrow }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="beauty-scope fixed inset-0 z-[80] flex items-end justify-center bg-transparent md:items-center" data-testid="bottom-sheet">
      <button type="button" aria-label="닫기" tabIndex={-1} className="absolute inset-0 cursor-default" style={{ background: "rgba(21,23,28,0.42)" }} onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="b-sheet-title" tabIndex={-1}
        className="b-sheet-up relative max-h-[86vh] w-full overflow-y-auto rounded-t-[28px] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 outline-none md:max-w-[560px] md:rounded-[28px] md:pb-7"
        style={{ background: "var(--b-bg)" }}>
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full md:hidden" style={{ background: "var(--b-line-strong)" }} aria-hidden />
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="b-eyebrow">{eyebrow}</p>}
            <h2 id="b-sheet-title" className="b-section mt-1 text-[1.35rem]">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5"><X size={20} aria-hidden /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
