"use client";

/* 순위 막대 목록 — 항목 이름이 긴 비교(채널·거래처)는 차트 축 라벨이 겹치므로 HTML 막대로 그린다 (PASS 14).
   큰 값부터 정렬, 막대 = 이번 기간, 세로선 = 이전 기간, 오른쪽에 값과 증감. 모바일은 이름·값 한 줄 + 막대 한 줄. */
export interface RankItem {
  id: string;
  label: string;
  value: number;
  prev?: number | null;
  valueText: string;
  change?: number | null;
}

export function RankBars({ items, label, prevLabel = "이전 4주", color = "var(--chart-2)" }: { items: RankItem[]; label: string; prevLabel?: string; color?: string }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(0, ...sorted.map((x) => Math.max(x.value, x.prev ?? 0)));
  const pct = (v: number) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);
  const hasPrev = sorted.some((x) => x.prev != null && x.prev > 0);
  const changeText = (c: number) => `${c >= 0 ? "+" : ""}${Math.round(c * 1000) / 10}%`;
  return (
    <div>
      <ol className="space-y-3.5" aria-label={label} data-testid="rank-bars">
        {sorted.map((it) => (
          <li key={it.id} data-rank={it.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 @md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,10rem)]">
            <span className="min-w-0 text-[0.9rem] font-semibold leading-snug [overflow-wrap:anywhere] @md:order-1 @md:truncate" title={it.label}>{it.label}</span>
            <span className="tabular whitespace-nowrap text-right text-[0.88rem] @md:order-3">
              <b className="font-semibold">{it.valueText}</b>
              {it.change != null && (
                <span className="ml-2 font-semibold" style={{ color: it.change >= 0 ? "var(--success)" : "var(--danger)" }}>
                  <span className="sr-only">{prevLabel} 대비 </span>{changeText(it.change)}
                </span>
              )}
            </span>
            <span className="relative col-span-2 h-[18px] rounded-[4px] bg-surface-muted @md:order-2 @md:col-span-1" aria-hidden>
              <span className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${pct(it.value)}%`, background: color }} />
              {it.prev != null && it.prev > 0 && <span className="absolute -inset-y-[3px] w-[2px] rounded-full" style={{ left: `calc(${pct(it.prev)}% - 1px)`, background: "var(--text-primary)" }} />}
            </span>
          </li>
        ))}
      </ol>
      {hasPrev && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-ink-soft" aria-hidden>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-[3px]" style={{ background: color }} /> 최근 4주</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3.5 w-[2px] rounded-full" style={{ background: "var(--text-primary)" }} /> {prevLabel}</span>
        </p>
      )}
    </div>
  );
}
