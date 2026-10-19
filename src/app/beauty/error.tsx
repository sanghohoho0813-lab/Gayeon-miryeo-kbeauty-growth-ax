"use client";

import { useEffect } from "react";
import Link from "next/link";

/* 고객 화면 오류 (PASS 28, D-088) — 내부 용어·오류 내용 없이 다시 시도·홈만 */
export default function BeautyError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("[MIRYEO] beauty page error", error); }, [error]);
  return (
    <section className="b-card mx-auto mt-10 max-w-md p-7 text-center" role="alert" data-testid="beauty-error">
      <p className="text-[1.3rem] font-extrabold tracking-[-0.02em]">잠시 화면을 불러오지 못했어요</p>
      <p className="mt-2 text-[0.95rem] text-ink-soft">잠시 후 다시 시도해 주세요. 찜한 제품과 상담 결과는 그대로 남아 있어요.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="b-btn" onClick={() => retry()}>다시 시도</button>
        <Link className="b-btn-line" href="/beauty">홈으로</Link>
      </div>
    </section>
  );
}
