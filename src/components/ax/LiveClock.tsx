"use client";

import { useEffect, useState } from "react";
import { TIME_ZONE } from "@/lib/date";

/* 실시간 날짜·요일·시각 (초 단위) — 하드코딩 금지 (v4.1 §11) */
// 매초 새로 만들지 않도록 한 번만 (PASS 29)
const DATE_COMPACT = new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, month: "2-digit", day: "2-digit", weekday: "short" });
const DATE_FULL = new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
const TIME = new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** onDark: 어두운 서랍 안 — 날짜를 흐린 회색 대신 둘레 글자색으로 (대비 4.5:1 이상, PASS 29) */
export function LiveClock({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="tabular inline-block w-[10ch]" aria-hidden />;
  const date = (compact ? DATE_COMPACT : DATE_FULL).format(now);
  const time = TIME.format(now);
  return (
    <span className="tabular inline-flex flex-col leading-tight" aria-label={`현재 ${date} ${time}`}>
      <span className={`whitespace-nowrap text-[0.78rem] ${onDark ? "opacity-90" : "text-ink-soft"}`}>{date}</span>
      <span className="whitespace-nowrap text-[0.95rem] font-semibold">{time}</span>
    </span>
  );
}
