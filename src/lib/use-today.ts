"use client";

import { useEffect, useState } from "react";
import { msToNextDay, todayISO } from "./date";

/* '오늘'을 화면에 쓸 때 (PASS 41, D-146)
   - 미리 만들어 둔 화면(빌드한 날)과 여는 날이 다르면 글자가 어긋나 React가 화면을 처음부터 다시 그린다 → 날짜는 브라우저에서만 그린다.
   - 화면을 켜 둔 채 자정을 넘기면 '오늘'이 어제에 머문다 → 날짜가 바뀌면 알린다. */

/** 한국 날짜가 바뀌면 부른다 — 자정 타이머 + 화면으로 돌아왔을 때(절전·백그라운드에서는 타이머가 늦게 울린다). 반환값으로 해제 */
export function onDayChange(cb: (today: string) => void): () => void {
  let last = todayISO();
  let timer: ReturnType<typeof setTimeout>;
  const check = () => {
    const t = todayISO();
    if (t !== last) { last = t; cb(t); }
  };
  const arm = () => { timer = setTimeout(() => { check(); arm(); }, msToNextDay() + 500); };
  arm();
  const onVisible = () => { if (document.visibilityState === "visible") check(); };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
  };
}

/** 오늘(한국 날짜). 서버·첫 그리기에서는 null — 날짜가 바뀌면 새 값으로 다시 그린다 */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(todayISO());
    return onDayChange(setToday);
  }, []);
  return today;
}
