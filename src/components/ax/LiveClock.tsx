"use client";

import { useEffect, useState } from "react";
import { TIME_ZONE } from "@/lib/date";

/* 실시간 날짜·요일·시각 (초 단위) — 하드코딩 금지 (v4.1 §11) */
export function LiveClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="tabular inline-block w-[10ch]" aria-hidden />;
  const date = new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, ...(compact ? { month: "2-digit", day: "2-digit" } : { year: "numeric", month: "2-digit", day: "2-digit" }), weekday: "short" }).format(now);
  const time = new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  return (
    <span className="tabular inline-flex flex-col leading-tight" aria-label={`현재 ${date} ${time}`}>
      <span className="text-[0.78rem] text-ink-soft">{date}</span>
      <span className="text-[0.95rem] font-semibold">{time}</span>
    </span>
  );
}
