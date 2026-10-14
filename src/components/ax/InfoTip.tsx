"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";

/* 짧은 안내 (PASS 21, D-075) — 제목 옆 ⓘ에 마우스를 올리거나(키보드 초점·터치) 누르면 이 파트가 하는 일을 보여 준다.
   설명 문장은 화면에 늘어놓지 않고 여기로 옮긴다. 글은 DOM에 그대로 있어 화면 낭독기는 버튼 설명으로 읽는다.
   열릴 때 화면 가장자리를 재서 안내 상자가 화면 밖으로 나가지 않게 옆으로 민다. 터치: 한 번 누르면 열고 다시 누르면 닫는다 */
export function InfoTip({ text, label }: { text: ReactNode; label?: string; align?: "start" | "end" }) {
  const id = useId();
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const pop = useRef<HTMLSpanElement>(null);
  const touch = useRef(false);
  const show = hover || focus || open;
  useLayoutEffect(() => {
    const el = pop.current;
    if (!show || !el) { setDx(0); return; }
    el.style.translate = "0px 0px";
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let d = 0;
    if (r.right > vw - 12) d = vw - 12 - r.right;
    if (r.left + d < 12) d = 12 - r.left;
    el.style.translate = "";
    setDx(Math.round(d));
  }, [show]);
  const close = (btn?: HTMLButtonElement) => { setOpen(false); setHover(false); setFocus(false); btn?.blur(); };
  return (
    <span className="infotip" data-open={show ? "" : undefined} onMouseEnter={() => !touch.current && setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={label ?? "설명 보기"}
        aria-describedby={id}
        aria-expanded={show}
        onPointerDown={(e) => { touch.current = e.pointerType !== "mouse"; }}
        onClick={(e) => { e.stopPropagation(); if (touch.current && show) close(e.currentTarget); else setOpen((o) => !o); }}
        onKeyDown={(e) => { if (e.key === "Escape") close(); }}
        onFocus={() => !touch.current && setFocus(true)}
        onBlur={() => { setFocus(false); setOpen(false); }}
      >
        <Info size={15} aria-hidden />
      </button>
      <span ref={pop} role="tooltip" id={id} className="infotip-pop" style={dx ? { translate: `${dx}px 0` } : undefined}>{text}</span>
    </span>
  );
}

/* 펼쳐보기 — 평소엔 접어 두는 부가 정보(계산 방식·참고·지난 기록). 접힌 내용도 DOM에 남아 인쇄·검색에 쓰인다 */
export function Fold({ summary, children, defaultOpen = false, className = "", testId }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string; testId?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={`fold ${className}`} data-open={open ? "" : undefined} data-testid={testId}>
      <button type="button" className="fold-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <ChevronDown size={16} className="fold-chev" aria-hidden />
        <span>{summary}</span>
      </button>
      <div id={id} className={`fold-body ${open ? "" : "is-folded"}`}>{children}</div>
    </div>
  );
}
