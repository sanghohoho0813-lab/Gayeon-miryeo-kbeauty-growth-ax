"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { formatKRW } from "@/lib/analytics";
import { monthLabel } from "@/lib/monthly";
import { formatDateTimeKR } from "@/lib/date";
import { parseTarget, targetProgress } from "@/lib/targets";

/* 월 매출 목표 — 입력 대표(OWNER), 조회 대표·관리자. 진행 중인 달은 경과 일수 비율과 비교 */
export function MonthlyTargetCard({ month, actual }: { month: string; actual: number }) {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const owner = can(role, "manage_org");
  const targets = m.snapshot.monthlyTargets ?? [];
  const p = targetProgress(month, actual, targets, m.today);
  const saved = targets.find((x) => x.month === month);
  const [draft, setDraft] = useState<{ month: string; value: string } | null>(null);
  const value = draft?.month === month ? draft.value : saved ? String(saved.revenueTarget) : "";
  const parsed = parseTarget(value);
  const [busy, setBusy] = useState(false);
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const tone = p.status === "달성" || p.status === "진도 앞섬" ? "success" : p.status === "목표 없음" ? "neutral" : "warning";

  const save = async () => {
    if (parsed == null) return;
    setBusy(true);
    try { await run((s) => s.upsertMonthlyTarget({ month, revenueTarget: parsed })); setDraft(null); toast(`${monthLabel(month)} 목표를 저장했습니다`); }
    catch (e) { toast(e instanceof Error ? e.message : "저장 실패", "error"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await run((s) => s.deleteMonthlyTarget(month)); setDraft(null); toast("목표를 지웠습니다"); }
    catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
    finally { setBusy(false); }
  };

  return (
    <DataCard title={<span className="inline-flex items-center gap-2"><Target size={18} aria-hidden /> {monthLabel(month)} 매출 목표</span>} info="대표가 월 목표 매출을 입력하면 달성률과 월말 예상(지금 속도 기준)을 보여 줍니다. 목표는 시스템이 만들지 않습니다.">
      <div data-testid="target-card" data-status={p.status}>
        {p.target == null ? (
          <p className="text-[0.9rem] text-ink-soft">목표 미입력 — 목표는 시스템이 만들지 않습니다{owner ? "" : " (대표 입력)"}</p>
        ) : (
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="tabular text-[1.6rem] font-bold" data-testid="target-rate">{pct(p.rate!)}</span>
              <StatusBadge tone={tone}>{p.status}</StatusBadge>
              <span className="tabular text-[0.9rem] text-ink-soft">실적 {formatKRW(p.actual)} / 목표 {formatKRW(p.target)}</span>
            </div>
            <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`목표 대비 ${pct(p.rate!)}${p.elapsed < 1 ? `, 월 경과 ${pct(p.elapsed)}` : ""}`}>
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, p.rate! * 100)}%`, background: tone === "success" ? "var(--success)" : "var(--warning)" }} />
              {p.elapsed > 0 && p.elapsed < 1 && <span className="absolute top-0 h-full w-0.5" style={{ left: `${p.elapsed * 100}%`, background: "var(--text-primary)" }} aria-hidden />}
            </div>
            {p.elapsed < 1 && p.elapsed > 0 && (
              <p className="mt-2 text-[0.86rem]">월 경과 <b className="tabular">{pct(p.elapsed)}</b> (세로선) · 지금 속도면 월말 약 <b className="tabular">{formatKRW(p.projected!)}</b> <span className="text-ink-soft">(추정 — 남은 기간도 같은 속도로 판다고 가정)</span></p>
            )}
            {saved?.setBy && <p className="mt-1 text-[0.76rem] text-ink-soft">입력 {saved.setBy}{saved.updatedAt ? ` · ${formatDateTimeKR(saved.updatedAt)}` : ""}</p>}
          </div>
        )}
        {owner && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div>
              <label className="field-label" htmlFor="target-input">{monthLabel(month)} 목표 매출 (원)</label>
              <input id="target-input" className="field tabular !w-[200px]" inputMode="numeric" placeholder="예: 300,000,000" value={value} onChange={(e) => setDraft({ month, value: e.target.value })} />
            </div>
            <button className="btn-primary" disabled={busy || parsed == null || parsed === saved?.revenueTarget} onClick={() => void save()}>목표 저장</button>
            {saved && <button className="btn-ghost" disabled={busy} onClick={() => void remove()}>목표 지우기</button>}
            {value && parsed == null && <span className="text-[0.84rem]" style={{ color: "var(--danger)" }}>1원 이상 숫자로 입력하세요</span>}
          </div>
        )}
      </div>
    </DataCard>
  );
}
