"use client";

import { useMemo, useState } from "react";
import { History, Undo2 } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { Modal } from "./Modal";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { formatDateTimeKR } from "@/lib/date";
import type { ImportBatch, ImportKind } from "@/lib/types";
import { useLeaveGuard } from "@/lib/use-leave-guard";

const KIND_LABEL: Record<ImportKind, string> = { sales: "판매 파일", settlements: "청구·입금 파일" };

/* 파일 가져오기 기록·되돌리기 (PASS 28, D-090) — 잘못 올린 파일은 그 파일로 들어온 행만 한 번에 지운다.
   직접 입력한 자료·다른 파일은 그대로. 되돌리기는 대표·관리자 (판매·정산 삭제 권한과 같음). */
export function ImportHistory({ kind, className = "" }: { kind?: ImportKind; className?: string }) {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const [confirm, setConfirm] = useState<ImportBatch | null>(null);
  const [busy, setBusy] = useState(false);
  useLeaveGuard(!!busy);
  const canUndo = can(role, "edit_master");
  const list = (m.snapshot.importBatches ?? []).filter((b) => !kind || b.kind === kind);
  // 지금 남아 있는 행 수 (나중에 품질 점검으로 지운 행은 빠짐)
  const remain = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of m.snapshot.sales) if (s.importBatchId) n.set(s.importBatchId, (n.get(s.importBatchId) ?? 0) + 1);
    for (const s of m.snapshot.settlements) if (s.importBatchId) n.set(s.importBatchId, (n.get(s.importBatchId) ?? 0) + 1);
    return n;
  }, [m.snapshot.sales, m.snapshot.settlements]);

  if (!m.snapshot.importLogReady) {
    return isLive ? <p className={`text-[0.8rem] text-ink-soft ${className}`}>가져오기 기록·되돌리기는 Supabase에 migration 011을 적용하면 켜집니다.</p> : null;
  }
  const unit = (b: ImportBatch) => (b.kind === "sales" ? "행" : "건");

  return (
    <DataCard title="가져오기 기록" className={className} info="파일로 올린 판매·정산은 파일마다 기록됩니다. 잘못 올린 파일은 '되돌리기'로 그 파일로 들어온 행만 한 번에 지운 뒤 바른 파일을 다시 올리세요. 직접 입력한 자료와 다른 파일은 그대로입니다.">
      <div data-testid={kind ? `import-history-${kind}` : "import-history"}>
        {list.length === 0 ? (
          <p className="text-[0.88rem] text-ink-soft">아직 파일로 가져온 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {list.slice(0, 8).map((b) => {
              const left = remain.get(b.id) ?? 0;
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border)" }} data-import-batch={b.id} data-undone={b.undoneAt ? "1" : "0"}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[0.9rem] font-semibold">
                      <History size={14} className="text-ink-soft" aria-hidden />
                      <span className="break-all">{b.fileName || "(이름 없음)"}</span>
                      {!kind && <StatusBadge tone="neutral">{KIND_LABEL[b.kind]}</StatusBadge>}
                    </p>
                    <p className="tabular mt-0.5 text-[0.8rem] text-ink-soft">
                      {formatDateTimeKR(b.createdAt)}{b.createdBy ? ` · ${b.createdBy}` : ""} · 올린 {b.rowCount.toLocaleString()}{unit(b)}
                      {b.undoneAt ? ` · 되돌림 ${formatDateTimeKR(b.undoneAt)}` : ` · 지금 ${left.toLocaleString()}${unit(b)}`}
                    </p>
                  </div>
                  {b.undoneAt ? (
                    <StatusBadge tone="neutral">되돌림</StatusBadge>
                  ) : canUndo ? (
                    <button className="btn-ghost !min-h-[36px] !px-2.5 text-[0.82rem]" onClick={() => setConfirm(b)} aria-label={`${b.fileName} 되돌리기`}><Undo2 size={14} aria-hidden /> 되돌리기</button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!canUndo && list.length > 0 && <p className="mt-2 text-[0.78rem] text-ink-soft">되돌리기는 대표·관리자가 할 수 있습니다.</p>}
      </div>

      <Modal open={!!confirm} onClose={() => !busy && setConfirm(null)} title="이 파일을 되돌릴까요?">
        {confirm && (
          <>
            <p className="text-[0.95rem]"><b className="break-all">{confirm.fileName}</b> <span className="text-ink-soft">({formatDateTimeKR(confirm.createdAt)})</span>으로 들어온 {confirm.kind === "sales" ? "판매" : "청구·입금"} <b className="tabular">{(remain.get(confirm.id) ?? 0).toLocaleString()}{unit(confirm)}</b>을 지웁니다.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.86rem] text-ink-soft">
              <li>직접 입력한 자료와 다른 파일로 들어온 자료는 그대로입니다.</li>
              {confirm.kind === "settlements" && <li>이 청구에 나중에 기록한 입금도 함께 지워집니다.</li>}
              <li>되돌린 뒤 바른 파일을 다시 올리면 됩니다. 되돌린 파일은 기록에 &lsquo;되돌림&rsquo;으로 남습니다.</li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" disabled={busy} onClick={() => setConfirm(null)}>취소</button>
              <button className="btn-primary" disabled={busy} data-testid="import-undo-confirm" onClick={async () => {
                setBusy(true);
                try {
                  const r = await run((s) => s.undoImport(confirm.id));
                  toast(confirm.kind === "sales" ? `판매 ${r.sales.toLocaleString()}행을 되돌렸습니다` : `청구·입금 ${r.settlements.toLocaleString()}건을 되돌렸습니다`);
                  setConfirm(null);
                } catch (e) {
                  toast(e instanceof Error ? e.message : "되돌리지 못했습니다", "error");
                } finally { setBusy(false); }
              }}>{busy ? "되돌리는 중…" : "되돌리기"}</button>
            </div>
          </>
        )}
      </Modal>
    </DataCard>
  );
}
