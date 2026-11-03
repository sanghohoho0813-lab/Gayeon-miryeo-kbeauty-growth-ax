"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DatabaseBackup } from "lucide-react";
import { toast } from "./Toast";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { formatDateTimeKR, todayISO } from "@/lib/date";
import { buildTransfer } from "@/lib/transfer";
import type { DataSnapshot } from "@/lib/data/source";
import { backupNeed, deltaText, markBackup, parseBackupMark, type BackupMark } from "@/lib/backup-status";

/* Demo 실데이터 백업 알림 (PASS 39, D-142) — 받은 때를 이 브라우저에 기억하고, 그 뒤 자료가 바뀌었거나 한 번도 받지 않았으면 알린다.
   Live는 서버(DB)에 있으므로 알리지 않는다. 받을 권한은 백업 카드와 같다(view_financials). */

const MARK_KEY = (org: string) => `miryeo-backup:demo:${org}`;
const SNOOZE_KEY = (org: string) => `miryeo-backup-snooze:demo:${org}`;
const EVT = "miryeo-backup-mark";

function readMark(org: string): BackupMark | null {
  try { return parseBackupMark(localStorage.getItem(MARK_KEY(org))); } catch { return null; }
}

/** 백업 파일 받기 — 받은 때를 기록(Demo)하고 다른 카드에도 알린다 */
export function downloadBackup(s: DataSnapshot): void {
  const at = new Date().toISOString();
  const { file } = buildTransfer(s, isLive ? "live" : "demo", at);
  const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `miryeo_transfer_${todayISO()}${isLive ? "" : "_DEMO"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (!isLive) {
    try { localStorage.setItem(MARK_KEY(s.org.name), JSON.stringify(markBackup(file, at))); } catch { /* 기록 못 해도 파일은 받음 */ }
    window.dispatchEvent(new Event(EVT));
  }
}

/** 지금 자료와 마지막 백업 비교 (Demo만) */
export function useBackupState() {
  const m = useModel();
  const org = m.snapshot.org.name;
  const [mark, setMark] = useState<BackupMark | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = () => { setMark(readMark(org)); setReady(true); };
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === MARK_KEY(org)) load(); };
    window.addEventListener(EVT, load);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(EVT, load); window.removeEventListener("storage", onStorage); };
  }, [org]);
  const file = useMemo(() => buildTransfer(m.snapshot, "demo").file, [m.snapshot]);
  const need = useMemo(() => (ready && !isLive ? backupNeed(file, mark, new Date().toISOString()) : null), [ready, file, mark]);
  return { ready, mark, need, snapshot: m.snapshot, org };
}

/** 대시보드 알림 — 알릴 것이 있을 때만. '내일 다시'로 하루 미룰 수 있음 */
export function BackupNudge() {
  const { role } = useSession();
  const { need, snapshot, org } = useBackupState();
  const [snoozed, setSnoozed] = useState(true);
  useEffect(() => {
    try { setSnoozed((localStorage.getItem(SNOOZE_KEY(org)) ?? "") >= todayISO()); } catch { setSnoozed(false); }
  }, [org]);
  if (isLive || !need || snoozed || !can(role, "view_financials")) return null;
  const snooze = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    try { localStorage.setItem(SNOOZE_KEY(org), todayISO(d)); } catch { /* noop */ }
    setSnoozed(true);
  };
  const get = () => { downloadBackup(snapshot); toast("백업 파일을 받았습니다 — 안전한 곳(회사 드라이브 등)에 보관하세요"); };
  return (
    <section aria-labelledby="backup-nudge-title" className="mb-4 rounded-2xl border p-4 @md:px-5" style={{ borderColor: "var(--warning)", background: "var(--warning-soft)" }} data-testid="backup-nudge" data-kind={need.kind}>
      <div className="flex items-start gap-3">
        <DatabaseBackup size={20} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="backup-nudge-title" className="text-[0.95rem] font-bold">
            {need.kind === "never" ? "직접 넣은 자료를 아직 백업하지 않았습니다" : "마지막 백업 뒤 바뀐 자료가 있습니다"}
          </h2>
          <p className="mt-0.5 text-[0.86rem]" data-testid="backup-nudge-detail">
            {need.kind === "never"
              ? `상품 ${need.counts.products} · 판매 ${need.counts.sales.toLocaleString("ko-KR")}행 · 정산 ${need.counts.settlements}건이 이 브라우저에만 있습니다. 브라우저 데이터를 지우면 사라집니다.`
              : `${formatDateTimeKR(need.at)} 백업${need.days ? ` (${need.days}일 전)` : ""} 뒤 ${deltaText(need.delta)}. 이 브라우저에만 있습니다.`}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary !min-h-[40px] !px-3.5 text-[0.86rem]" onClick={get} data-testid="backup-nudge-get"><DatabaseBackup size={15} aria-hidden /> 백업 파일 받기</button>
            <button type="button" className="btn-ghost !min-h-[40px] !px-3 text-[0.84rem]" onClick={snooze} data-testid="backup-nudge-snooze">내일 다시 알림</button>
            <Link href="/ax/data?tab=export#transfer" className="inline-flex min-h-[40px] items-center px-1 text-[0.84rem] font-semibold underline">백업·이관 자세히</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** 백업 카드·데이터 관리 안내에 쓰는 한 줄 — 마지막 백업 때와 그 뒤 바뀐 것 */
export function BackupLastLine() {
  const { ready, mark, need } = useBackupState();
  if (isLive || !ready) return null;
  const fresh = !!mark && !need;
  return (
    <p className="mt-1 text-[0.8rem] tabular" style={{ color: fresh ? "var(--success)" : "var(--text-secondary)" }} data-testid="backup-last" data-fresh={fresh ? "1" : "0"}>
      {!mark ? "아직 이 브라우저에서 백업 파일을 받은 적이 없습니다."
        : fresh ? `마지막 백업 ${formatDateTimeKR(mark.at)} — 그 뒤 바뀐 것 없음`
        : `마지막 백업 ${formatDateTimeKR(mark.at)} — 그 뒤 ${need?.kind === "changed" ? deltaText(need.delta) : "바뀜"}`}
    </p>
  );
}
