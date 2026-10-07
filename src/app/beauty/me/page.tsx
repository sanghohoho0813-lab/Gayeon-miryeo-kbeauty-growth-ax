"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, History, LogOut, Plus, ShoppingBag, Sparkles, Trash2, UserRound } from "lucide-react";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { useCustomerSession } from "@/components/beauty/CustomerSession";
import { ConcernPicker, ConsentSummary } from "@/components/beauty/AccountParts";
import { customerApi } from "@/lib/customer-account";
import { dDayLabel, repurchaseSchedule } from "@/lib/repurchase";
import { formatDateKR, todayISO } from "@/lib/date";
import type { CustomerPurchase, SavedRecommendation, SkinConcern } from "@/lib/types";

/* 마이페이지 — 추천 기록 · 구매 기록 · 재구매 예상 시점 · 계정 (계약 별지 제1호 ⑥) */
export default function MyPage() {
  const router = useRouter();
  const { status, session, refresh } = useCustomerSession();
  const { products } = useBeautyData();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [recs, setRecs] = useState<SavedRecommendation[]>([]);
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);
  const [msg, setMsg] = useState<string>();
  const [err, setErr] = useState<string>();
  const member = !!session?.account && !session.operator;

  const load = useCallback(async () => {
    if (!member) return;
    try {
      const [r, p] = await Promise.all([customerApi().listMyRecommendations(), customerApi().listMyPurchases()]);
      setRecs(r);
      setPurchases(p);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [member]);
  useEffect(() => { void load(); }, [load, session]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setErr(undefined);
    try { await fn(); setMsg(ok); await load(); await refresh(); } catch (e) { setErr(e instanceof Error ? e.message : "실패했습니다"); }
  };

  if (status === "loading") return <Shell><p style={{ color: "var(--b-text-soft)" }}>불러오는 중…</p></Shell>;
  if (!session) {
    return (
      <Shell>
        <div className="rounded-3xl border bg-white p-8 text-center" style={{ borderColor: "var(--b-border)" }}>
          <UserRound size={36} className="mx-auto" style={{ color: "var(--b-gold-ink)" }} aria-hidden />
          <h1 className="mt-3 text-[1.4rem] font-bold">로그인하고 나만의 뷰티 기록을 보관하세요</h1>
          <p className="mt-2 text-[0.95rem]" style={{ color: "var(--b-text-soft)" }}>추천 기록, 구매 기록, 재구매 예상 시점을 한곳에서 확인할 수 있습니다.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/beauty/login" className="inline-flex min-h-[48px] items-center rounded-2xl px-6 font-bold text-white" style={{ background: "var(--b-navy)" }}>로그인</Link>
            <Link href="/beauty/login?mode=signup" className="inline-flex min-h-[48px] items-center rounded-2xl border px-6 font-bold" style={{ borderColor: "var(--b-border)" }}>회원가입</Link>
          </div>
        </div>
      </Shell>
    );
  }
  if (session.operator) {
    return <Shell><p className="rounded-2xl bg-white p-6">운영자 계정으로 로그인되어 있습니다. 마이페이지는 고객 계정 전용입니다. <Link href="/ax" className="font-bold underline">Business AX로 이동</Link></p></Shell>;
  }
  if (!session.account) return <Shell><CompleteSignup onDone={refresh} /></Shell>;

  const acc = session.account;
  const schedule = repurchaseSchedule(purchases, productById, todayISO());
  const orderable = products;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.85rem] font-bold tracking-[0.18em]" style={{ color: "var(--b-gold-ink)" }}>MY BEAUTY</p>
          <h1 className="mt-1 text-[1.7rem] font-bold">{acc.displayName || "회원"}님의 뷰티 기록</h1>
        </div>
        <button className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-4 text-[0.9rem] font-semibold" style={{ borderColor: "var(--b-border)" }} onClick={async () => { await customerApi().signOut(); await refresh(); router.push("/beauty"); }}>
          <LogOut size={16} aria-hidden /> 로그아웃
        </button>
      </div>
      {msg && <p className="mt-3 rounded-xl p-3 text-[0.9rem]" style={{ background: "var(--b-surface-warm)" }} role="status">{msg}</p>}
      {err && <p className="mt-3 text-[0.9rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}

      <div className="mt-6 grid gap-5 @4xl:grid-cols-2">
        <Section icon={<CalendarClock size={19} />} title="재구매 예상 시점" testId="repurchase">
          {schedule.length === 0 ? <Empty>구매 기록을 남기면 제품 사용기간을 기준으로 다시 필요할 시점을 알려드려요.</Empty> : (
            <ul className="space-y-2">
              {schedule.map((i) => (
                <li key={i.purchase.id} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: i.daysLeft <= 7 ? "rgba(191,160,106,0.14)" : "var(--b-surface-warm)" }}>
                  <span className="min-w-0">
                    <Link href={`/beauty/products/${i.product.id}`} className="block truncate font-bold">{i.product.name}</Link>
                    <span className="text-[0.82rem]" style={{ color: "var(--b-text-soft)" }}>{formatDateKR(i.purchase.purchasedOn)} 구매 · 예상 {formatDateKR(i.expectedOn)}{i.estimated ? " (사용기간 추정)" : ""}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold tabular" style={{ color: i.daysLeft <= 7 ? "var(--b-navy)" : "var(--b-text-soft)" }}>{dDayLabel(i.daysLeft)}</span>
                    {i.daysLeft <= 7 && <Link href={`/beauty/products/${i.product.id}#channels`} className="text-[0.8rem] font-semibold underline">구매처 보기</Link>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[0.78rem]" style={{ color: "var(--b-text-soft)" }}>예상 시점 = 구매일 + 제품 사용기간 × 수량. 사용기간이 등록되지 않은 제품은 제품 종류별 기본값으로 추정합니다.</p>
        </Section>

        <Section icon={<ShoppingBag size={19} />} title="구매 기록" testId="purchases">
          <PurchaseForm products={orderable} onAdd={(p) => act(() => customerApi().addMyPurchase(p), "구매 기록을 추가했습니다")} />
          {purchases.length === 0 ? <Empty>아직 구매 기록이 없습니다.</Empty> : (
            <ul className="mt-3 space-y-1.5">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[0.9rem]" style={{ borderColor: "var(--b-border)" }}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{productById.get(p.productId)?.name ?? "판매 종료·비공개 제품"}</span><span className="text-[0.8rem]" style={{ color: "var(--b-text-soft)" }}>{formatDateKR(p.purchasedOn)} · {p.quantity}개{p.channelLabel ? ` · ${p.channelLabel}` : ""}{p.source === "STAFF" ? " · 매장·운영자 기록" : ""}</span></span>
                  {p.source === "SELF" && <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-black/5" aria-label={`${productById.get(p.productId)?.name ?? "제품"} 구매 기록 삭제`} onClick={() => act(() => customerApi().deleteMyPurchase(p.id), "구매 기록을 삭제했습니다")}><Trash2 size={16} /></button>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={<History size={19} />} title="AI 추천 기록" testId="recommendations">
          {recs.length === 0 ? <Empty>AI 뷰티 파인더 결과를 저장하면 여기에 쌓입니다. <Link href="/beauty/finder" className="font-bold underline">추천 받기</Link></Empty> : (
            <ul className="space-y-2">
              {recs.map((r) => (
                <li key={r.id} className="rounded-xl p-3" style={{ background: "var(--b-surface-warm)" }}>
                  <div className="text-[0.8rem]" style={{ color: "var(--b-text-soft)" }}>{formatDateKR(r.createdAt)} 추천</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">{r.productIds.map((id, n) => <Link key={id} href={`/beauty/products/${id}`} className="rounded-full bg-white px-3 py-1 text-[0.84rem] font-semibold">STEP {n + 1} · {productById.get(id)?.name ?? "비공개 제품"}</Link>)}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={<Sparkles size={19} />} title="내 정보 · 동의" testId="profile">
          <ProfileForm key={`${acc.userId}-${acc.marketingConsent}`} concerns={acc.skinConcerns} name={acc.displayName ?? ""} marketing={acc.marketingConsent} onSave={(v) => act(() => customerApi().updateAccount({ displayName: v.name, skinConcerns: v.concerns, marketingConsent: v.marketing }), "내 정보를 저장했습니다")} />
          <dl className="mt-3 space-y-0.5 text-[0.82rem]" style={{ color: "var(--b-text-soft)" }}>
            <div>이메일 {session.email ?? acc.email}</div>
            <div>가입 {formatDateKR(acc.createdAt)} · 개인정보 동의 {formatDateKR(acc.privacyAgreedAt)} ({acc.privacyVersion})</div>
          </dl>
          <DeleteAccount onDone={async (full) => { await refresh(); setMsg(full ? "탈퇴가 완료되었습니다." : "계정 정보를 삭제했습니다. 로그인 정보 삭제는 운영자가 처리합니다."); router.push("/beauty"); }} />
        </Section>
      </div>
    </Shell>
  );
}

function PurchaseForm({ products, onAdd }: { products: { id: string; name: string; purchaseLinks: { label: string }[] }[]; onAdd: (p: { productId: string; quantity: number; purchasedOn: string; channelLabel?: string }) => void }) {
  const [v, setV] = useState({ productId: "", quantity: "1", purchasedOn: todayISO(), channelLabel: "" });
  const product = products.find((p) => p.id === v.productId);
  const q = Number(v.quantity);
  const ok = !!v.productId && Number.isInteger(q) && q >= 1 && q <= 99 && v.purchasedOn <= todayISO();
  return (
    <form className="grid gap-2 @xl:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (ok) { onAdd({ productId: v.productId, quantity: q, purchasedOn: v.purchasedOn, channelLabel: v.channelLabel }); setV({ ...v, productId: "", quantity: "1" }); } }}>
      <select aria-label="구매한 제품" className="field @xl:col-span-2" value={v.productId} onChange={(e) => setV({ ...v, productId: e.target.value, channelLabel: "" })}>
        <option value="">구매한 제품 선택</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input aria-label="구매일" type="date" max={todayISO()} className="field" value={v.purchasedOn} onChange={(e) => setV({ ...v, purchasedOn: e.target.value })} />
      <input aria-label="수량" inputMode="numeric" className="field tabular" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} />
      <input aria-label="구매처 (선택)" list="purchase-channels" className="field" placeholder="구매처 (선택)" value={v.channelLabel} onChange={(e) => setV({ ...v, channelLabel: e.target.value })} />
      <datalist id="purchase-channels">{(product?.purchaseLinks ?? []).map((l) => <option key={l.label} value={l.label} />)}</datalist>
      <button className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: "var(--b-navy)" }} disabled={!ok}><Plus size={16} aria-hidden /> 구매 기록 추가</button>
    </form>
  );
}

function ProfileForm({ name, concerns, marketing, onSave }: { name: string; concerns: SkinConcern[]; marketing: boolean; onSave: (v: { name: string; concerns: SkinConcern[]; marketing: boolean }) => void }) {
  const [v, setV] = useState({ name, concerns, marketing });
  const dirty = v.name !== name || v.marketing !== marketing || v.concerns.join() !== concerns.join();
  return (
    <div className="space-y-3">
      <div><label className="field-label" htmlFor="me-name">이름</label><input id="me-name" className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
      <div><span className="field-label">피부 고민</span><ConcernPicker value={v.concerns} onChange={(c) => setV({ ...v, concerns: c })} /></div>
      <label className="flex items-start gap-2 text-[0.9rem]"><input type="checkbox" className="mt-1 h-4 w-4" checked={v.marketing} onChange={(e) => setV({ ...v, marketing: e.target.checked })} /> [선택] 재구매 시점·신제품 안내 수신 동의</label>
      <button className="min-h-[44px] w-full rounded-xl border font-bold disabled:opacity-50" style={{ borderColor: "var(--b-border)" }} disabled={!dirty} onClick={() => onSave(v)}>저장</button>
    </div>
  );
}

function CompleteSignup({ onDone }: { onDone: () => Promise<void> }) {
  const [v, setV] = useState({ name: "", concerns: [] as SkinConcern[], agree: false, marketing: false });
  const [err, setErr] = useState<string>();
  return (
    <div className="mx-auto max-w-[520px] rounded-3xl border bg-white p-6" style={{ borderColor: "var(--b-border)" }}>
      <h1 className="text-[1.35rem] font-bold">가입을 마무리해 주세요</h1>
      <p className="mt-1 text-[0.92rem]" style={{ color: "var(--b-text-soft)" }}>로그인은 되었지만 개인정보 수집·이용 동의가 필요합니다.</p>
      <div className="mt-4 space-y-3">
        <div><label className="field-label" htmlFor="cs-name">이름 (선택)</label><input id="cs-name" className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <ConcernPicker value={v.concerns} onChange={(c) => setV({ ...v, concerns: c })} />
        <ConsentSummary />
        <label className="flex items-start gap-2 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4" checked={v.agree} onChange={(e) => setV({ ...v, agree: e.target.checked })} /> <b>[필수]</b> 개인정보 수집·이용에 동의합니다</label>
        <label className="flex items-start gap-2 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4" checked={v.marketing} onChange={(e) => setV({ ...v, marketing: e.target.checked })} /> [선택] 재구매 시점·신제품 안내 수신 동의</label>
        {err && <p className="text-[0.88rem]" style={{ color: "var(--danger)" }}>{err}</p>}
        <button className="min-h-[50px] w-full rounded-2xl font-bold text-white disabled:opacity-50" style={{ background: "var(--b-navy)" }} disabled={!v.agree} onClick={async () => {
          try { await customerApi().completeSignup({ displayName: v.name, concerns: v.concerns, marketingConsent: v.marketing }); await onDone(); } catch (e) { setErr(e instanceof Error ? e.message : "실패"); }
        }}>동의하고 시작하기</button>
      </div>
    </div>
  );
}

function DeleteAccount({ onDone }: { onDone: (full: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  return (
    <details className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--b-border)" }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-[0.88rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>회원 탈퇴</summary>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--b-text-soft)" }}>계정 정보와 구매 기록이 삭제됩니다. 추천 기록은 개인을 알아볼 수 없는 통계로만 남습니다. 되돌릴 수 없습니다.</p>
      {err && <p className="mt-1 text-[0.85rem]" style={{ color: "var(--danger)" }}>{err}</p>}
      <button className="mt-2 min-h-[42px] w-full rounded-xl font-bold text-white disabled:opacity-50" style={{ background: "var(--danger)" }} disabled={busy} onClick={async () => {
        setBusy(true);
        try { const r = await customerApi().deleteAccount(); onDone(r.fullyDeleted); } catch (e) { setErr(e instanceof Error ? e.message : "실패"); } finally { setBusy(false); }
      }}>탈퇴하기</button>
    </details>
  );
}

function Section({ icon, title, children, testId }: { icon: React.ReactNode; title: string; children: React.ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className="rounded-3xl border bg-white p-5 md:p-6" style={{ borderColor: "var(--b-border)" }}>
      <h2 className="mb-3 flex items-center gap-2 text-[1.12rem] font-bold"><span style={{ color: "var(--b-gold-ink)" }} aria-hidden>{icon}</span>{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl p-3.5 text-[0.9rem]" style={{ background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }}>{children}</p>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1100px] pt-8">{children}</div>;
}
