"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DemoRecoveryActions } from "@/components/ax/DemoRecovery";
import { isChunkLoadError, reloadOnceForChunk } from "@/lib/chunk-error";
import { BUILD_ID } from "@/lib/build-version";
import { recordError } from "@/lib/error-log";

/* Business AX 한 화면에서 오류가 났을 때 (PASS 28, D-088) — 메뉴·머리줄은 그대로 두고 그 화면만 대신 보여 준다 */
export default function AxError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("[MIRYEO] AX page error", error); recordError("screen", error, BUILD_ID); }, [error]);
  // 화면 코드 묶음을 못 받은 것(새 버전 배포 뒤 옛 탭·잠깐 끊긴 연결)은 한 번 자동 새로고침 (PASS 41, D-148)
  const chunk = isChunkLoadError(error);
  const [reloading, setReloading] = useState(chunk);
  useEffect(() => { if (chunk) setReloading(reloadOnceForChunk()); }, [chunk]);
  if (reloading) return <p className="mt-16 text-center text-[0.95rem] text-ink-soft" role="status" data-testid="chunk-reloading">새 버전을 불러오는 중입니다…</p>;
  if (chunk) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border p-7 text-center" style={{ borderColor: "var(--border)" }} role="alert" data-testid="ax-chunk-error">
        <RefreshCw size={28} className="mx-auto" aria-hidden />
        <h1 className="mt-3 text-[1.2rem] font-bold">화면을 새로 불러와야 합니다</h1>
        <p className="mt-2 text-[0.92rem] text-ink-soft">새 버전이 배포되었거나 연결이 잠깐 끊겼습니다. 새로고침하면 이어서 쓸 수 있습니다. 저장한 자료는 그대로입니다.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden /> 새로고침</button>
          <a className="btn-secondary" href="/ax">대시보드로</a>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border p-7 text-center" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }} role="alert" data-testid="ax-error">
      <AlertTriangle size={28} className="mx-auto" style={{ color: "var(--danger)" }} aria-hidden />
      <h1 className="mt-3 text-[1.2rem] font-bold">이 화면을 표시하지 못했습니다</h1>
      <p className="mt-2 text-[0.92rem] text-ink-soft">다른 메뉴는 그대로 쓸 수 있습니다. 다시 시도해도 같으면 화면 이름과 아래 오류 내용을 알려 주세요.</p>
      {error.message && <p className="mt-2 break-any font-mono text-[0.8rem] text-ink-soft">{error.message}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={() => retry()}><RefreshCw size={16} aria-hidden /> 다시 시도</button>
        <Link className="btn-secondary" href="/ax">대시보드로</Link>
      </div>
      <DemoRecoveryActions />
      {error.digest && <p className="mt-3 text-[0.78rem] text-ink-soft">오류 번호 {error.digest}</p>}
    </div>
  );
}
