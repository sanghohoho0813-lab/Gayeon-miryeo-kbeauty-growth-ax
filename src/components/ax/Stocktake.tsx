"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Drawer } from "./Modal";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { daysBetween } from "@/lib/date";
import { matchesQuery } from "@/lib/search";
import { ROUTINE_RULES } from "@/lib/weekly-routine";
import type { Inventory } from "@/lib/types";

/* 재고 한 번에 입력 (PASS 36, D-133) — 주간 운영 점검 '재고 갱신'(모든 상품 재고를 7일 안에 확인)을 한 화면에서.
   상품마다 현재 재고만 고친다(안전 재고·입고 예정은 상품별 '재고 수정'). 저장은 두 가지:
   · 바뀐 것만 저장 — 고친 상품만 기록 (확인 날짜도 그 상품만 바뀜)
   · 모두 확인으로 저장 — 값이 같아도 '오늘 확인함'으로 기록 → 주간 점검 '재고 갱신'이 채워짐
   실제로 세지 않은 상품까지 확인으로 남기지 않도록 두 버튼을 나눴다. */

const parse = (s: string) => { const t = s.replace(/[,\s개]/g, ""); const n = Number(t); return t !== "" && Number.isInteger(n) && n >= 0 && n <= 100_000_000 ? n : null; };

