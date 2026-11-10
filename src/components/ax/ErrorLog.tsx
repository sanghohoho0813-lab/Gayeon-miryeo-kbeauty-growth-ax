"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { DataCard } from "@/components/ax/Cards";
import { toast } from "@/components/ax/Toast";
import { BUILD_ID } from "@/lib/build-version";
import { copyText } from "@/lib/clipboard";
import { isLive } from "@/lib/config";
import { formatDateTimeKR } from "@/lib/date";
import { clearErrorLog, ERROR_KIND_LABEL, ERROR_LOG_EVENT, ERROR_LOG_KEY, errorLogText, installErrorLog, readErrorLog, type ErrorEntry } from "@/lib/error-log";

/** Business AX 화면에서 새어 나온 오류를 이 브라우저에 적어 둔다 (PASS 42, D-152) — 레이아웃에 한 번 */
export function ErrorLogInstaller() {
  useEffect(() => installErrorLog(BUILD_ID), []);
  return null;
}

/** 공개 전 점검 화면의 '이 브라우저의 오류 기록' — 보고 · 복사 · 지우기 */
export function ErrorLogCard() {
  const [list, setList] = useState<ErrorEntry[] | null>(null);
  useEffect(() => {
    const load = () => setList(readErrorLog());
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === ERROR_LOG_KEY) load(); };
    window.addEventListener(ERROR_LOG_EVENT, load);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(ERROR_LOG_EVENT, load); window.removeEventListener("storage", onStorage); };
  }, []);
  if (!list) return null;
  const total = list.reduce((a, x) => a + x.count, 0);
  return (
    <DataCard className="mt-6" title={<>이 브라우저의 오류 기록 <span className="tabular text-[0.86rem] font-normal text-ink-soft">{list.length ? `${list.length}종 · ${total}번` : "없음"}</span></>}>
      <div data-testid="error-log" data-count={list.length}>
        <p className="text-[0.86rem] text-ink-soft">화면에서 난 오류의 글과 화면 주소를 이 브라우저에만 최근 30종 적어 둡니다. 서버로 보내지 않고, 입력한 값이나 자료는 적지 않습니다. 문의할 때 &lsquo;복사&rsquo;해서 보내 주세요.</p>
        {list.length === 0 ? (
          <p className="mt-3 rounded-xl bg-surface-muted px-3.5 py-3 text-[0.9rem]" data-testid="error-log-empty">기록된 오류가 없습니다.</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2" data-testid="error-log-list">
              {list.map((x) => (
                <li key={`${x.kind}|${x.path}|${x.message}`} className="rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
                  <div className="tabular flex flex-wrap gap-x-2 text-[0.8rem] text-ink-soft">
                    <span>{formatDateTimeKR(x.at)}</span><span>{ERROR_KIND_LABEL[x.kind]}</span><span className="break-any">{x.path}</span><span data-testid="error-log-times">{x.count}번</span>
                    {x.build && x.build !== BUILD_ID && <span>이전 버전 {x.build}</span>}
                  </div>
                  <p className="break-any mt-1 font-mono text-[0.8rem]">{x.message}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-secondary !min-h-[40px] text-[0.86rem]"
                data-testid="error-log-copy"
                onClick={async () => {
                  const ok = await copyText(errorLogText(list, { build: BUILD_ID, mode: isLive ? "LIVE" : "DEMO", now: new Date().toISOString(), userAgent: navigator.userAgent }));
                  toast(ok ? "오류 기록을 복사했습니다" : "복사하지 못했습니다", ok ? "success" : "error");
                }}
              ><Copy size={15} aria-hidden /> 복사</button>
              <button className="btn-ghost !min-h-[40px] text-[0.86rem]" data-testid="error-log-clear" onClick={() => { clearErrorLog(); toast("오류 기록을 지웠습니다"); }}><Trash2 size={15} aria-hidden /> 지우기</button>
            </div>
          </>
        )}
      </div>
    </DataCard>
  );
}
