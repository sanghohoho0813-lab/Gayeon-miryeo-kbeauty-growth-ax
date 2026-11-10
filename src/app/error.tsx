"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isChunkLoadError, reloadOnceForChunk } from "@/lib/chunk-error";
import { BUILD_ID } from "@/lib/build-version";
import { recordError } from "@/lib/error-log";

// 복구 버튼은 Demo 저장소 코드를 쓰므로, 이 파일(모든 화면 묶음에 들어감)에는 싣지 않고 AX 오류 때만 불러온다
// — 공개 심사 페이지 번들에 데모 DB 코드가 실리지 않게 (D-068)
const DemoRecoveryActions = dynamic(() => import("@/components/ax/DemoRecovery").then((m) => m.DemoRecoveryActions), { ssr: false });

/* 화면 묶음(Business AX·고객 앱·심사 페이지)의 레이아웃·자료 연결에서 오류가 났을 때 (PASS 28, D-088).
   고객 화면에는 내부 용어·오류 내용을 보이지 않고, Business AX(Demo)에서는 자료 복구 버튼을 보인다. */
export default function RootSegmentError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const path = usePathname() ?? "/";
  const ax = path.startsWith("/ax");
  useEffect(() => { console.error("[MIRYEO] segment error", error); if (ax) recordError("screen", error, BUILD_ID); }, [error, ax]);
  // 화면 코드 묶음을 못 받은 것은 한 번 자동 새로고침 (PASS 41, D-148)
  const chunk = isChunkLoadError(error);
  const [reloading, setReloading] = useState(chunk);
  useEffect(() => { if (chunk) setReloading(reloadOnceForChunk()); }, [chunk]);
  if (reloading) return <main className="px-5 pt-[20vh] text-center text-[0.95rem] text-ink-soft" role="status" data-testid="chunk-reloading">새 버전을 불러오는 중입니다…</main>;
  if (chunk) {
    return (
      <main className="mx-auto max-w-lg px-5 pb-16 pt-[12vh] text-center" role="alert" data-testid="app-chunk-error">
        <RefreshCw size={30} className="mx-auto" aria-hidden />
        <h1 className="mt-3 text-[1.45rem] font-extrabold tracking-[-0.02em]">화면을 새로 불러와야 합니다</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">새 버전이 나왔거나 연결이 잠깐 끊겼습니다. 새로고침하면 이어서 쓸 수 있습니다.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden /> 새로고침</button>
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-lg px-5 pb-16 pt-[12vh] text-center" role="alert" data-testid="app-error">
      <AlertTriangle size={30} className="mx-auto" style={{ color: "var(--danger)" }} aria-hidden />
      <h1 className="mt-3 text-[1.45rem] font-extrabold tracking-[-0.02em]">{ax ? "Business AX 화면을 표시하지 못했습니다" : "잠시 화면을 불러오지 못했어요"}</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{ax ? "자료를 화면으로 만드는 중 문제가 생겼습니다. 다시 시도해도 같으면 아래에서 원본 자료를 받아 두세요." : "잠시 후 다시 시도해 주세요."}</p>
      {ax && error.message && <p className="mt-2 break-any font-mono text-[0.8rem] text-ink-soft">{error.message}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={() => retry()}><RefreshCw size={16} aria-hidden /> 다시 시도</button>
        <a className="btn-secondary" href={ax ? "/ax" : path.startsWith("/beauty") ? "/beauty" : "/"}>{ax ? "대시보드로" : "처음 화면으로"}</a>
      </div>
      {ax && <DemoRecoveryActions />}
      {error.digest && <p className="mt-4 text-[0.78rem] text-ink-soft">오류 번호 {error.digest}</p>}
    </main>
  );
}
