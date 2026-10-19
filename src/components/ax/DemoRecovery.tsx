"use client";

import { useEffect, useState } from "react";
import { Download, LifeBuoy, RotateCcw, X } from "lucide-react";
import { isLive } from "@/lib/config";
import { clearDemoRecovery, demoRecoveryInfo, demoStorageUsage, downloadDemoRaw, restartDemoFromSeed } from "@/lib/data/demo-store";
import { formatDateTimeKR } from "@/lib/date";

/* Demo 자료 안전장치 화면 (PASS 28, D-089) — 손상·저장 공간 부족 때 자료가 조용히 사라지지 않게 */

/** 복구 버튼 — 원본 파일 받기 → (확인 후) 시연 데이터로 다시 시작. 오류 화면·불러오기 실패 화면 공용 */
export function DemoRecoveryActions() {
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  if (isLive) return null;
  return (
    <div className="mt-4 rounded-xl border p-3.5 text-left text-[0.88rem]" style={{ borderColor: "var(--border)", background: "var(--surface)" }} data-testid="demo-recovery">
      <p className="font-semibold">이 브라우저에 저장된 Demo 자료 복구</p>
      <p className="mt-1 text-ink-soft">먼저 원본 파일을 받아 두세요. 저장된 글자 그대로 내려받으므로 자료가 손상됐어도 나중에 다시 살릴 수 있습니다.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-secondary !min-h-[40px] text-[0.86rem]" onClick={() => setSaved(downloadDemoRaw() || saved)} data-testid="demo-raw-download"><Download size={15} aria-hidden /> 원본 파일 받기</button>
        {!confirm ? (
          <button className="btn-ghost !min-h-[40px] text-[0.86rem]" onClick={() => setConfirm(true)}><RotateCcw size={15} aria-hidden /> 시연 데이터로 다시 시작…</button>
        ) : (
          <button className="btn-primary !min-h-[40px] text-[0.86rem]" data-testid="demo-restart" onClick={() => { restartDemoFromSeed(); window.location.reload(); }}>
            {saved ? "다시 시작" : "원본을 받지 않고 다시 시작"}
          </button>
        )}
      </div>
      {confirm && <p className="mt-2 text-[0.82rem]" style={{ color: "var(--danger)" }}>다시 시작하면 지금 이 브라우저에 저장된 Demo 자료가 지워지고 시연 데이터로 바뀝니다.</p>}
    </div>
  );
}

/** 읽지 못한 자료를 보관하고 시연 데이터로 다시 시작했을 때 — AX 모든 화면 위 안내 */
export function DemoRecoveryBanner() {
  const [info, setInfo] = useState<ReturnType<typeof demoRecoveryInfo>>(null);
  useEffect(() => {
    const load = () => setInfo(demoRecoveryInfo());
    load();
    window.addEventListener("miryeo-db-change", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("miryeo-db-change", load); window.removeEventListener("storage", load); };
  }, []);
  if (isLive || !info) return null;
  return (
    <div className="mb-4 rounded-xl px-3.5 py-2.5 text-[0.86rem]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }} role="note" data-testid="demo-recovery-banner">
      <p className="flex items-start gap-1.5 font-semibold"><LifeBuoy size={16} className="mt-0.5 shrink-0" aria-hidden /> 저장된 Demo 자료를 읽지 못해{info.at ? ` ${formatDateTimeKR(info.at)}에` : ""} 시연 데이터로 다시 시작했습니다. 읽지 못한 원본은 이 브라우저에 따로 보관했습니다.</p>
      <div className="mt-2 flex flex-wrap gap-2 print:hidden">
        <button className="btn-secondary !min-h-[36px] text-[0.82rem]" onClick={() => downloadDemoRaw()} data-testid="demo-recovery-download"><Download size={14} aria-hidden /> 원본 파일 받기</button>
        <button className="btn-ghost !min-h-[36px] text-[0.82rem]" onClick={() => clearDemoRecovery()}><X size={14} aria-hidden /> 받았어요 · 보관본 지우기</button>
      </div>
    </div>
  );
}

/** 백업 카드 — 이 브라우저 저장 공간 사용량 (Demo 주소에 실데이터를 넣는 경우) */
export function DemoStorageMeter() {
  const [u, setU] = useState<{ chars: number; ratio: number } | null>(null);
  useEffect(() => {
    const load = () => setU(demoStorageUsage());
    load();
    window.addEventListener("miryeo-db-change", load);
    return () => window.removeEventListener("miryeo-db-change", load);
  }, []);
  if (isLive || !u) return null;
  const pct = Math.min(100, Math.round(u.ratio * 100));
  const warn = u.ratio >= 0.8;
  return (
    <p className="mt-1 text-[0.8rem] tabular" style={{ color: warn ? "var(--danger)" : "var(--text-secondary)" }} data-testid="demo-storage" data-ratio={u.ratio.toFixed(3)}>
      이 브라우저 저장 공간 {pct}% 사용 (약 {(u.chars / 1_000_000).toFixed(1)}백만 / 500만 글자)
      {warn ? " — 거의 찼습니다. 백업 파일을 받고, 실제 자료는 Live 주소를 쓰세요." : ""}
    </p>
  );
}
