"use client";

import { useEffect, useState } from "react";
import { BUILD_ID, isNewerBuild } from "./build-version";

/* 새 버전 알림 (PASS 42, D-151)
   push할 때마다 자동으로 배포되는데, 켜 둔 화면은 새로고침하기 전까지 옛 코드로 돈다 — 고친 결함이 며칠씩 남는다.
   화면으로 돌아올 때(그리고 켜 둔 동안 5분마다) 서버 버전을 물어, 내 버전과 다르면 알린다. 자동으로 새로고침하지는 않는다(입력 중일 수 있음). */

const CHECK_EVERY_MS = 5 * 60_000;

export function useNewVersion(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!BUILD_ID || available) return;
    let last = Date.now(); // 방금 받은 화면이므로 처음 5분은 묻지 않는다
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible" || Date.now() - last < CHECK_EVERY_MS) return;
      last = Date.now();
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        if (alive && isNewerBuild(BUILD_ID, await r.json())) setAvailable(true);
      } catch { /* 연결이 없으면 다음에 */ }
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, [available]);
  return available;
}
