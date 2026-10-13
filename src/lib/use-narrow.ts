"use client";

import { useEffect, useState } from "react";

/** 좁은 화면(모바일) — 표 대신 카드처럼 '그리는 것 자체'를 바꿀 때 쓴다.
 *  CSS로 둘 다 그려 놓고 숨기면 같은 데이터·testid·스크린리더 항목이 두 번 생기므로 하나만 렌더한다.
 *  Device View의 Mobile 프레임(iframe 390px) 안에서도 그 폭 기준으로 동작한다. */
export function useNarrow(maxWidth = 767): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [maxWidth]);
  return narrow;
}
