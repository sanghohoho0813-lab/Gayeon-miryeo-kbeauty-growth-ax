"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useNewVersion } from "@/lib/use-new-version";

/* 새 버전 알림 (PASS 42, D-151) — 켜 둔 화면에 새 버전이 배포되면 본문 위에 한 줄. 새로고침은 사용자가 누른다(입력 중일 수 있음). */
export function NewVersionBanner() {
  const available = useNewVersion();
  const [later, setLater] = useState(false);
  if (!available || later) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-2.5 text-[0.88rem] font-semibold print:hidden" style={{ background: "var(--info-soft)", color: "var(--text-primary)" }} role="status" data-testid="new-version">
      <p className="flex min-w-0 flex-1 items-start gap-1.5">
        <RefreshCw size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>새 버전이 나왔습니다. 새로고침하면 최신 화면으로 바뀝니다. 저장한 자료는 그대로입니다.</span>
      </p>
      <button className="btn-primary !min-h-[40px] text-[0.84rem]" onClick={() => window.location.reload()} data-testid="new-version-reload"><RefreshCw size={14} aria-hidden /> 새로고침</button>
      <button className="btn-ghost !min-h-[40px] !px-2 text-[0.84rem]" onClick={() => setLater(true)} aria-label="새 버전 알림 닫기 (나중에)" data-testid="new-version-later"><X size={16} aria-hidden /> 나중에</button>
    </div>
  );
}
