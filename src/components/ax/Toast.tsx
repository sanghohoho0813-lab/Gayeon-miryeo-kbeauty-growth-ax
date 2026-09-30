"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastMsg = { id: number; text: string; tone: "success" | "error" };
const EVT = "miryeo-toast";

export function toast(text: string, tone: "success" | "error" = "success") {
  window.dispatchEvent(new CustomEvent<ToastMsg>(EVT, { detail: { id: Date.now(), text, tone } }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<ToastMsg>).detail;
      setItems((v) => [...v, d]);
      setTimeout(() => setItems((v) => v.filter((x) => x.id !== d.id)), 3200);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-8" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="modal-in pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-[0.92rem] font-semibold text-white shadow-lg" style={{ background: t.tone === "success" ? "#171B20" : "var(--danger)" }}>
          {t.tone === "success" ? <CheckCircle2 size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
