"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { DataCard, KpiCard, StatusBadge, type Tone } from "./Cards";
import { EmptyState } from "./States";
import { Modal } from "./Modal";
import { toast } from "./Toast";
import { ExportButton } from "./ExportButton";
import { useData, useModel } from "@/components/providers/DataProvider";
import { formatKRW, formatPrice } from "@/lib/analytics";
import { formatDateKR } from "@/lib/date";
import { outstanding, overdueDays, SETTLEMENT_KIND_LABEL, SETTLEMENT_STATUS_LABEL, statusFor, summarizeReceivables } from "@/lib/settlements";
import type { Settlement, SettlementKind } from "@/lib/types";

/* 정산·미수금 (계약 별지 제1호 ①·③ — 받을 돈, 거래처 정산 상태) */
type Filter = "open" | "overdue" | "paid" | "all";
const FILTERS: [Filter, string][] = [["open", "미수금"], ["overdue", "연체"], ["paid", "완납"], ["all", "전체"]];

export function Settlements() {
  const m = useModel();
  const [filter, setFilter] = useState<Filter>("open");
  const [edit, setEdit] = useState<Settlement | null>(null);
  const [pay, setPay] = useState<Settlement | null>(null);
  const list = m.snapshot.settlements;
  const sum = summarizeReceivables(list, m.today);
  const rows = [...list]
    .filter((s) => filter === "all" || (filter === "open" && outstanding(s) > 0) || (filter === "overdue" && overdueDays(s, m.today) > 0) || (filter === "paid" && s.status === "PAID"))
    .sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"));
  const blank = (): Settlement => ({ id: `new-st-${Date.now()}`, kind: "B2B", counterparty: "", amount: 0, paidAmount: 0, issuedOn: m.today, dueOn: null, status: "OPEN" });

  return (
    <div className="space-y-6">
      <div className="stagger grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
        <KpiCard label="받을 돈 (미수금)" value={sum.outstanding} format={formatKRW} sub={`${sum.openCount}건`} icon={<Wallet size={20} />} />
        <KpiCard label="연체 금액" value={sum.overdueAmount} format={formatKRW} sub={sum.overdueCount ? `${sum.overdueCount}건 · 최장 ${sum.maxOverdueDays}일` : "연체 없음"} iconTone="var(--danger)" />
        <KpiCard label="30일 내 입금 예정" value={sum.dueIn30} format={formatKRW} sub="기한 도래 예정 잔액" />
        <DataCard title="구분별 미수금">
          {sum.byKind.length === 0 ? <p className="text-[0.9rem] text-ink-soft">없음</p> : (
            <ul className="space-y-1 text-[0.9rem]">{sum.byKind.map((k) => <li key={k.kind} className="flex justify-between"><span>{SETTLEMENT_KIND_LABEL[k.kind]}</span><span className="tabular font-semibold">{formatKRW(k.amount)}</span></li>)}</ul>
          )}
        </DataCard>
      </div>

      <DataCard
        title="정산 내역"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton name="정산_미수금" file="settlements" rows={list.map((s) => ({ 구분: SETTLEMENT_KIND_LABEL[s.kind], 거래처: s.counterparty, 내용: s.description ?? "", 청구액: s.amount, 입금액: s.paidAmount, 잔액: outstanding(s), 청구일: s.issuedOn, 입금기한: s.dueOn ?? "", 입금일: s.paidOn ?? "", 상태: SETTLEMENT_STATUS_LABEL[s.status], 연체일수: overdueDays(s, m.today) }))} />
            <button className="btn-primary !min-h-[40px] text-[0.86rem]" onClick={() => setEdit(blank())}><Plus size={15} aria-hidden /> 청구·정산 추가</button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="정산 필터">
          {FILTERS.map(([f, l]) => (
            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} className="pressable min-h-[38px] rounded-xl border px-3 text-[0.86rem] font-semibold" style={filter === f ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>{l}</button>
          ))}
        </div>
        {rows.length === 0 ? <EmptyState title="해당하는 정산 내역이 없습니다" desc="B2B 납품·수출 선적·판매채널 월 정산처럼 받을 돈이 생기면 청구액과 입금 기한을 기록하세요." /> : (
          <div className="table-scroll">
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

      {edit && <SettlementModal value={edit} onClose={() => setEdit(null)} />}
      {pay && <PaymentModal value={pay} onClose={() => setPay(null)} />}
    </div>
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
