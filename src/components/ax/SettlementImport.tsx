"use client";

import { useMemo, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { formatPrice } from "@/lib/analytics";
import { autoMap, readTable } from "@/lib/import";
import { SETTLEMENT_FIELDS, validateSettlementRows, type SettlementField } from "@/lib/settlement-import";
import { SETTLEMENT_KIND_LABEL, SETTLEMENT_STATUS_LABEL } from "@/lib/settlements";

/* 청구·입금 파일 가져오기 (PASS 27, D-087) — 거래처별 청구·입금 현황을 엑셀·CSV 그대로. 오류 행·중복 의심은 저장하지 않는다 */
export function SettlementImport() {
  const m = useModel();
  const { run } = useData();
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<{ headers: string[]; body: string[][] } | null>(null);
  const [map, setMap] = useState<Record<SettlementField, number> | null>(null);
  const [auto, setAuto] = useState<Record<SettlementField, number> | null>(null);
  const [includeDup, setIncludeDup] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const reset = () => { setTable(null); setMap(null); setAuto(null); setFileName(""); setIncludeDup(false); };

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const [headers, ...body] = await readTable(file);
      if (!headers || body.length === 0) { toast("헤더와 데이터 행이 있는 파일이 필요합니다", "error"); reset(); return; }
      const detected = autoMap(headers, SETTLEMENT_FIELDS);
      setTable({ headers, body });
      setMap(detected);
      setAuto(detected);
    } catch (e) {
      toast(e instanceof Error ? e.message : "파일을 읽지 못했습니다", "error");
      reset();
    }
  };

  const mappingErrors = map ? SETTLEMENT_FIELDS.filter((f) => f.required && map[f.key] < 0).map((f) => `${f.label} 열 선택 필요`) : [];
  const rows = useMemo(
    () => (table && map && mappingErrors.length === 0 ? validateSettlementRows({ body: table.body, map, existing: m.snapshot.settlements, b2b: m.snapshot.b2b, channels: m.snapshot.channels, today: m.today }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, map, m.snapshot.settlements, m.snapshot.b2b, m.snapshot.channels, m.today, mappingErrors.length]
  );
  const ok = rows?.filter((r) => r.value && !r.duplicate) ?? [];
  const dup = rows?.filter((r) => r.value && r.duplicate) ?? [];
  const bad = rows?.filter((r) => !r.value).length ?? 0;
  const toSave = includeDup ? [...ok, ...dup] : ok;
  const outstandingSum = toSave.reduce((a, r) => a + (r.value!.status === "PAID" ? 0 : r.value!.amount - r.value!.paidAmount), 0);

  return (
    <DataCard
      title="청구·입금 파일 가져오기 (CSV · 엑셀)"
      action={<a href="/samples/settlements_template.csv" download className="btn-secondary !min-h-[40px] text-[0.86rem]"><Download size={15} aria-hidden /> 정산 템플릿</a>}
    >
      <p className="mb-3 text-[0.88rem] text-ink-soft">거래처별 청구·입금 현황(세금계산서·거래명세서 목록)을 한 번에 올립니다. 구분·거래처·청구일·청구액이 같은 청구가 이미 있으면 &lsquo;중복 의심&rsquo;으로 저장하지 않으니, 같은 파일을 다시 올려도 두 번 잡히지 않습니다. 입금액을 넣으면 미입금·부분 입금·완납이 자동으로 정해집니다.</p>
      <label className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors hover:bg-surface-muted" style={{ borderColor: "var(--border)" }}>
        <FileUp size={24} className="text-ink-soft" aria-hidden />
        <span className="break-all font-semibold">{fileName || "청구·입금 파일 선택 (.csv, .xlsx)"}</span>
        <input data-testid="settlement-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {table && map && (
        <div className="mt-4 grid gap-2 @xl:grid-cols-2 @4xl:grid-cols-3">
          {SETTLEMENT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="field-label !mb-1 flex items-center gap-1.5" htmlFor={`smap-${f.key}`}>
                {f.label}{f.required && <span style={{ color: "var(--danger)" }}>*</span>}
                {auto && auto[f.key] >= 0 && auto[f.key] === map[f.key] && <StatusBadge tone="success">자동 인식</StatusBadge>}
              </label>
              <select id={`smap-${f.key}`} className="field !min-h-[40px] text-[0.86rem]" value={map[f.key]} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}>
                <option value={-1}>— 없음 —</option>
                {table.headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h || `(${i + 1}열)`}</option>)}
              </select>
            </div>
          ))}
          {mappingErrors.length > 0 && <p className="text-[0.85rem] @xl:col-span-2 @4xl:col-span-3" style={{ color: "var(--danger)" }}>{mappingErrors.join(" · ")}</p>}
        </div>
      )}

      {rows && (
        <div className="mt-4" data-testid="settlement-import-preview">
          <div className="flex flex-wrap gap-2 text-[0.86rem]">
            <StatusBadge tone="success">새 청구 {ok.length}건</StatusBadge>
            <StatusBadge tone={dup.length ? "warning" : "neutral"}>중복 의심 {dup.length}건</StatusBadge>
            <StatusBadge tone={bad ? "danger" : "neutral"}>오류 {bad}건</StatusBadge>
            {toSave.length > 0 && <StatusBadge tone="primary">저장하면 받을 돈 +{formatPrice(outstandingSum)}</StatusBadge>}
          </div>
          <div tabIndex={0} className="table-scroll mt-3 max-h-[280px] overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="!min-w-0 text-[0.82rem]">
              <thead><tr className="bg-surface-muted text-left"><th className="px-3 py-2">행</th><th className="px-3 py-2">청구</th><th className="w-[38%] px-3 py-2">결과</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.line} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5">{r.line}</td>
                    <td className="px-3 py-1.5">{r.value ? `${SETTLEMENT_KIND_LABEL[r.value.kind]} · ${r.value.counterparty} · ${r.value.issuedOn} · ${formatPrice(r.value.amount)}${r.value.paidAmount ? ` (입금 ${formatPrice(r.value.paidAmount)})` : ""}${r.value.dueOn ? ` · 기한 ${r.value.dueOn}` : ""}` : r.raw.join(" | ")}</td>
                    <td className="px-3 py-1.5" style={{ color: r.errors.length ? "var(--danger)" : r.duplicate ? "var(--warning)" : "var(--success)" }}>
                      {r.errors.length ? r.errors.join(", ") : r.duplicate ? "중복 의심 (같은 구분·거래처·청구일·청구액)" : SETTLEMENT_STATUS_LABEL[r.value!.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dup.length > 0 && (
            <label className="mt-3 flex items-center gap-2 text-[0.86rem]">
              <input type="checkbox" className="h-4 w-4" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} /> 중복 의심 {dup.length}건도 저장 (같은 날 같은 금액 청구가 실제로 두 건 있었던 경우)
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!!busy || toSave.length === 0} onClick={async () => {
              setBusy({ done: 0, total: toSave.length });
              try {
                await run(async (s) => {
                  for (const [i, r] of toSave.entries()) {
                    await s.upsertSettlement(r.value!);
                    setBusy({ done: i + 1, total: toSave.length });
                  }
                });
                toast(`청구·입금 ${toSave.length}건을 저장했습니다`);
                reset();
              } catch (e) {
                toast(e instanceof Error ? e.message : "저장 실패", "error");
              } finally { setBusy(null); }
            }}>
              {busy ? `저장 중 ${busy.done}/${busy.total}` : `${toSave.length}건 저장 (Confirm)`}
            </button>
            <button className="btn-secondary" onClick={reset} disabled={!!busy}>취소</button>
          </div>
          <p className="mt-2 text-[0.8rem] text-ink-soft">오류 행은 저장하지 않습니다. 저장한 뒤에도 정산 내역에서 한 건씩 고치거나 입금을 기록할 수 있습니다.</p>
        </div>
      )}
    </DataCard>
  );
}
