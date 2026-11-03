import type { TransferFile } from "./transfer";

/* Demo 실데이터 백업 상태 (PASS 39, D-142) — Demo 주소에 직접 넣은 실데이터는 이 브라우저에만 있다.
   백업 파일을 받은 때의 '자료 지문'을 저장해 두고, 지금 자료와 다르면(그 뒤 바뀜) 또는 한 번도 받지 않았으면 알린다.
   지문은 행 수와 합계(수량·매출·금액·입금·재고·가격)로 만든다 — 추가·삭제·대부분의 수정을 잡고, 계산이 가볍다. */

export interface BackupMark {
  v: 1;
  at: string;          // 받은 시각 (ISO)
  sig: string;         // 그때의 자료 지문
  counts: BackupCounts;
}
export interface BackupCounts { products: number; sales: number; settlements: number }

export type BackupNeed =
  | { kind: "never"; counts: BackupCounts }
  | { kind: "changed"; days: number; at: string; delta: BackupCounts }
  | null;

const sum = <T,>(list: T[], f: (x: T) => number) => list.reduce((a, x) => a + (Number.isFinite(f(x)) ? f(x) : 0), 0);

export function countsOf(f: TransferFile): BackupCounts {
  return { products: f.products.length, sales: f.sales.length, settlements: f.settlements.length };
}

/** 자료 지문 — 백업 파일에 들어가는 실데이터만 (Demo 시드·연습 자료 제외) */
export function backupSignature(f: TransferFile): string {
  return [
    f.channels.length,
    f.products.length, sum(f.products, (p) => p.price), sum(f.products, (p) => p.cost ?? 0),
    f.inventory.length, sum(f.inventory, (i) => i.currentStock), sum(f.inventory, (i) => i.incomingStock ?? 0),
    f.sales.length, sum(f.sales, (s) => s.units), sum(f.sales, (s) => s.revenue),
    f.settlements.length, sum(f.settlements, (s) => s.amount), sum(f.settlements, (s) => s.paidAmount),
    (f.monthlyTargets ?? []).length, sum(f.monthlyTargets ?? [], (t) => t.revenueTarget),
    f.org.pilotStartedOn ?? "", f.org.axOwnerName ?? "",
  ].join("|");
}

export function markBackup(f: TransferFile, at: string): BackupMark {
  return { v: 1, at, sig: backupSignature(f), counts: countsOf(f) };
}

export function parseBackupMark(raw: string | null): BackupMark | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    const n = (x: unknown) => typeof x === "number" && Number.isFinite(x);
    if (v?.v === 1 && typeof v.at === "string" && typeof v.sig === "string" && n(v.counts?.products) && n(v.counts?.sales) && n(v.counts?.settlements)) return v as BackupMark;
  } catch { /* 아래 */ }
  return null;
}

/** 알릴 것이 있는지 — 실데이터가 없으면 null, 받은 뒤 그대로면 null */
export function backupNeed(f: TransferFile, mark: BackupMark | null, nowISO: string): BackupNeed {
  const c = countsOf(f);
  const hasReal = c.products + c.sales + c.settlements > 0;
  if (!hasReal) return null;
  if (!mark) return { kind: "never", counts: c };
  if (mark.sig === backupSignature(f)) return null;
  const days = Math.max(0, Math.floor((Date.parse(nowISO) - Date.parse(mark.at)) / 86_400_000));
  return { kind: "changed", days, at: mark.at, delta: { products: c.products - mark.counts.products, sales: c.sales - mark.counts.sales, settlements: c.settlements - mark.counts.settlements } };
}

/** '판매 +120행 · 상품 +1' — 행 수가 그대로면(값만 고침) '값 수정' */
export function deltaText(d: BackupCounts): string {
  const part = (n: number, label: string, unit: string) => (n ? `${label} ${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString("ko-KR")}${unit}` : null);
  const parts = [part(d.sales, "판매", "행"), part(d.products, "상품", "개"), part(d.settlements, "정산", "건")].filter(Boolean);
  return parts.length ? parts.join(" · ") : "값 수정";
}
