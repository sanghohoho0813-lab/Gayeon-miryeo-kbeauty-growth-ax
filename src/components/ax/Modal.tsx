"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* Modal / Drawer — ESC 닫기, 닫힌 뒤 Trigger로 포커스 복원, Backdrop 잔존 0.
   PASS 15: body 바로 아래(portal)에 그린다 — 본문 안에 그리면 헤더(z-20)·하단 메뉴(z-30)보다 아래 층이 되어
   처리 창 제목·닫기 버튼이 헤더에, 모바일 하단 버튼이 하단 메뉴에 가려졌다. 컨테이너 쿼리(@xl 등)는 오버레이가 기준. */
export function Layer({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}
/* 겹쳐 열린 창(상세 위 '조건 바꿔 보기' 등)은 맨 위 창만 Esc로 닫는다 (PASS 21)
   PASS 35 (D-129): 닫기 함수는 ref로만 읽는다 — 부모가 입력값을 들고 있는 창(데이터 관리 채널·거래처 서랍)은 글자를 칠 때마다
   부모가 다시 그려져 onClose가 새 함수가 되고, 그때마다 이 효과가 다시 돌아 초점이 열기 전 버튼으로 갔다가 첫 칸으로 옮겨졌다
   (두 번째 글자부터 입력이 사라짐). 열림·닫힘에만 반응한다. */
const overlayStack: number[] = [];
let overlaySeq = 0;
function useOverlayLifecycle(open: boolean, onClose: () => void) {
  const trigger = useRef<Element | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    trigger.current = document.activeElement;
    const id = ++overlaySeq;
    overlayStack.push(id);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && overlayStack[overlayStack.length - 1] === id) closeRef.current(); };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea")?.focus(), 30);
    return () => {
      const i = overlayStack.indexOf(id);
      if (i >= 0) overlayStack.splice(i, 1);
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      (trigger.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);
  return panel;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; maxWidth?: string }) {
  const panel = useOverlayLifecycle(open, onClose);
  if (!open) return null;
  return (
    <Layer>
    <div className="@container fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title} data-overlay="modal">
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
    </Layer>
  );
}

/** toolbar: 제목 아래 고정 줄(예: 이전·다음). bodyKey가 바뀌면 본문을 새로 그림 — 스크롤이 맨 위로 (PASS 32)
 *  dirty: 저장 안 한 입력이 있으면 Esc·바깥 누름·X로 닫을 때 바로 닫지 않고 '계속 편집 / 버리고 닫기'를 묻는다 (PASS 35, R-37 · D-129).
 *  '취소'·'저장' 버튼은 사용자가 고른 동작이라 그대로 닫는다 */
export function Drawer({ open, onClose, title, children, footer, toolbar, bodyKey, dirty = false }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; toolbar?: ReactNode; bodyKey?: string; dirty?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const stay = useRef<HTMLButtonElement>(null);
  const requestClose = () => {
    if (!dirty) { onClose(); return; }
    if (confirming) { setConfirming(false); return; } // 묻는 중에 다시 Esc → 계속 편집
    setConfirming(true);
  };
  const panel = useOverlayLifecycle(open, requestClose);
  useEffect(() => { if (!open || !dirty) setConfirming(false); }, [open, dirty]);
  useEffect(() => { if (confirming) stay.current?.focus(); }, [confirming]);
  if (!open) return null;
  return (
    <Layer>
    <div className="@container fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title} data-overlay="drawer">
      <button className="route-fade absolute inset-0 bg-black/45" aria-label="닫기" tabIndex={-1} onClick={requestClose} />
      <div ref={panel} className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: "var(--border)" }}>
          {title && <h2 className="text-[1.25rem] font-bold leading-snug">{title}</h2>}
          <button onClick={requestClose} aria-label="닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted">
            <X size={22} />
          </button>
        </div>
        {confirming && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-3" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--warning) 12%, var(--surface))" }} role="alert" data-testid="drawer-dirty">
            <p className="min-w-0 text-[0.9rem] font-semibold">저장하지 않은 변경이 있습니다. 닫으면 입력한 내용이 사라집니다.</p>
            <div className="flex shrink-0 gap-2">
              <button ref={stay} type="button" className="btn-primary !min-h-[40px] !px-3 text-[0.86rem]" onClick={() => setConfirming(false)} data-testid="drawer-stay">계속 편집</button>
              <button type="button" className="btn-secondary !min-h-[40px] !px-3 text-[0.86rem]" style={{ color: "var(--danger)" }} onClick={() => { setConfirming(false); onClose(); }} data-testid="drawer-discard">버리고 닫기</button>
            </div>
          </div>
        )}
        {toolbar && <div className="border-b px-6 py-2" style={{ borderColor: "var(--border)" }}>{toolbar}</div>}
        <div key={bodyKey} className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ borderColor: "var(--border)" }}>{footer}</div>}
      </div>
    </div>
    </Layer>
  );
}
