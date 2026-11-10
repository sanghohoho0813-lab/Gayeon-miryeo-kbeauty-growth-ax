"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isChunkLoadError, reloadOnceForChunk } from "@/lib/chunk-error";

/* 고객 화면 오류 (PASS 28, D-088) — 내부 용어·오류 내용 없이 다시 시도·홈만 */
export default function BeautyError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("[MIRYEO] beauty page error", error); }, [error]);
  // 화면 코드 묶음을 못 받은 것은 한 번 자동 새로고침 (PASS 41, D-148)
  const chunk = isChunkLoadError(error);
  const [reloading, setReloading] = useState(chunk);
  useEffect(() => { if (chunk) setReloading(reloadOnceForChunk()); }, [chunk]);
  if (reloading) return <p className="mt-16 text-center text-[0.95rem] text-ink-soft" role="status" data-testid="chunk-reloading">화면을 새로 불러오는 중이에요…</p>;
  if (chunk) {
    return (
      <section className="b-card mx-auto mt-10 max-w-md p-7 text-center" role="alert" data-testid="beauty-chunk-error">
        <p className="text-[1.3rem] font-extrabold tracking-[-0.02em]">화면을 새로 불러올게요</p>
        <p className="mt-2 text-[0.95rem] text-ink-soft">새 버전이 나왔거나 연결이 잠깐 끊겼어요. 새로고침하면 이어서 볼 수 있어요. 찜한 제품과 상담 결과는 그대로 남아 있어요.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="b-btn" onClick={() => window.location.reload()}>새로고침</button>
        </div>
      </section>
    );
  }
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
