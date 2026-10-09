"use client";

import { useMemo, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { autoMap, diagnoseSales, findUnknownMasters, readTable, SALES_FIELDS, validateSalesRows, type ColumnMap, type SalesField } from "@/lib/import";
import { ImportMasters, SalesDiagnosisCard } from "./ImportMasters";

/* 판매 파일 가져오기 — 1 Upload → 2 열 매핑 → 3 검증 → 4 Confirm. 기존 데이터는 변경하지 않고 추가만 한다. */
export function SalesImport() {
  const m = useModel();
  const { run } = useData();
  const channels = m.snapshot.channels.filter((c) => c.active);
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<{ headers: string[]; body: string[][] } | null>(null);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [auto, setAuto] = useState<ColumnMap | null>(null);
  const [defaultChannel, setDefaultChannel] = useState(channels[0]?.id ?? "");
  const [includeDup, setIncludeDup] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTable(null); setMap(null); setAuto(null); setFileName(""); setIncludeDup(false); };

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const rows = await readTable(file);
      const [headers, ...body] = rows;
      if (!headers || body.length === 0) { toast("헤더와 데이터 행이 있는 파일이 필요합니다", "error"); reset(); return; }
      const detected = autoMap(headers);
      setTable({ headers, body });
      setMap(detected);
      setAuto(detected);
    } catch (e) {
      toast(e instanceof Error ? e.message : "파일을 읽지 못했습니다", "error");
      reset();
    }
  };

  const mappingErrors = map
    ? [
        map.saleDate < 0 && "판매일 열 선택 필요",
        map.units < 0 && "수량 열 선택 필요",
        map.sku < 0 && map.productName < 0 && "SKU 또는 상품명 열 선택 필요",
        map.channel < 0 && !defaultChannel && "채널 열 또는 기본 채널 필요",
      ].filter(Boolean) as string[]
    : [];

  const rows = useMemo(() => {
    if (!table || !map || mappingErrors.length) return null;
    return validateSalesRows({ body: table.body, map, products: m.snapshot.products, channels, defaultChannelId: map.channel < 0 ? defaultChannel : null, existing: m.snapshot.sales });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, map, defaultChannel, m.snapshot.products, m.snapshot.channels, m.snapshot.sales, mappingErrors.length]);
  const diagnosis = useMemo(() => (table && map && !mappingErrors.length ? diagnoseSales(table.body, map) : null), [table, map, mappingErrors.length]);
  const unknown = useMemo(
    () => (table && map && !mappingErrors.length ? findUnknownMasters({ body: table.body, map, products: m.snapshot.products, channels }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, map, m.snapshot.products, m.snapshot.channels, mappingErrors.length]
  );

  const ok = rows?.filter((r) => r.value && !r.duplicate) ?? [];
  const dup = rows?.filter((r) => r.value && r.duplicate) ?? [];
  const bad = rows?.filter((r) => !r.value) ?? [];
  const toSave = includeDup ? [...ok, ...dup] : ok;
  const step = !table ? 0 : !rows ? 1 : 2;

  return (
    <DataCard title="파일 가져오기 (CSV · 엑셀)" action={<a href="/samples/sales_template.csv" download className="btn-secondary !min-h-[40px] text-[0.86rem]"><Download size={15} aria-hidden /> 샘플 CSV</a>}>
      <ol className="mb-4 flex flex-wrap gap-2 text-[0.8rem] font-semibold">
        {["1 Upload", "2 열 매핑", "3 Validation", "4 Confirm"].map((s, i) => (
          <li key={s} className="badge" style={i <= step ? { background: "var(--primary-soft)", color: "var(--primary)" } : { background: "var(--surface-muted)", color: "var(--text-secondary)" }}>{s}</li>
        ))}
      </ol>

      <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors hover:bg-surface-muted" style={{ borderColor: "var(--border)" }}>
        <FileUp size={26} className="text-ink-soft" aria-hidden />
        <span className="break-all font-semibold">{fileName || "판매 파일 선택 (.csv, .xlsx)"}</span>
        <span className="text-[0.82rem] text-ink-soft">쇼핑몰 주문 엑셀·자체 집계표 그대로 올려도 됩니다. 열 이름은 자동 인식 후 확인합니다.</span>
        <input data-testid="sales-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {table && map && (
        <div className="mt-4">
          <h3 className="text-[0.95rem] font-bold">열 매핑 <span className="font-normal text-ink-soft">— 데이터 {table.body.length}행</span></h3>
          <div className="mt-2 grid gap-2 @xl:grid-cols-2">
            {SALES_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="field-label !mb-1 flex items-center gap-1.5" htmlFor={`map-${f.key}`}>
                  {f.label}{f.required && <span style={{ color: "var(--danger)" }}>*</span>}
                  {auto && auto[f.key] >= 0 && auto[f.key] === map[f.key] && <StatusBadge tone="success">자동 인식</StatusBadge>}
                </label>
                <select id={`map-${f.key}`} className="field !min-h-[40px] text-[0.88rem]" value={map[f.key]} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) } as Record<SalesField, number>)}>
                  <option value={-1}>— 없음 —</option>
                  {table.headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h || `(${i + 1}열)`} · 예: {table.body[0]?.[i] ?? ""}</option>)}
                </select>
                <p className="mt-0.5 text-[0.75rem] text-ink-soft">{f.hint}</p>
              </div>
            ))}
            {map.channel < 0 && (
              <div className="@xl:col-span-2">
                <label className="field-label !mb-1" htmlFor="map-default-ch">기본 채널 (파일에 채널 열이 없을 때 모든 행에 적용)</label>
                <select id="map-default-ch" className="field !min-h-[40px] text-[0.88rem]" value={defaultChannel} onChange={(e) => setDefaultChannel(e.target.value)}>
                  {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {mappingErrors.length > 0 && <p className="mt-2 text-[0.85rem]" style={{ color: "var(--danger)" }}>{mappingErrors.join(" · ")}</p>}
        </div>
      )}

      {diagnosis && <SalesDiagnosisCard d={diagnosis} />}
      {unknown && <ImportMasters products={unknown.products} channels={unknown.channels} />}

      {rows && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 text-[0.86rem]">
            <StatusBadge tone="success">정상 {ok.length}행</StatusBadge>
            <StatusBadge tone={dup.length ? "warning" : "neutral"}>중복 의심 {dup.length}행</StatusBadge>
            <StatusBadge tone={bad.length ? "danger" : "neutral"}>오류 {bad.length}행</StatusBadge>
          </div>
          <div tabIndex={0} className="table-scroll mt-3 max-h-[260px] overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="!min-w-0 text-[0.82rem]">
              <thead><tr className="bg-surface-muted text-left"><th className="px-3 py-2">행</th><th className="px-3 py-2">해석</th><th className="w-[34%] px-3 py-2">검증</th></tr></thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={r.line} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5">{r.line}</td>
                    <td className="px-3 py-1.5">{r.value ? `${r.value.saleDate} · ${m.productById.get(r.value.productId)?.name} · ${channels.find((c) => c.id === r.value!.channelId)?.name} · ${r.value.units}개 · ${r.value.revenue.toLocaleString()}원` : r.raw.join(" | ")}</td>
                    <td className="px-3 py-1.5" style={{ color: r.errors.length ? "var(--danger)" : r.duplicate ? "var(--warning)" : "var(--success)" }}>{r.errors.length ? r.errors.join(", ") : r.duplicate ? "중복 의심 (같은 날짜·상품·채널·수량·매출)" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && <p className="mt-1 text-[0.78rem] text-ink-soft">앞 100행만 표시 · 저장은 전체 {toSave.length}행</p>}
          {dup.length > 0 && (
            <label className="mt-3 flex items-center gap-2 text-[0.88rem]">
              <input type="checkbox" className="h-4 w-4" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} /> 중복 의심 {dup.length}행도 저장 (같은 날 같은 수량 판매가 실제로 있었던 경우)
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy || toSave.length === 0} onClick={async () => {
              setBusy(true);
              try { await run((s) => s.addSales(toSave.map((r) => r.value!))); toast(`${toSave.length}행을 저장했습니다`); reset(); } catch (e) { toast(e instanceof Error ? e.message : "저장 실패", "error"); } finally { setBusy(false); }
            }}>
              {toSave.length}행 저장 (Confirm)
            </button>
            <button className="btn-secondary" onClick={reset}>취소</button>
          </div>
          <p className="mt-2 text-[0.8rem] text-ink-soft">오류 행은 저장되지 않습니다. 기존 데이터는 변경되지 않습니다 (추가만).</p>
        </div>
      )}
    </DataCard>
  );
}
