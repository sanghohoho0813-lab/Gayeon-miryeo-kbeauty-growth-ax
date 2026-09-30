"use client";

import { Database } from "lucide-react";
import { useModel } from "@/components/providers/DataProvider";
import { isLive } from "@/lib/config";
import { formatDateKR, formatDateTimeKR } from "@/lib/date";

/* Data Source / Freshness / Health — 과밀하지 않게 1줄 */
export function DataFreshness() {
  const m = useModel();
  const health = m.snapshot.products.length === 0 ? "상품 없음" : m.kpis.salesRowCount === 0 ? "판매 데이터 없음" : "정상";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-surface px-3 py-1.5 text-[0.8rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
      <Database size={14} aria-hidden />
      <span className="font-semibold" style={{ color: isLive ? "var(--success)" : "var(--warning)" }}>{isLive ? "SUPABASE LIVE" : "DEMO DATA"}</span>
      <span>불러옴 {formatDateTimeKR(m.snapshot.loadedAt)}</span>
      <span>· 최근 판매일 {formatDateKR(m.kpis.lastSaleDate)}</span>
      <span>· 상태 {health}</span>
    </span>
  );
}
