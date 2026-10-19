"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/* 짧은 알림 (PASS 26b, D-082) — 찜하기처럼 화면이 크게 바뀌지 않는 동작에 "담았어요"를 2.6초 보여 준다.
   어디서든 snack({ text, href, cta })로 띄우고, 화면 낭독기에는 aria-live로 읽힌다 */
const EVENT = "miryeo-snack";
export interface Snack { text: string; href?: string; cta?: string }
export function snack(s: Snack) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<Snack>(EVENT, { detail: s })); }

export function BeautySnackbar() {
  const [cur, setCur] = useState<(Snack & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Snack>).detail;
      setCur({ ...d, id: Date.now() });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCur(null), 2600);
    };
    window.addEventListener(EVENT, on);
    return () => { window.removeEventListener(EVENT, on); clearTimeout(timer.current); };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-8" aria-live="polite">
      {cur && (
        <div key={cur.id} className="b-step-in pointer-events-auto flex min-h-[48px] w-full max-w-[420px] items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,.45)]" style={{ background: "#1C1D24" }} data-testid="beauty-snack">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--b-rose)" }}><Check size={14} strokeWidth={3} aria-hidden /></span>
          <span className="min-w-0 flex-1">{cur.text}</span>
          {cur.href && <Link href={cur.href} className="shrink-0 rounded-lg px-2 py-1 text-[0.86rem] font-extrabold" style={{ color: "#F7B6C8" }}>{cur.cta ?? "보기"}</Link>}
        </div>
      )}
    </div>
  );
}
