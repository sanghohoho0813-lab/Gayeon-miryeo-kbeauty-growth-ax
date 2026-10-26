"use client";

import { useEffect, useLayoutEffect, useState } from "react";

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

/** 가장 가까운 @container 의 폭이 rem 기준보다 좁은지 — 컨테이너 쿼리(@4xl=56rem 등)로 '두 칸 배치'가 풀렸는지를
 *  같은 기준으로 판단한다 (PASS 34). 뷰포트가 넓어도 사이드바 때문에 한 줄 배치가 되는 태블릿 폭까지 잡는다.
 *  반환한 ref를 그 배치 요소에 단다. 첫 페인트 전에 판단하므로 넓은 배치가 잠깐 보였다 바뀌지 않는다. */
export function useContainerBelow<T extends HTMLElement>(rem: number): [(el: T | null) => void, boolean] {
  const [el, setEl] = useState<T | null>(null);
  const [below, setBelow] = useState(false);
  useLayoutEffect(() => {
    if (!el) return;
    const box = el.closest<HTMLElement>('[class~="@container"]') ?? el;
    const check = () => {
      const cs = getComputedStyle(box);
      const inner = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setBelow(inner < rem * root);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(box);
    return () => ro.disconnect();
  }, [el, rem]);
  return [setEl, below];
}
