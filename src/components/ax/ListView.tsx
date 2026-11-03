"use client";

import { useEffect, useState } from "react";

/* 모바일 목록 '간단히 / 자세히' (PASS 35 생산 착수 일정 → PASS 36 재고 현황도 같은 방식, D-127 · D-132)
   간단히 = 한 줄 요약(누르면 그 항목만 펼침), 자세히 = 모두 펼친 카드. 고른 보기는 이 브라우저에 기억 */
export type ListView = "compact" | "full";

export function useListView(storageKey: string): [ListView, (v: ListView) => void] {
  const [view, setState] = useState<ListView>("compact");
  useEffect(() => { try { if (localStorage.getItem(storageKey) === "full") setState("full"); } catch { /* 기본 간단히 */ } }, [storageKey]);
  const set = (v: ListView) => { setState(v); try { localStorage.setItem(storageKey, v); } catch { /* 저장 안 돼도 동작 */ } };
  return [view, set];
}

export function ViewToggle({ view, onChange, testId }: { view: ListView; onChange: (v: ListView) => void; testId?: string }) {
  return (
    <div className="flex shrink-0 rounded-[10px] p-0.5" style={{ background: "color-mix(in srgb, var(--text-primary) 6%, var(--surface))" }} role="group" aria-label="보기 방식" data-testid={testId}>
      {(["compact", "full"] as const).map((v) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={view === v} data-view={v} className="pressable min-h-[34px] rounded-[8px] px-3 text-[0.8rem] font-semibold"
          style={view === v ? { background: "var(--surface)", color: "var(--text-primary)", boxShadow: "0 1px 2px rgba(16,24,40,.12)" } : { color: "var(--text-secondary)" }}>
          {v === "compact" ? "간단히" : "자세히"}
        </button>
      ))}
    </div>
  );
}
