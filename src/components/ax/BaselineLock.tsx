"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Modal } from "./Modal";
import { toast } from "./Toast";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { formatDateKR, formatDateTimeKR } from "@/lib/date";
import type { DateRange, MoneyKpiMeasure } from "@/lib/evidence";
import type { BaselineSource, KpiBaseline } from "@/lib/types";

export const BASELINE_SOURCE_LABEL: Record<BaselineSource, string> = {
  SYSTEM: "시스템 측정",
  SELF_REPORT: "담당자 자기기록",
  DOCUMENT: "기존 문서·엑셀",
};

/* Week 0 Baseline Lock — OWNER만. 잠근 값은 수정하지 않고, 다시 잠그면 이전 값은 이력으로 남는다. */
export function BaselineLockModal({ kpi, range, onClose }: { kpi: MoneyKpiMeasure; range: DateRange; onClose: () => void }) {
  const { run } = useData();
  const { actorName } = useSession();
  const [f, setF] = useState({
    value: kpi.baseline ? String(kpi.baseline.value) : "",
    from: kpi.baseline?.periodFrom ?? "",
    to: kpi.baseline?.periodTo ?? "",
    method: kpi.baseline?.method ?? kpi.method,
    source: (kpi.baseline?.source ?? "SELF_REPORT") as BaselineSource,
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const n = Number(f.value);
  const errors = [
    (f.value.trim() === "" || !Number.isFinite(n) || n < 0) && "기준값은 0 이상 숫자",
    kpi.unit === "%" && n > 100 && "비율은 100 이하",
    !f.method.trim() && "측정 방법 필수",
    f.from && f.to && f.to < f.from && "기간 종료일이 시작일보다 빠름",
    kpi.baseline && !f.note.trim() && "재잠금 사유 필수",
  ].filter(Boolean) as string[];

  const useSystem = () => {
    if (kpi.current == null) return;
    setF({ ...f, value: String(kpi.current), from: range.from, to: range.to, method: kpi.method, source: "SYSTEM" });
  };

  return (
    <Modal open onClose={onClose} title={`Baseline 잠금 — ${kpi.key} KPI`} maxWidth="max-w-xl">
      <p className="text-[0.9rem] text-ink-soft">
        <b className="text-ink">{kpi.name}</b>의 도입 전 기준값입니다. 실제로 측정·기록한 값만 입력하세요. 잠근 값은 수정되지 않으며, 다시 잠그면 이전 값은 이력으로 남습니다.
      </p>
      {kpi.current != null && (
        <button type="button" className="btn-secondary mt-3 !min-h-[40px] w-full text-[0.86rem]" onClick={useSystem}>
          시스템 측정값 사용 — {kpi.current}{kpi.unit === "%" ? "%" : ` ${kpi.unit}`} ({kpi.sampleLabel}, {formatDateKR(range.from)}~{formatDateKR(range.to)})
        </button>
      )}
      <div className="mt-4 grid gap-3 @xl:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="bl-value">기준값 ({kpi.unit})</label>
          <input id="bl-value" className="field tabular" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="bl-source">출처</label>
          <select id="bl-source" className="field" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as BaselineSource })}>
            {(Object.keys(BASELINE_SOURCE_LABEL) as BaselineSource[]).map((s) => <option key={s} value={s}>{BASELINE_SOURCE_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="bl-from">측정 기간 시작</label>
          <input id="bl-from" type="date" className="field" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="bl-to">측정 기간 종료</label>
          <input id="bl-to" type="date" className="field" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </div>
        <div className="@xl:col-span-2">
          <label className="field-label" htmlFor="bl-method">측정 방법</label>
          <textarea id="bl-method" className="field" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} />
        </div>
        <div className="@xl:col-span-2">
          <label className="field-label" htmlFor="bl-note">{kpi.baseline ? "재잠금 사유 (필수)" : "메모 (선택)"}</label>
          <input id="bl-note" className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
      </div>
      {errors.length > 0 && <p className="mt-3 text-[0.85rem]" style={{ color: "var(--danger)" }}>{errors.join(" · ")}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button
          className="btn-primary"
          disabled={busy || errors.length > 0}
          onClick={async () => {
            setBusy(true);
            try {
              await run((s) => s.lockBaseline({ kpiKey: kpi.key, value: n, unit: kpi.unit, periodFrom: f.from || null, periodTo: f.to || null, method: f.method.trim(), source: f.source, note: f.note.trim() || null, lockedBy: actorName }));
              toast(`${kpi.key} Baseline을 잠갔습니다`);
              onClose();
            } catch (e) {
              toast(e instanceof Error ? e.message : "실패", "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Lock size={16} aria-hidden /> 잠금
        </button>
      </div>
    </Modal>
  );
}

export function BaselineHistory({ items }: { items: KpiBaseline[] }) {
  if (items.length === 0) return null;
  return (
    <details className="mt-3 text-[0.82rem]">
      <summary className="cursor-pointer font-semibold text-ink-soft">잠금 이력 {items.length}건</summary>
      <ul className="mt-2 space-y-1.5">
        {items.map((b) => (
          <li key={b.id} className="rounded-lg bg-surface-muted px-2.5 py-2">
            <div className="flex justify-between gap-2">
              <span className="tabular font-semibold">{b.value}{b.unit === "%" ? "%" : ` ${b.unit}`}</span>
              <span className="text-ink-soft">{b.supersededAt ? "이전 값" : "현재 기준"}</span>
            </div>
            <div className="text-ink-soft">{formatDateTimeKR(b.lockedAt)} · {b.lockedBy} · {BASELINE_SOURCE_LABEL[b.source]}</div>
            {b.note && <div className="text-ink-soft">사유: {b.note}</div>}
          </li>
        ))}
      </ul>
    </details>
  );
}