export function StocktakeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useModel();
  const { run } = useData();
  const rows = useMemo(() => m.snapshot.products
    .map((p) => ({ p, inv: m.snapshot.inventory.find((i) => i.productId === p.id) }))
    .sort((a, b) => a.p.name.localeCompare(b.p.name, "ko")), [m.snapshot.products, m.snapshot.inventory]);
  const initial = useMemo(() => Object.fromEntries(rows.map(({ p, inv }) => [p.id, inv ? String(inv.currentStock) : ""])), [rows]);
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Map<string, HTMLInputElement>>(new Map());

  const changed = rows.filter(({ p }) => vals[p.id] !== initial[p.id]);
  const invalid = rows.filter(({ p }) => vals[p.id] !== "" && parse(vals[p.id]) == null);
  const blank = rows.filter(({ p }) => vals[p.id] === "");
  const stale = rows.filter(({ inv }) => !inv?.updatedAt || daysBetween(inv.updatedAt, m.today) > ROUTINE_RULES.inventoryDays).length;
  const shown = rows.filter(({ p }) => matchesQuery(q, p.name, p.sku, p.category));

  const save = async (mode: "changed" | "all") => {
    const target = (mode === "all" ? rows : changed).filter(({ p }) => parse(vals[p.id]) != null);
    if (!target.length || invalid.length) return;
    setBusy(true);
    const res = await run(async (s) => {
      let saved = 0;
      for (const { p, inv } of target) {
        const next: Inventory = { productId: p.id, currentStock: parse(vals[p.id])!, safetyStock: inv?.safetyStock ?? 0, incomingStock: inv?.incomingStock ?? 0, incomingDate: inv?.incomingDate ?? null };
        try { await s.upsertInventory(next); saved++; } catch (e) { return { saved, error: e instanceof Error ? e.message : "저장 실패" }; }
      }
      return { saved, error: null as string | null };
    }).catch((e: unknown) => ({ saved: 0, error: e instanceof Error ? e.message : "저장 실패" }));
    setBusy(false);
    if (res.error) { toast(`${res.saved}개 저장 후 멈췄습니다 — ${res.error}`, "error"); return; }
    toast(mode === "all" ? `재고 ${res.saved}개를 오늘 확인으로 저장했습니다${changed.length ? ` (바뀐 ${changed.length}개)` : ""}` : `바뀐 재고 ${res.saved}개를 저장했습니다`);
    onClose();
  };

  const focusNext = (id: string) => {
    const ids = shown.map(({ p }) => p.id);
    const next = ids[ids.indexOf(id) + 1];
    if (next) inputs.current.get(next)?.focus();
    else (document.querySelector('[data-testid="stocktake-save-changed"]') as HTMLElement | null)?.focus();
  };

  const allCount = rows.length - blank.length;
  return (
    <Drawer open={open} onClose={onClose} title="재고 한 번에 입력" dirty={changed.length > 0}
      toolbar={
        <div className="space-y-2" data-testid="stocktake-toolbar">
          <p className="text-[0.84rem] text-ink-soft">지금 센 <b className="text-ink">현재 재고</b>를 넣으세요. 안전 재고·입고 예정은 상품별 &lsquo;재고 수정&rsquo;에서 고칩니다.</p>
          <p className="tabular text-[0.84rem]" data-testid="stocktake-summary">
            상품 {rows.length}개 · 바뀐 <b>{changed.length}</b>개 · {ROUTINE_RULES.inventoryDays}일 넘게 확인 안 함 <b style={stale ? { color: "var(--warning)" } : undefined}>{stale}</b>개
          </p>
          {rows.length > 8 && (
            <label className="relative block">
              <span className="sr-only">상품 찾기</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
              <input type="search" className="field !min-h-[40px] !pl-9 !pr-9 text-[0.9rem]" placeholder="이름·코드로 찾기 (초성 가능)" value={q} onChange={(e) => setQ(e.target.value)} data-testid="stocktake-search" />
              {q && <button type="button" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft" onClick={() => setQ("")} aria-label="검색어 지우기"><X size={15} aria-hidden /></button>}
            </label>
          )}
        </div>
      }
      footer={
        <div className="flex flex-col gap-2 @md:flex-row" data-testid="stocktake-actions">
          <button type="button" className="btn-primary" disabled={busy || invalid.length > 0 || allCount === 0} onClick={() => void save("all")} data-testid="stocktake-save-all">
            모두 확인으로 저장 <span className="tabular">({allCount}개)</span>
          </button>
          <button type="button" className="btn-secondary" disabled={busy || invalid.length > 0 || changed.length === 0} onClick={() => void save("changed")} data-testid="stocktake-save-changed">
            바뀐 것만 저장 <span className="tabular">({changed.length}개)</span>
          </button>
          {invalid.length > 0 && <p className="text-[0.82rem] font-semibold @md:self-center" style={{ color: "var(--danger)" }} role="alert">0 이상의 정수로 고쳐 주세요 ({invalid.length}개)</p>}
        </div>
      }>
      <ul className="space-y-1.5" data-testid="stocktake-list">
        {shown.map(({ p, inv }) => {
          const v = vals[p.id];
          const n = parse(v);
          const bad = v !== "" && n == null;
          const diff = n != null && inv ? n - inv.currentStock : null;
          const age = inv?.updatedAt ? daysBetween(inv.updatedAt, m.today) : null;
          const id = `st-${p.id}`;
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: bad ? "var(--danger)" : vals[p.id] !== initial[p.id] ? "var(--primary)" : "var(--border)" }} data-stocktake={p.sku}>
              <label htmlFor={id} className="min-w-0">
                <span className="block truncate font-semibold leading-snug">{p.name}</span>
                <span className="tabular block text-[0.76rem] text-ink-soft">
                  {inv ? `지난 값 ${inv.currentStock.toLocaleString()}개` : "재고 기록 없음"}
                  {age != null && <span style={age > ROUTINE_RULES.inventoryDays ? { color: "var(--warning)" } : undefined}> · {age === 0 ? "오늘 확인" : `${age}일 전 확인`}</span>}
                </span>
              </label>
              <span className="flex shrink-0 items-center gap-2">
                {diff != null && diff !== 0 && <span className="tabular text-[0.8rem] font-bold" style={{ color: diff > 0 ? "var(--success)" : "var(--danger)" }} data-diff={diff}>{diff > 0 ? "+" : "−"}{Math.abs(diff).toLocaleString()}</span>}
                <input id={id} ref={(el) => { if (el) inputs.current.set(p.id, el); else inputs.current.delete(p.id); }}
                  className="field tabular !min-h-[42px] w-[6.5rem] text-right" inputMode="numeric" enterKeyHint="next" autoComplete="off"
                  aria-invalid={bad} aria-describedby={bad ? `${id}-err` : undefined} value={v}
                  onChange={(e) => setVals({ ...vals, [p.id]: e.target.value })}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusNext(p.id); } }} />
                {bad && <span id={`${id}-err`} className="sr-only">0 이상의 정수가 아닙니다</span>}
              </span>
            </li>
          );
        })}
        {shown.length === 0 && <li className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[0.9rem]">&lsquo;{q}&rsquo;에 맞는 상품이 없습니다</li>}
      </ul>
    </Drawer>
  );
}
