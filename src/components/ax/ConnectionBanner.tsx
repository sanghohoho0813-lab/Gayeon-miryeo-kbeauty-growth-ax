"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { isLive } from "@/lib/config";
import { useData } from "@/components/providers/DataProvider";

/* 연결·불러오기 안내 (PASS 29, D-093)
   - Live 인터넷 끊김: Live는 저장할 때마다 서버로 보내므로 끊긴 동안 저장하면 실패한다. 다시 연결되면 최신 자료를 새로 불러온다.
   - 다시 불러오기 실패(stale): 화면은 마지막으로 불러온 자료 그대로 — 전체 화면을 오류로 바꾸지 않고 여기서 재시도. */
export function ConnectionBanner() {
  const { refresh, stale } = useData();
  const [net, setNet] = useState<"online" | "offline" | "back">("online");
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!isLive) return;
    const off = () => { window.clearTimeout(timer.current); setNet("offline"); };
    const on = () => {
      setNet("back");
      void refresh();
      timer.current = window.setTimeout(() => setNet("online"), 4000);
    };
    if (!navigator.onLine) off();
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); window.clearTimeout(timer.current); };
  }, [refresh]);

  const state = net === "offline" ? "offline" : stale ? "stale" : net === "back" ? "back" : null;
  if (!state) return null;
  const bad = state !== "back";
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-2.5 text-[0.88rem] font-semibold print:hidden"
      style={{ background: bad ? "var(--danger-soft)" : "var(--success-soft)", color: bad ? "var(--danger)" : "var(--success)" }}
      role="status"
      data-testid="connection-banner"
      data-state={state}
    >
      <p className="flex min-w-0 flex-1 items-start gap-1.5">
        {state === "offline" ? <WifiOff size={16} className="mt-0.5 shrink-0" aria-hidden /> : state === "stale" ? <RefreshCw size={16} className="mt-0.5 shrink-0" aria-hidden /> : <Wifi size={16} className="mt-0.5 shrink-0" aria-hidden />}
        <span>
          {state === "offline" && "인터넷 연결이 끊겼습니다. 지금 저장하면 실패하니 연결된 뒤 다시 저장하세요. 화면의 숫자는 마지막으로 불러온 기준입니다."}
          {state === "stale" && "최신 자료를 불러오지 못했습니다. 화면의 숫자는 마지막으로 불러온 기준입니다."}
          {state === "back" && "다시 연결됐습니다. 최신 자료를 불러왔습니다."}
        </span>
      </p>
      {state === "stale" && (
        <button className="btn-secondary !min-h-[36px] text-[0.82rem]" disabled={busy} data-testid="connection-retry" onClick={async () => { setBusy(true); try { await refresh(); } finally { setBusy(false); } }}>
          <RefreshCw size={14} aria-hidden /> {busy ? "불러오는 중…" : "다시 불러오기"}
        </button>
      )}
    </div>
  );
}
