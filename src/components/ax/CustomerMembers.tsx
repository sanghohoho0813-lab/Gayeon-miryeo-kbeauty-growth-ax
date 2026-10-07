"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { EmptyState } from "./States";
import { Modal } from "./Modal";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { daysBetween, formatDateKR } from "@/lib/date";
import { dDayLabel, repurchaseDue, repurchaseSchedule } from "@/lib/repurchase";
import type { CustomerAccount } from "@/lib/types";

/** 개인정보 최소 노출: 이메일 앞 2자만 */
export function maskEmail(email?: string | null): string {
  if (!email) return "-";
  const [id, domain] = email.split("@");
  return `${id.slice(0, 2)}${"*".repeat(Math.max(2, id.length - 2))}@${domain ?? ""}`;
}
const label = (a?: CustomerAccount) => (a ? a.displayName || maskEmail(a.email) : "탈퇴 회원");

/* 고객 회원·구매기록·재구매 (계약 별지 제1호 ⑥) — 대표·관리자 전용 */
export function CustomerMembers() {
  const m = useModel();
  const { role } = useSession();
  const [target, setTarget] = useState<CustomerAccount | null>(null);
  const accounts = m.snapshot.customerAccounts;
  const purchases = m.snapshot.customerPurchases;
  const byId = useMemo(() => new Map(accounts.map((a) => [a.userId, a])), [accounts]);
  const schedule = useMemo(() => repurchaseSchedule(purchases, m.productById, m.today), [purchases, m.productById, m.today]);
  const due = repurchaseDue(schedule);

  if (!can(role, "view_customers")) {
    return <DataCard id="members" className="mt-6" title="회원 · 재구매"><p className="text-[0.92rem] text-ink-soft">고객 회원 정보는 개인정보 보호를 위해 대표·관리자만 열람합니다.</p></DataCard>;
  }
  const recent30 = accounts.filter((a) => daysBetween(a.createdAt.slice(0, 10), m.today) <= 30).length;
  const consent = accounts.filter((a) => a.marketingConsent).length;
  const purchaseCount = new Map<string, number>();
  for (const p of purchases) purchaseCount.set(p.customerUserId, (purchaseCount.get(p.customerUserId) ?? 0) + 1);

  return (
    <DataCard id="members" className="mt-6" title="회원 · 구매 기록 · 재구매" action={<StatusBadge tone="neutral">개인정보 · 대표/관리자 전용</StatusBadge>}>
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-5">
        {[
          ["회원", `${accounts.length}명`],
          ["최근 30일 가입", `${recent30}명`],
          ["안내 수신 동의", `${consent}명${accounts.length ? ` (${Math.round((consent / accounts.length) * 100)}%)` : ""}`],
          ["구매 기록", `${purchases.length}건`],
          ["재구매 안내 대상", `${new Set(due.map((d) => d.purchase.customerUserId)).size}명`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-muted px-3.5 py-3"><div className="text-[0.78rem] text-ink-soft">{k}</div><div className="tabular text-[1.2rem] font-bold">{v}</div></div>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="mt-4"><EmptyState title="아직 가입한 회원이 없습니다" desc="고객 화면(MIRYEO AI Beauty)에서 회원가입하면 이곳에 표시됩니다. 실제 가입 전 개인정보 처리방침 확정이 필요합니다." /></div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 @4xl:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 font-bold">재구매 안내 대상 (예상일 7일 이내 ~ 14일 경과)</h3>
            {due.length === 0 ? <p className="rounded-xl bg-surface-muted p-3 text-[0.9rem] text-ink-soft">대상이 없습니다.</p> : (
              <ul className="space-y-1.5" data-testid="repurchase-due">
                {due.map((d) => {
                  const a = byId.get(d.purchase.customerUserId);
                  return (
                    <li key={d.purchase.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[0.88rem]" style={{ borderColor: "var(--border)" }}>
                      <span className="min-w-0"><span className="block truncate font-semibold">{label(a)} · {d.product.name}</span><span className="text-ink-soft">구매 {formatDateKR(d.purchase.purchasedOn)} · 예상 {formatDateKR(d.expectedOn)}{d.estimated ? " (추정)" : ""}</span></span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="tabular font-bold">{dDayLabel(d.daysLeft)}</span>
                        <StatusBadge tone={a?.marketingConsent ? "success" : "neutral"}>{a?.marketingConsent ? "안내 가능" : "수신 미동의"}</StatusBadge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-[0.78rem] text-ink-soft">수신 미동의 회원에게는 광고성 안내를 보내지 않습니다. 사용기간 미입력 제품은 종류별 추정값입니다 (상품 등록에서 입력).</p>
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 font-bold">회원 목록 (최근 가입순)</h3>
            <div tabIndex={0} className="table-scroll max-h-[340px] overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <table className="!min-w-0 w-full text-[0.86rem]">
                <thead><tr className="bg-surface-muted text-left"><th className="px-3 py-2">회원</th><th className="px-3 py-2">가입</th><th className="px-3 py-2">구매</th><th className="px-3 py-2"><span className="sr-only">작업</span></th></tr></thead>
                <tbody>
                  {[...accounts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((a) => (
                    <tr key={a.userId} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-2"><span className="block font-semibold">{a.displayName || "-"}</span><span className="text-ink-soft">{maskEmail(a.email)}{a.skinConcerns.length ? ` · ${a.skinConcerns.join("·")}` : ""}</span></td>
                      <td className="px-3 py-2 text-ink-soft">{formatDateKR(a.createdAt)}</td>
                      <td className="tabular px-3 py-2">{purchaseCount.get(a.userId) ?? 0}건</td>
                      <td className="px-3 py-2 text-right"><button className="btn-ghost !min-h-[34px] !px-2 text-[0.82rem]" aria-label={`${label(a)} 구매 기록 추가`} onClick={() => setTarget(a)}><Plus size={14} aria-hidden /> 구매</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {target && <StaffPurchaseModal account={target} onClose={() => setTarget(null)} />}
    </DataCard>
  );
}

function StaffPurchaseModal({ account, onClose }: { account: CustomerAccount; onClose: () => void }) {
  const m = useModel();
  const { run } = useData();
  const [v, setV] = useState({ productId: m.snapshot.products[0]?.id ?? "", purchasedOn: m.today, quantity: "1", channelLabel: "", note: "" });
  const q = Number(v.quantity);
  const ok = !!v.productId && Number.isInteger(q) && q >= 1 && q <= 99 && v.purchasedOn <= m.today;
  return (
    <Modal open onClose={onClose} title={`구매 기록 추가 — ${label(account)}`}>
      <p className="mb-3 text-[0.88rem] text-ink-soft">매장·전화·B2C 채널 등에서 확인된 구매만 입력합니다. 고객 마이페이지에 &lsquo;매장·운영자 기록&rsquo;으로 표시됩니다.</p>
      <div className="grid gap-3 @xl:grid-cols-2">
        <div className="@xl:col-span-2"><label className="field-label" htmlFor="sp-prod">제품</label><select id="sp-prod" className="field" value={v.productId} onChange={(e) => setV({ ...v, productId: e.target.value })}>{m.snapshot.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="field-label" htmlFor="sp-date">구매일</label><input id="sp-date" type="date" max={m.today} className="field" value={v.purchasedOn} onChange={(e) => setV({ ...v, purchasedOn: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="sp-qty">수량</label><input id="sp-qty" inputMode="numeric" className="field tabular" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="sp-ch">구매처 (선택)</label><input id="sp-ch" className="field" value={v.channelLabel} onChange={(e) => setV({ ...v, channelLabel: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="sp-note">메모 (선택)</label><input id="sp-note" className="field" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" disabled={!ok} onClick={async () => {
          try { await run((s) => s.addStaffPurchase({ customerUserId: account.userId, productId: v.productId, quantity: q, purchasedOn: v.purchasedOn, channelLabel: v.channelLabel.trim() || null, note: v.note.trim() || null })); toast("구매 기록을 추가했습니다"); onClose(); }
          catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
        }}>저장</button>
      </div>
    </Modal>
  );
}
