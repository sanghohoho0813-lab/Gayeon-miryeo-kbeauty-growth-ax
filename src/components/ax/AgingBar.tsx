"use client";

import { AGING_LABEL, type AgingBucket, type AgingRow } from "@/lib/settlements";
import { formatKRW } from "@/lib/analytics";

/* 받을 돈 연령 색·작은 막대 (PASS 31, D-099) — 정산 화면 '받을 돈 연령'과 대시보드 받을 돈 칸이 같은 색을 쓴다.
   기한 전 = 차트 기본색, 연체가 길수록 노랑 → 빨강 */
export const AGING_COLOR: Record<AgingBucket, string> = {
  notDue: "var(--chart-1)",
  d1_30: "var(--warning)",
  d31_60: "color-mix(in srgb, var(--warning) 40%, var(--danger))",
  d61: "var(--danger)",
};

/** 대시보드 칸용 얇은 막대 — 칸 전체가 정산 화면 링크라 링크 이름이 길어지지 않게 화면 읽기에서는 숨김 (구간 금액은 정산 화면 '받을 돈 연령'에서 글자로) */
export function AgingMiniBar({ rows }: { rows: AgingRow[] }) {
  const total = rows.reduce((a, r) => a + r.amount, 0);
  if (total <= 0) return null;
  return (
    <span className="mt-2 flex h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-surface-muted" aria-hidden data-testid="aging-mini" title={rows.filter((r) => r.amount > 0).map((r) => `${AGING_LABEL[r.bucket]} ${formatKRW(r.amount)}`).join(" · ")}>
      {rows.filter((r) => r.amount > 0).map((r) => (
        <span key={r.bucket} className="h-full" style={{ width: `${Math.max(3, (r.amount / total) * 100)}%`, background: AGING_COLOR[r.bucket] }} data-bucket={r.bucket} />
      ))}
    </span>
  );
}
