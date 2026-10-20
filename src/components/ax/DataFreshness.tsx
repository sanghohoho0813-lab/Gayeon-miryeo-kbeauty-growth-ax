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
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border bg-surface px-2.5 py-1.5 text-[0.78rem] text-ink-soft @md:gap-x-2 @md:px-3 @md:text-[0.8rem]" style={{ borderColor: "var(--border)" }} data-testid="data-freshness">
      <Database size={14} className="hidden @md:block" aria-hidden />
      <span className="font-semibold" style={{ color: isLive ? "var(--success)" : "var(--warning)" }}>{isLive ? "SUPABASE LIVE" : m.snapshot.practice ? "DEMO · 샘플 연습" : "DEMO DATA"}</span>
      {/* 모바일은 한 줄로: 불러온 시각은 숨기고 최근 판매일(연도 생략)·상태만 — 옆 배지와 한 줄에 들어가게 (PASS 31) */}
      <span className="hidden @md:inline">불러옴 {formatDateTimeKR(m.snapshot.loadedAt)}</span>
      <span className="whitespace-nowrap"><span className="hidden @md:inline">· 최근 판매일 </span><span className="@md:hidden">· 판매 </span>{m.kpis.lastSaleDate ? <><span className="hidden @md:inline">{formatDateKR(m.kpis.lastSaleDate).slice(0, 5)}</span>{formatDateKR(m.kpis.lastSaleDate).slice(5)}</> : "-"}</span>
      <span className="whitespace-nowrap">· {health === "정상" ? "정상" : `상태 ${health}`}</span>
    </span>
  );
}
