"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Wallet, X } from "lucide-react";
import { DataCard, KpiCard, StatusBadge, type Tone } from "./Cards";
import { EmptyState } from "./States";
import { Modal } from "./Modal";
import { toast } from "./Toast";
import { ExportButton } from "./ExportButton";
import { Fold } from "./InfoTip";
import { SettlementImport } from "./SettlementImport";
import { AGING_COLOR } from "./AgingBar";
import { ImportHistory } from "./ImportHistory";
import { useData, useModel } from "@/components/providers/DataProvider";
import { formatKRW, formatPrice } from "@/lib/analytics";
import { formatDateKR } from "@/lib/date";
import { useNarrow } from "@/lib/use-narrow";
import { AGING_LABEL, agingOf, outstanding, overdueDays, receivableAging, receivablesByCounterparty, SETTLEMENT_KIND_LABEL, SETTLEMENT_STATUS_LABEL, statusFor, summarizeReceivables, type AgingBucket } from "@/lib/settlements";
import { matchesQuery } from "@/lib/search";
import type { Settlement, SettlementKind } from "@/lib/types";

/* 정산·미수금 (계약 별지 제1호 ①·③ — 받을 돈, 거래처 정산 상태) */
type Filter = "open" | "overdue" | "paid" | "all";
const FILTERS: [Filter, string][] = [["open", "미수금"], ["overdue", "연체"], ["paid", "완납"], ["all", "전체"]];

