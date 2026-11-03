"use client";

import { useEffect } from "react";

/* 목록 → 상세 → '뒤로' 왔을 때 보던 위치로 (PASS 39, D-143, R-40).
   브라우저 기본 복원은 상세 화면(목록보다 짧음)이 그려져 있는 동안 일어나서, 위치가 상세 화면 길이에 잘렸다(1,800 → 1,039px).
   상세로 갈 때 목록 주소와 위치를 이 탭에만(sessionStorage) 적어 두고, '뒤로'(popstate)로 같은 주소에 돌아와 목록이 그려지면 그 위치로 되돌린다.
   메뉴·링크 등 다른 길로 목록에 오면 맨 위부터 (적어 둔 것은 지운다). */
const KEY = "miryeo-list-scroll";
const MAX_AGE = 30 * 60_000;
let lastPop = 0;
if (typeof window !== "undefined") window.addEventListener("popstate", () => { lastPop = Date.now(); });

const here = () => `${window.location.pathname}${window.location.search}`;

export function rememberListScroll(): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ url: here(), y: Math.round(window.scrollY), at: Date.now() })); } catch { /* 못 적어도 이동은 됨 */ }
}

/** ready: 목록이 다 그려졌는지 (자료를 불러온 뒤) */
export function useRestoreListScroll(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    let saved: { url: string; y: number; at: number } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); sessionStorage.removeItem(KEY); } catch { return; }
    if (!saved || typeof saved.y !== "number") return;
    const back = Date.now() - lastPop < 3000;
    if (!back || saved.url !== here() || Date.now() - saved.at > MAX_AGE) return;
    const y = saved.y;
    let tries = 0, timer = 0;
    // 이미지·글꼴로 높이가 늦게 차면 한 번에 못 갈 수 있어 몇 번 더 시도
    const go = () => { window.scrollTo(0, y); if (Math.abs(window.scrollY - y) > 2 && tries++ < 10) timer = window.setTimeout(go, 50); };
    const raf = requestAnimationFrame(go);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(timer); };
  }, [ready]);
}
