"use client";

import { useEffect } from "react";

/* 화면 안에서 정해지는 탭 제목 (PASS 40, D-145) — 예: 제품 상세는 자료를 불러온 뒤에야 제품 이름을 안다.
   주소로 바로 열면 Next.js가 경로 제목(metadata)을 나중에 붙여 덮어쓰므로, 이 화면이 열려 있는 동안 <head>의 제목이 바뀌면 되돌린다.
   화면을 떠나면 감시를 멈춘다 (다음 화면 제목은 Next.js가 정함). */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    const apply = () => { if (document.title !== title) document.title = title; };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [title]);
}