export function Settlements() {
  const m = useModel();
  const sp = useSearchParams();
  // 알림·브리핑의 '연체'는 ?filter=overdue 로 열림 (PASS 32, D-108)
  const fParam = sp.get("filter");
  const [filter, setFilterState] = useState<Filter>(() => (FILTERS.some(([f]) => f === fParam) ? (fParam as Filter) : "open"));
  useEffect(() => { if (fParam && FILTERS.some(([f]) => f === fParam)) setFilterState(fParam as Filter); }, [fParam]);
  const [bucket, setBucket] = useState<AgingBucket | null>(null);
  // 빠른 이동에서 거래처를 고르면 ?q=거래처 로 열림 (PASS 31)
  const qParam = sp.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  useEffect(() => { if (qParam) setQ(qParam); }, [qParam]);
  const [edit, setEdit] = useState<Settlement | null>(null);
  const [pay, setPay] = useState<Settlement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();
  const list = m.snapshot.settlements;
  const sum = summarizeReceivables(list, m.today);
  const setFilter = (f: Filter) => { setFilterState(f); setBucket(null); };
  // 연령 막대·거래처를 누르면 아래 목록을 그 조건으로 걸러 보여 줌 (PASS 31)
  const focusList = () => window.setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  const pickBucket = (b: AgingBucket) => { if (bucket === b) { setBucket(null); return; } setFilterState("open"); setBucket(b); focusList(); };
  const pickCounterparty = (name: string) => { setFilterState("open"); setBucket(null); setQ(name); focusList(); };
  const rows = [...list]
    .filter((s) => bucket ? agingOf(s, m.today) === bucket : filter === "all" || (filter === "open" && outstanding(s) > 0) || (filter === "overdue" && overdueDays(s, m.today) > 0) || (filter === "paid" && s.status === "PAID"))
    .filter((s) => matchesQuery(q, s.counterparty, s.description, SETTLEMENT_KIND_LABEL[s.kind]))
    .sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"));
  const blank = (): Settlement => ({ id: `new-st-${Date.now()}`, kind: "B2B", counterparty: "", amount: 0, paidAmount: 0, issuedOn: m.today, dueOn: null, status: "OPEN" });

  return (
    <div className="space-y-6">
      <div className="stagger grid grid-cols-2 gap-3 @md:gap-4 @4xl:grid-cols-4 [&>*:nth-child(3)]:col-span-2 @md:[&>*:nth-child(3)]:col-span-1 [&>*:last-child]:col-span-2 @md:[&>*:last-child]:col-span-1">
        <KpiCard label="받을 돈 (미수금)" value={sum.outstanding} format={formatKRW} sub={`${sum.openCount}건`} icon={<Wallet size={20} />} />
        <KpiCard label="연체 금액" value={sum.overdueAmount} format={formatKRW} sub={sum.overdueCount ? `${sum.overdueCount}건 · 최장 ${sum.maxOverdueDays}일` : "연체 없음"} iconTone="var(--danger)" />
        <KpiCard label="30일 내 입금 예정" value={sum.dueIn30} format={formatKRW} sub="기한 도래 예정 잔액" />
        <DataCard title="구분별 미수금">
          {sum.byKind.length === 0 ? <p className="text-[0.9rem] text-ink-soft">없음</p> : (
            <ul className="space-y-1 text-[0.9rem]">{sum.byKind.map((k) => <li key={k.kind} className="flex justify-between"><span>{SETTLEMENT_KIND_LABEL[k.kind]}</span><span className="tabular font-semibold">{formatKRW(k.amount)}</span></li>)}</ul>
          )}
        </DataCard>
      </div>

      {sum.outstanding > 0 && (
        <div className="grid gap-5 @4xl:grid-cols-2 [&>*]:min-w-0">
          <AgingCard active={bucket} onPick={pickBucket} />
          <CounterpartyCard onPick={pickCounterparty} />
        </div>
      )}

      <div ref={listRef} className="scroll-mt-24">
      <DataCard
        title="정산 내역"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton name="정산_미수금" file="settlements" rows={list.map((s) => ({ 구분: SETTLEMENT_KIND_LABEL[s.kind], 거래처: s.counterparty, 내용: s.description ?? "", 청구액: s.amount, 입금액: s.paidAmount, 잔액: outstanding(s), 청구일: s.issuedOn, 입금기한: s.dueOn ?? "", 입금일: s.paidOn ?? "", 상태: SETTLEMENT_STATUS_LABEL[s.status], 연체일수: overdueDays(s, m.today) }))} />
            <button className="btn-primary !min-h-[40px] text-[0.86rem]" onClick={() => setEdit(blank())}><Plus size={15} aria-hidden /> 청구·정산 추가</button>
          </div>
        }
      >
        <div className="mb-3 flex flex-col gap-2 @xl:flex-row @xl:items-center">
          <div className="chip-rail relative -mx-4 flex gap-1.5 overflow-x-auto px-4 @md:mx-0 @md:px-0" role="radiogroup" aria-label="정산 필터">
            {FILTERS.map(([f, l]) => {
              const on = !bucket && filter === f;
              return <button key={f} role="radio" aria-checked={on} onClick={() => setFilter(f)} className="pressable relative min-h-[38px] shrink-0 whitespace-nowrap rounded-xl border px-3 text-[0.86rem] font-semibold" style={on ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>{l}</button>;
            })}
            {bucket && (
              <button type="button" onClick={() => setBucket(null)} className="pressable relative inline-flex min-h-[38px] shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border px-3 text-[0.86rem] font-semibold" style={{ background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }} data-testid="aging-filter-chip" aria-label={`${AGING_LABEL[bucket]}만 보기 해제`}>
                {AGING_LABEL[bucket]}만 <X size={14} aria-hidden />
              </button>
            )}
          </div>
          <label className="relative min-w-0 @xl:ml-auto @xl:w-64">
            <span className="sr-only">거래처·내용 검색</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input type="search" className="field !min-h-[40px] !pl-9 !pr-9 text-[0.9rem]" placeholder="거래처·내용 검색" value={q} onChange={(e) => setQ(e.target.value)} data-testid="settlement-search" />
            {q && <button type="button" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted" onClick={() => setQ("")} aria-label="검색어 지우기"><X size={15} aria-hidden /></button>}
          </label>
        </div>
        {rows.length === 0 ? (q ? (
          <div className="rounded-xl bg-surface-muted px-4 py-6 text-center text-[0.92rem]" data-testid="settlement-empty-search">
            <p className="font-semibold">&lsquo;{q}&rsquo;에 맞는 정산 내역이 없습니다</p>
            <button type="button" className="btn-secondary mt-3 !min-h-[40px] text-[0.86rem]" onClick={() => setQ("")}>검색 지우기</button>
          </div>
        ) : <EmptyState title="해당하는 정산 내역이 없습니다" desc="B2B 납품·수출 선적·판매채널 월 정산처럼 받을 돈이 생기면 청구액과 입금 기한을 기록하세요." />) : narrow ? (
          <ul className="space-y-2.5" data-testid="settlement-cards">
            {rows.map((s) => {
              const od = overdueDays(s, m.today);
              const o = outstanding(s);
              const tone: Tone = s.status === "PAID" ? "success" : s.status === "CANCELLED" ? "neutral" : od > 0 ? "danger" : s.status === "PARTIAL" ? "warning" : "info";
              return (
                <li key={s.id} className="rounded-xl border p-3" style={{ borderColor: od > 0 ? "color-mix(in srgb, var(--danger) 35%, var(--border))" : "var(--border)" }} data-settlement-card={s.id}>
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{s.counterparty}</span><StatusBadge tone={tone}>{od > 0 ? `연체 ${od}일` : SETTLEMENT_STATUS_LABEL[s.status]}</StatusBadge></div>
                  <p className="mt-0.5 text-[0.8rem] text-ink-soft">{SETTLEMENT_KIND_LABEL[s.kind]}{s.description ? ` · ${s.description}` : ""} · 청구 {formatDateKR(s.issuedOn)}{s.paidAmount > 0 ? ` · 입금 ${formatKRW(s.paidAmount)}` : ""}</p>
                  <dl className="tabular mt-2 grid grid-cols-3 gap-x-2 text-[0.86rem]">
                    <div><dt className="text-[0.74rem] text-ink-soft">잔액</dt><dd className="font-bold">{formatKRW(o)}</dd></div>
                    <div><dt className="text-[0.74rem] text-ink-soft">청구액</dt><dd>{formatKRW(s.amount)}</dd></div>
                    <div><dt className="text-[0.74rem] text-ink-soft">입금 기한</dt><dd>{s.dueOn ? formatDateKR(s.dueOn) : "-"}</dd></div>
                  </dl>
                  <div className="mt-2.5 flex gap-2">
                    {o > 0 && <button className="btn-secondary !min-h-[40px] flex-1 text-[0.86rem]" onClick={() => setPay(s)} aria-label={`${s.counterparty} 입금 기록`}>입금 기록</button>}
                    <button className="btn-ghost !min-h-[40px] flex-1 text-[0.86rem]" onClick={() => setEdit(s)} aria-label={`${s.counterparty} 정산 수정`}>수정</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div tabIndex={0} className="table-scroll">
            <table className="text-[0.9rem]" data-testid="settlement-table">
              <thead>
                <tr className="border-b text-left text-[0.8rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                  {["구분", "거래처 · 내용", "청구액", "입금액", "잔액", "입금 기한", "상태", ""].map((h) => <th key={h} className="py-2.5 pr-4 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const od = overdueDays(s, m.today);
                  const o = outstanding(s);
                  const tone: Tone = s.status === "PAID" ? "success" : s.status === "CANCELLED" ? "neutral" : od > 0 ? "danger" : s.status === "PARTIAL" ? "warning" : "info";
                  return (
                    <tr key={s.id} className="row-hover border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3 pr-4 text-ink-soft">{SETTLEMENT_KIND_LABEL[s.kind]}</td>
                      <td className="py-3 pr-4"><span className="block font-semibold">{s.counterparty}</span><span className="text-[0.8rem] text-ink-soft">{s.description ?? ""} · 청구 {formatDateKR(s.issuedOn)}</span></td>
                      <td className="tabular py-3 pr-4">{formatPrice(s.amount)}</td>
                      <td className="tabular py-3 pr-4 text-ink-soft">{formatPrice(s.paidAmount)}</td>
                      <td className="tabular py-3 pr-4 font-bold">{formatPrice(o)}</td>
                      <td className="py-3 pr-4">{s.dueOn ? formatDateKR(s.dueOn) : "-"}</td>
                      <td className="py-3 pr-4"><StatusBadge tone={tone}>{od > 0 ? `연체 ${od}일` : SETTLEMENT_STATUS_LABEL[s.status]}</StatusBadge></td>
                      <td className="whitespace-nowrap py-3 text-right">
                        {o > 0 && <button className="btn-secondary !min-h-[34px] !px-2.5 text-[0.82rem]" onClick={() => setPay(s)}>입금 기록</button>}
                        <button className="btn-ghost ml-1 !min-h-[34px] !px-2 text-[0.82rem]" onClick={() => setEdit(s)}>수정</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[0.8rem] text-ink-soft">연체된 받을 돈은 AI Growth Center에 &lsquo;연체 미수금 회수&rsquo; Action으로 올라갑니다. 금액은 입력한 청구·입금 기록 기준입니다.</p>
      </DataCard>
      </div>

      {/* 청구·입금 현황 파일로 한 번에 (PASS 27, D-087) — 정산 내역이 없을 때는 펼쳐 둔다 */}
      <Fold summary="청구·입금 현황을 파일로 한 번에 가져오기 (엑셀·CSV)" defaultOpen={list.length === 0} testId="settlement-import-fold">
        <SettlementImport />
        <ImportHistory kind="settlements" className="mt-4" />
      </Fold>

      {edit && <SettlementModal value={edit} onClose={() => setEdit(null)} />}
      {pay && <PaymentModal value={pay} onClose={() => setPay(null)} />}
    </div>
  );
}

/* 받을 돈 연령 (PASS 31, D-099) — 입금 기한을 얼마나 넘겼는지 구간별 잔액. 막대·구간을 누르면 아래 목록이 그 구간만 */
function AgingCard({ active, onPick }: { active: AgingBucket | null; onPick: (b: AgingBucket) => void }) {
  const m = useModel();
  const rows = receivableAging(m.snapshot.settlements, m.today);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const overdue = total - rows[0].amount;
  return (
    <DataCard title="받을 돈 연령" info="남은 잔액을 입금 기한 기준으로 나눴습니다. 기한이 없거나 아직 지나지 않은 청구는 '기한 전'입니다. 구간을 누르면 아래 정산 내역이 그 구간만 보입니다." testId="aging-card">
      <p className="text-[0.88rem] text-ink-soft">받을 돈 <b className="tabular text-ink">{formatKRW(total)}</b> 중 기한을 넘긴 돈 <b className="tabular" style={{ color: overdue > 0 ? "var(--danger)" : "var(--success)" }}>{formatKRW(overdue)}</b>{total > 0 ? ` (${Math.round((overdue / total) * 100)}%)` : ""}</p>
      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`받을 돈 연령: ${rows.map((r) => `${AGING_LABEL[r.bucket]} ${formatKRW(r.amount)}`).join(", ")}`} data-testid="aging-bar">
        {rows.filter((r) => r.amount > 0).map((r) => (
          <span key={r.bucket} className="h-full border-r-2 last:border-r-0" style={{ width: `${Math.max(2, (r.amount / total) * 100)}%`, background: AGING_COLOR[r.bucket], borderColor: "var(--surface)", opacity: active && active !== r.bucket ? 0.35 : 1 }} data-bucket={r.bucket} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((r) => {
          const on = active === r.bucket;
          return (
            <li key={r.bucket}>
              <button type="button" disabled={r.count === 0} aria-pressed={on} onClick={() => onPick(r.bucket)} data-aging={r.bucket}
                className="pressable flex w-full flex-col items-start rounded-xl border px-3 py-2 text-left disabled:opacity-50"
                style={{ borderColor: on ? AGING_COLOR[r.bucket] : "var(--border)", background: on ? "var(--surface-muted)" : "var(--surface)", boxShadow: on ? `inset 0 0 0 1px ${AGING_COLOR[r.bucket]}` : undefined }}>
                <span className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink-soft"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: AGING_COLOR[r.bucket] }} aria-hidden />{AGING_LABEL[r.bucket]}</span>
                <span className="tabular mt-0.5 text-[1rem] font-bold">{formatKRW(r.amount)}</span>
                <span className="tabular text-[0.76rem] text-ink-soft">{r.count}건</span>
              </button>
            </li>
          );
        })}
      </ul>
    </DataCard>
  );
}

/* 거래처별 받을 돈 — 같은 이름은 한 거래처로 합침. 누르면 아래 목록에서 그 거래처만 */
function CounterpartyCard({ onPick }: { onPick: (name: string) => void }) {
  const m = useModel();
  const all = receivablesByCounterparty(m.snapshot.settlements, m.today);
  const top = all.slice(0, 5);
  const max = top[0]?.amount ?? 1;
  return (
    <DataCard title="거래처별 받을 돈" info="같은 거래처 이름의 남은 잔액을 합쳤습니다. 이름을 누르면 아래 정산 내역에서 그 거래처만 보입니다." testId="counterparty-card">
      <ul className="space-y-1.5">
        {top.map((c) => (
          <li key={c.counterparty}>
            <button type="button" onClick={() => onPick(c.counterparty)} className="row-hover w-full rounded-xl px-2.5 py-2 text-left" data-counterparty={c.counterparty}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-semibold">{c.counterparty}</span>
                <span className="tabular shrink-0 font-bold">{formatKRW(c.amount)}</span>
              </span>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(3, (c.amount / max) * 100)}%`, background: c.overdueAmount > 0 ? "var(--danger)" : "var(--chart-1)" }} />
              </span>
              <span className="tabular mt-1 block text-[0.78rem]" style={{ color: c.overdueAmount > 0 ? "var(--danger)" : "var(--text-secondary)" }}>
                {c.count}건{c.overdueAmount > 0 ? ` · 연체 ${formatKRW(c.overdueAmount)} (최장 ${c.maxOverdueDays}일)` : " · 연체 없음"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {all.length > top.length && <p className="mt-2 px-2.5 text-[0.8rem] text-ink-soft">그 외 {all.length - top.length}곳 · {formatKRW(all.slice(5).reduce((a, c) => a + c.amount, 0))}</p>}
    </DataCard>
  );
}

function SettlementModal({ value, onClose }: { value: Settlement; onClose: () => void }) {
  const m = useModel();
  const { run } = useData();
  const [s, setS] = useState<Settlement>(value);
  const isNew = value.id.startsWith("new-");
  const options = s.kind === "B2B" ? m.snapshot.b2b.map((b) => ({ id: b.id, name: b.name })) : s.kind === "CHANNEL" ? m.snapshot.channels.map((c) => ({ id: c.id, name: c.name })) : [];
  const errors = [!s.counterparty.trim() && "거래처 필수", !(s.amount > 0) && "청구액 필수", s.paidAmount > s.amount && "입금액이 청구액보다 큼", s.dueOn && s.dueOn < s.issuedOn && "기한이 청구일보다 빠름"].filter(Boolean) as string[];
  return (
    <Modal open onClose={onClose} title={isNew ? "청구·정산 추가" : `정산 수정 — ${value.counterparty}`} maxWidth="max-w-xl">
      <div className="grid gap-3 @xl:grid-cols-2">
        <div><label className="field-label" htmlFor="st-kind">구분</label><select id="st-kind" className="field" value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value as SettlementKind, refId: null })}>{(Object.keys(SETTLEMENT_KIND_LABEL) as SettlementKind[]).map((k) => <option key={k} value={k}>{SETTLEMENT_KIND_LABEL[k]}</option>)}</select></div>
        <div>
          <label className="field-label" htmlFor="st-cp">거래처·채널</label>
          <input id="st-cp" list="st-cp-list" className="field" value={s.counterparty} onChange={(e) => { const hit = options.find((o) => o.name === e.target.value); setS({ ...s, counterparty: e.target.value, refId: hit?.id ?? null }); }} />
          <datalist id="st-cp-list">{options.map((o) => <option key={o.id} value={o.name} />)}</datalist>
        </div>
        <div className="@xl:col-span-2"><label className="field-label" htmlFor="st-desc">내용 (선택)</label><input id="st-desc" className="field" placeholder="예: 9월 납품분" value={s.description ?? ""} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="st-amount">청구액 (원)</label><input id="st-amount" className="field tabular" inputMode="numeric" value={s.amount || ""} onChange={(e) => setS({ ...s, amount: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })} /></div>
        <div><label className="field-label" htmlFor="st-paid">입금액 (원)</label><input id="st-paid" className="field tabular" inputMode="numeric" value={s.paidAmount || ""} onChange={(e) => setS({ ...s, paidAmount: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })} /></div>
        <div><label className="field-label" htmlFor="st-issued">청구일</label><input id="st-issued" type="date" className="field" value={s.issuedOn} onChange={(e) => setS({ ...s, issuedOn: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="st-due">입금 기한</label><input id="st-due" type="date" className="field" value={s.dueOn ?? ""} onChange={(e) => setS({ ...s, dueOn: e.target.value || null })} /></div>
        <label className="flex items-center gap-2 text-[0.9rem] @xl:col-span-2"><input type="checkbox" className="h-4 w-4" checked={s.status === "CANCELLED"} onChange={(e) => setS({ ...s, status: e.target.checked ? "CANCELLED" : "OPEN" })} /> 청구 취소 (미수금에서 제외)</label>
      </div>
      {errors.length > 0 && <p className="mt-2 text-[0.85rem]" style={{ color: "var(--danger)" }}>{errors.join(" · ")}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" disabled={errors.length > 0} onClick={async () => {
          const next = { ...s, counterparty: s.counterparty.trim(), description: s.description?.trim() || null };
          next.status = statusFor(next);
          try { await run((src) => src.upsertSettlement(next)); toast("정산 내역을 저장했습니다"); onClose(); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
        }}>저장</button>
      </div>
    </Modal>
  );
}

function PaymentModal({ value, onClose }: { value: Settlement; onClose: () => void }) {
  const m = useModel();
  const { run } = useData();
  const remain = outstanding(value);
  const [amount, setAmount] = useState(String(remain));
  const [date, setDate] = useState(m.today);
  const n = Number(amount.replace(/[^0-9]/g, ""));
  const ok = n > 0 && n <= remain && date <= m.today;
  return (
    <Modal open onClose={onClose} title={`입금 기록 — ${value.counterparty}`}>
      <p className="text-[0.9rem] text-ink-soft">잔액 {formatPrice(remain)} (청구 {formatPrice(value.amount)} · 기입금 {formatPrice(value.paidAmount)})</p>
      <div className="mt-3 grid gap-3 @xl:grid-cols-2">
        <div><label className="field-label" htmlFor="pay-amount">이번 입금액 (원)</label><input id="pay-amount" className="field tabular" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label className="field-label" htmlFor="pay-date">입금일</label><input id="pay-date" type="date" max={m.today} className="field" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      {!ok && <p className="mt-2 text-[0.85rem]" style={{ color: "var(--danger)" }}>입금액은 0보다 크고 잔액 이하여야 합니다.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" disabled={!ok} onClick={async () => {
          const next = { ...value, paidAmount: value.paidAmount + n, paidOn: date };
          next.status = statusFor(next);
          try { await run((src) => src.upsertSettlement(next)); toast(next.status === "PAID" ? "완납 처리했습니다" : "부분 입금을 기록했습니다"); onClose(); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
        }}>입금 기록</button>
      </div>
    </Modal>
  );
}
