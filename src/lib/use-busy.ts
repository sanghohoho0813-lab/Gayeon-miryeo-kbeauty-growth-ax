"use client";

import { useCallback, useRef, useState } from "react";

/* 저장 중 다시 누름 막기 (PASS 41, D-150)
   - busy: 버튼을 잠그는 화면 상태
   - once: 앞선 저장이 끝나기 전에 또 눌리면 아무것도 하지 않는다. 화면 상태는 다시 그려야 반영되므로,
     같은 순간의 두 번째 누름(빠른 두 번 누름·느린 연결)은 ref로 막는다. 새 기록을 만드는 저장이 두 번 실행되면 같은 기록이 두 건 생긴다. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const once = useCallback(async (fn: () => Promise<unknown>): Promise<void> => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try { await fn(); } finally { lock.current = false; setBusy(false); }
  }, []);
  return { busy, once };
}
