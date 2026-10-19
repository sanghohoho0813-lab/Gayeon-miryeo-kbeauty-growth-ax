"use client";

import { useEffect } from "react";

/** 저장 중 창 닫기·새로고침 경고 (PASS 29) — 파일 가져오기처럼 여러 건을 차례로 저장하는 동안
 *  탭을 닫으면 일부만 저장된다. 브라우저 기본 확인창을 띄운다 (문구는 브라우저가 정함). */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [active]);
}
