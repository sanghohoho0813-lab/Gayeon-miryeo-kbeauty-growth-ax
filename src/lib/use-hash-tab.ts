"use client";

import { useEffect, useState } from "react";

/* 화면 안 탭 ↔ 주소의 #해시 (PASS 21, D-075)
   - 긴 화면을 탭으로 묶으면서 기존 링크(#planning, #members …)가 그대로 동작하게: 카드 id → 그 카드가 있는 탭을 열고 카드로 이동
   - 탭을 바꾸면 주소의 #도 바꿔(스크롤 없이) 새로고침·공유해도 같은 탭이 열린다 */
export function useHashTab<T extends string>(tabs: readonly T[], sectionToTab: Record<string, T>, fallback: T) {
  const [tab, setTabState] = useState<T>(fallback);
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (!h) return;
      const isTab = (tabs as readonly string[]).includes(h);
      const t = isTab ? (h as T) : sectionToTab[h];
      if (!t) return;
      setTabState(t);
      if (!isTab) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(h)?.scrollIntoView({ block: "start" })));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setTab = (t: T) => {
    setTabState(t);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${t}`);
  };
  return [tab, setTab] as const;
}
