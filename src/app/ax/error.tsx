"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DemoRecoveryActions } from "@/components/ax/DemoRecovery";

/* Business AX 한 화면에서 오류가 났을 때 (PASS 28, D-088) — 메뉴·머리줄은 그대로 두고 그 화면만 대신 보여 준다 */
export default function AxError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("[MIRYEO] AX page error", error); }, [error]);
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
