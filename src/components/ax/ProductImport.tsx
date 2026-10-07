"use client";

import { useMemo, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { formatPrice } from "@/lib/analytics";
import { autoMap, PRODUCT_FIELDS, readTable, validateProductRows, type ProductField } from "@/lib/import";

/* 상품 일괄 등록 — SKU 기준: 없으면 신규, 있으면 파일에 값이 있는 항목만 갱신 (빈 칸은 기존 값 유지) */
export function ProductImport() {
  const m = useModel();
  const { run } = useData();
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<{ headers: string[]; body: string[][] } | null>(null);
  const [map, setMap] = useState<Record<ProductField, number> | null>(null);
  const [auto, setAuto] = useState<Record<ProductField, number> | null>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const reset = () => { setTable(null); setMap(null); setAuto(null); setFileName(""); };

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const [headers, ...body] = await readTable(file);
      if (!headers || body.length === 0) { toast("헤더와 데이터 행이 있는 파일이 필요합니다", "error"); reset(); return; }
      const detected = autoMap(headers, PRODUCT_FIELDS);
      setTable({ headers, body });
      setMap(detected);
      setAuto(detected);
    } catch (e) {
      toast(e instanceof Error ? e.message : "파일을 읽지 못했습니다", "error");
      reset();
    }
  };

  const mappingErrors = map ? PRODUCT_FIELDS.filter((f) => f.required && map[f.key] < 0).map((f) => `${f.label} 열 선택 필요`) : [];
  const rows = useMemo(
    () => (table && map && mappingErrors.length === 0 ? validateProductRows({ body: table.body, map, existing: m.snapshot.products }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, map, m.snapshot.products, mappingErrors.length]
  );
  const valid = rows?.filter((r) => r.value && (r.mode === "new" || (r.changes?.length ?? 0) > 0)) ?? [];
  const created = valid.filter((r) => r.mode === "new").length;
  const updated = valid.length - created;
  const unchanged = rows?.filter((r) => r.value && r.mode === "update" && !r.changes?.length).length ?? 0;
  const bad = rows?.filter((r) => !r.value).length ?? 0;

  return (
    <DataCard title="상품 일괄 등록 (CSV · 엑셀)" className="mt-6" action={<a href="/samples/products_template.csv" download className="btn-secondary !min-h-[40px] text-[0.86rem]"><Download size={15} aria-hidden /> 상품 템플릿</a>}>
      <p className="mb-3 text-[0.88rem] text-ink-soft">SKU가 이미 있으면 파일에 값이 있는 항목만 바꾸고, 빈 칸은 기존 값을 유지합니다. 효능·인증 문구는 입력하지 않습니다 (피부 고민은 추천 분류일 뿐입니다).</p>
      <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors hover:bg-surface-muted" style={{ borderColor: "var(--border)" }}>
        <FileUp size={24} className="text-ink-soft" aria-hidden />
        <span className="break-all font-semibold">{fileName || "상품 목록 파일 선택 (.csv, .xlsx)"}</span>
        <input data-testid="product-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {table && map && (
        <div className="mt-4 grid gap-2 @xl:grid-cols-2 @4xl:grid-cols-3">
          {PRODUCT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="field-label !mb-1 flex items-center gap-1.5" htmlFor={`pmap-${f.key}`}>
                {f.label}{f.required && <span style={{ color: "var(--danger)" }}>*</span>}
                {auto && auto[f.key] >= 0 && auto[f.key] === map[f.key] && <StatusBadge tone="success">자동 인식</StatusBadge>}
              </label>
              <select id={`pmap-${f.key}`} className="field !min-h-[40px] text-[0.86rem]" value={map[f.key]} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}>
                <option value={-1}>— 없음 —</option>
                {table.headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h || `(${i + 1}열)`}</option>)}
              </select>
            </div>
          ))}
          {mappingErrors.length > 0 && <p className="text-[0.85rem] @xl:col-span-2 @4xl:col-span-3" style={{ color: "var(--danger)" }}>{mappingErrors.join(" · ")}</p>}
        </div>
      )}

      {rows && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 text-[0.86rem]">
            <StatusBadge tone="success">신규 {created}</StatusBadge>
            <StatusBadge tone="primary">수정 {updated}</StatusBadge>
            <StatusBadge tone="neutral">변경 없음 {unchanged}</StatusBadge>
            <StatusBadge tone={bad ? "danger" : "neutral"}>오류 {bad}</StatusBadge>
          </div>
          <div tabIndex={0} className="table-scroll mt-3 max-h-[280px] overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="!min-w-0 text-[0.82rem]">
              <thead><tr className="bg-surface-muted text-left"><th className="px-3 py-2">행</th><th className="px-3 py-2">상품</th><th className="w-[40%] px-3 py-2">결과</th></tr></thead>
              <tbody>
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.line} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-1.5">{r.line}</td>
                    <td className="px-3 py-1.5">{r.value ? `${r.value.sku} · ${r.value.name} · ${r.value.category} · ${formatPrice(r.value.price)}${r.value.isPublished ? " · 공개" : ""}` : r.raw.join(" | ")}</td>
                    <td className="px-3 py-1.5" style={{ color: r.errors.length ? "var(--danger)" : r.mode === "new" ? "var(--success)" : "var(--primary)" }}>
                      {r.errors.length ? r.errors.join(", ") : r.mode === "new" ? "신규 등록" : r.changes?.length ? `수정: ${r.changes.join(", ")}` : "변경 없음"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!!busy || valid.length === 0} onClick={async () => {
              setBusy({ done: 0, total: valid.length });
              try {
                await run(async (s) => {
                  for (const [i, r] of valid.entries()) { await s.upsertProduct(r.value!); setBusy({ done: i + 1, total: valid.length }); }
                });
                toast(`상품 ${created}개 등록 · ${updated}개 수정했습니다`);
                reset();
              } catch (e) {
                toast(e instanceof Error ? e.message : "저장 실패", "error");
              } finally { setBusy(null); }
            }}>
              {busy ? `저장 중 ${busy.done}/${busy.total}` : `${valid.length}개 저장 (Confirm)`}
            </button>
            <button className="btn-secondary" onClick={reset} disabled={!!busy}>취소</button>
          </div>
          <p className="mt-2 text-[0.8rem] text-ink-soft">오류 행과 변경 없는 행은 저장하지 않습니다. 새 상품은 &lsquo;공개&rsquo; 열이 없으면 비공개로 등록됩니다.</p>
        </div>
      )}
    </DataCard>
  );
}
