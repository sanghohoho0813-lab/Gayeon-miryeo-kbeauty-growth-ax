"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { useCustomerSession } from "@/components/beauty/CustomerSession";
import { ConcernPicker, ConsentSummary } from "@/components/beauty/AccountParts";
import { CONCERNS } from "@/components/beauty/concerns";
import { RepurchaseList } from "@/components/beauty/Repurchase";
import { formatDay } from "@/components/beauty/useBeautyMemory";
import { customerApi } from "@/lib/customer-account";
import { dDayLabel, repurchaseSchedule } from "@/lib/repurchase";
import { formatDateKR, todayISO } from "@/lib/date";
import type { CustomerPurchase, SavedRecommendation, SkinConcern } from "@/lib/types";

/* 마이페이지 — 추천 기록 · 구매 기록 · 재구매 예상 시점 · 계정 (계약 별지 제1호 ⑥)
   화면 (PASS 25 D-080 → PASS 26 D-082): 회원 카드형 머리(이름·고민·다음 재구매·기록 수) + 흰 카드 구간 4개(굵은 고딕 제목).
   기능·데이터·문구 기준(테스트 기준 포함)은 그대로. */
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

  if (status === "loading") return <div className="pt-10"><p className="b-body">불러오는 중…</p></div>;
  if (!session) {
    return (
      <div className="mx-auto max-w-[560px] pt-10 text-center @3xl:pt-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
        <img src="/images/beauty/card-passport.webp" alt="" width={512} height={512} decoding="async" className="mx-auto h-[120px] w-auto" />
        <p className="b-eyebrow mt-4">MY BEAUTY</p>
        <h1 className="b-section mt-3 text-[1.6rem] @3xl:text-[1.9rem]">로그인하고 나만의 뷰티 기록을 보관하세요</h1>
        <p className="b-body mt-3">추천 기록, 구매 기록, 재구매 예상 시점을 한곳에서 확인할 수 있습니다.</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link href="/beauty/login" className="b-btn pressable">로그인</Link>
          <Link href="/beauty/login?mode=signup" className="b-link">회원가입</Link>
        </div>
      </div>
    );
  }
  if (session.operator) {
    return (
      <div className="mx-auto max-w-[560px] pt-10 text-center @3xl:pt-16">
        <p className="b-eyebrow">MY BEAUTY</p>
        <p className="b-section mt-3 text-[1.4rem]">운영자 계정으로 로그인되어 있습니다</p>
        <p className="b-body mt-2">마이페이지는 고객 계정 전용입니다. <Link href="/ax" className="b-link">Business AX로 이동</Link></p>
      </div>
    );
  }
  if (!session.account) return <CompleteSignup onDone={refresh} />;

  const acc = session.account;
  const schedule = repurchaseSchedule(purchases, productById, todayISO());
  const next = schedule[0];

  return (
    <div className="pt-6 @3xl:pt-10">
      {/* 회원 카드형 머리 — 이름 · 피부 고민 · 다음 재구매 · 기록 수 */}
      <section className="relative overflow-hidden rounded-[28px] px-5 py-6 @3xl:px-12 @3xl:py-10" style={{ background: "linear-gradient(135deg, #1C1D24 0%, #3A2631 100%)" }} aria-labelledby="h-me">
        {/* eslint-disable-next-line @next/next/no-img-element -- 투명 배경 WebP 정적 파일 */}
        <img src="/images/beauty/card-recommendation.webp" alt="" width={512} height={512} decoding="async" className="pointer-events-none absolute bottom-8 right-12 hidden h-[200px] w-auto opacity-95 @4xl:block" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="b-pill" style={{ background: "rgba(255,255,255,.14)", color: "#F7B6C8" }}>MY BEAUTY</span>
            <h1 id="h-me" className="mt-2.5 text-[1.45rem] font-extrabold leading-tight tracking-[-0.03em] text-white @3xl:text-[2.2rem]">{acc.displayName || "회원"}님의 뷰티 기록</h1>
            <p className="mt-2 text-[0.9rem] text-white/65">가입 {formatDateKR(acc.createdAt)}</p>
          </div>
          <button className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/25 px-4 text-[0.9rem] font-semibold text-white hover:bg-white/10" onClick={async () => { await customerApi().signOut(); await refresh(); router.push("/beauty"); }}>
            <LogOut size={16} aria-hidden /> 로그아웃
          </button>
        </div>
        {acc.skinConcerns.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {acc.skinConcerns.map((c) => <span key={c} className="rounded-full border border-white/25 px-3.5 py-1.5 text-[0.84rem] font-semibold text-white">{CONCERNS.find((x) => x.id === c)?.label ?? c}</span>)}
          </div>
        )}
        <dl className="relative mt-5 grid max-w-[34rem] grid-cols-3 border-t border-white/15 pt-5 text-white" data-testid="me-stats">
          <div className="min-w-0"><dt className="text-[0.74rem] text-white/60">다음 재구매</dt><dd className="mt-1 text-[1.15rem] font-bold tabular">{next ? dDayLabel(next.daysLeft) : "—"}</dd>{next && <dd className="truncate text-[0.74rem] text-white/60">{next.product.name}</dd>}</div>
          <div><dt className="text-[0.74rem] text-white/60">구매 기록</dt><dd className="mt-1 text-[1.15rem] font-bold tabular">{purchases.length}건</dd></div>
          <div><dt className="text-[0.74rem] text-white/60">AI 추천 기록</dt><dd className="mt-1 text-[1.15rem] font-bold tabular">{recs.length}회</dd></div>
        </dl>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/beauty/finder" className="pressable inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-white px-5 text-[0.95rem] font-extrabold" style={{ color: "var(--b-rose-ink)" }}><Sparkles size={16} aria-hidden /> 새로 추천받기</Link>
          <Link href="/beauty/passport" className="inline-flex min-h-[44px] items-center gap-1 text-[0.92rem] font-semibold text-white/85 underline decoration-white/30 underline-offset-4 hover:text-white">뷰티 패스포트 <ArrowRight size={15} aria-hidden /></Link>
        </div>
      </section>

      {msg && <p className="mt-4 flex items-center gap-1.5 rounded-2xl px-4 py-3 text-[0.88rem] font-semibold" style={{ background: "var(--b-rose-soft)" }} role="status"><Check size={16} style={{ color: "var(--b-rose-ink)" }} aria-hidden />{msg}</p>}
      {err && <p className="mt-4 text-[0.9rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}

      <Section eyebrow="REPURCHASE" title="재구매 예상 시점" sub="구매일과 제품 사용기간으로 다시 필요할 때를 계산했어요" testId="repurchase">
        {schedule.length === 0 ? <Empty>구매 기록을 남기면 제품 사용기간을 기준으로 다시 필요할 시점을 알려드려요.</Empty> : <RepurchaseList items={schedule} />}
        <p className="b-caption mt-3">예상 시점 = 구매일 + 제품 사용기간 × 수량. 사용기간이 등록되지 않은 제품은 제품 종류별 기본값으로 추정합니다.</p>
      </Section>

      <Section eyebrow="PURCHASES" title="구매 기록" sub="직접 남긴 기록은 삭제할 수 있어요. 매장·운영자 기록은 운영자가 관리합니다" testId="purchases">
        <div className="grid gap-8 @3xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] @3xl:gap-12">
          <PurchaseForm products={products} onAdd={(p) => act(() => customerApi().addMyPurchase(p), "구매 기록을 추가했습니다")} />
          {purchases.length === 0 ? <Empty>아직 구매 기록이 없습니다.</Empty> : (
            <ul className="b-list rounded-2xl px-4" style={{ background: "var(--b-canvas)" }}>
              {purchases.map((p) => {
                const name = productById.get(p.productId)?.name;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3.5">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{name ?? "판매 종료·비공개 제품"}</span>
                      <span className="b-caption">{formatDateKR(p.purchasedOn)} · {p.quantity}개{p.channelLabel ? ` · ${p.channelLabel}` : ""}{p.source === "STAFF" ? " · 매장·운영자 기록" : ""}</span>
                    </span>
                    {p.source === "SELF" && (
                      <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5" aria-label={`${name ?? "제품"} 구매 기록 삭제`} onClick={() => act(() => customerApi().deleteMyPurchase(p.id), "구매 기록을 삭제했습니다")}>
                        <Trash2 size={16} style={{ color: "var(--b-text-soft)" }} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>

      <Section eyebrow="HISTORY" title="AI 추천 기록" sub="AI 뷰티 파인더 결과를 저장할 때마다 쌓여요" testId="recommendations">
        {recs.length === 0 ? <Empty>AI 뷰티 파인더 결과를 저장하면 여기에 쌓입니다. <Link href="/beauty/finder" className="b-link">추천 받기</Link></Empty> : (
          <ol className="b-list">
            {recs.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-4 first:pt-0 @xl:flex-row @xl:items-baseline @xl:gap-6">
                <span className="tabular w-28 shrink-0 text-[0.88rem] font-semibold">{formatDay(r.createdAt)} 추천</span>
                <span className="flex flex-wrap gap-1.5">
                  {r.productIds.map((id, n) => (
                    <Link key={id} href={`/beauty/products/${id}`} className="rounded-full px-3 py-1.5 text-[0.84rem] font-semibold" style={{ background: "var(--b-canvas)" }}>
                      <span style={{ color: "var(--b-rose-ink)" }}>STEP {n + 1}</span> · {productById.get(id)?.name ?? "비공개 제품"}
                    </Link>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section eyebrow="ACCOUNT" title="내 정보 · 동의" testId="profile">
        <div className="grid gap-8 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] @3xl:gap-12">
          <ProfileForm key={`${acc.userId}-${acc.marketingConsent}`} concerns={acc.skinConcerns} name={acc.displayName ?? ""} marketing={acc.marketingConsent} onSave={(v) => act(() => customerApi().updateAccount({ displayName: v.name, skinConcerns: v.concerns, marketingConsent: v.marketing }), "내 정보를 저장했습니다")} />
          <div>
            <dl className="b-list rounded-2xl px-4 text-[0.88rem]" style={{ background: "var(--b-canvas)" }}>
              {[["이메일", session.email ?? acc.email], ["가입일", formatDateKR(acc.createdAt)], ["개인정보 동의", `${formatDateKR(acc.privacyAgreedAt)} (${acc.privacyVersion})`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3"><dt style={{ color: "var(--b-text-soft)" }}>{k}</dt><dd className="min-w-0 truncate text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
            <DeleteAccount onDone={async (full) => { await refresh(); setMsg(full ? "탈퇴가 완료되었습니다." : "계정 정보를 삭제했습니다. 로그인 정보 삭제는 운영자가 처리합니다."); router.push("/beauty"); }} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function PurchaseForm({ products, onAdd }: { products: { id: string; name: string; purchaseLinks: { label: string }[] }[]; onAdd: (p: { productId: string; quantity: number; purchasedOn: string; channelLabel?: string }) => void }) {
  const [v, setV] = useState({ productId: "", quantity: "1", purchasedOn: todayISO(), channelLabel: "" });
  const product = products.find((p) => p.id === v.productId);
  const q = Number(v.quantity);
  const ok = !!v.productId && Number.isInteger(q) && q >= 1 && q <= 99 && v.purchasedOn <= todayISO();
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ok) { onAdd({ productId: v.productId, quantity: q, purchasedOn: v.purchasedOn, channelLabel: v.channelLabel }); setV({ ...v, productId: "", quantity: "1" }); } }}>
      <p className="text-[0.95rem] font-bold">새 구매 기록</p>
      <select aria-label="구매한 제품" className="field" value={v.productId} onChange={(e) => setV({ ...v, productId: e.target.value, channelLabel: "" })}>
        <option value="">구매한 제품 선택</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
        <input aria-label="구매일" type="date" max={todayISO()} className="field" value={v.purchasedOn} onChange={(e) => setV({ ...v, purchasedOn: e.target.value })} />
        <input aria-label="수량" inputMode="numeric" className="field tabular" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} />
      </div>
      <input aria-label="구매처 (선택)" list="purchase-channels" className="field" placeholder="구매처 (선택)" value={v.channelLabel} onChange={(e) => setV({ ...v, channelLabel: e.target.value })} />
      <datalist id="purchase-channels">{(product?.purchaseLinks ?? []).map((l) => <option key={l.label} value={l.label} />)}</datalist>
      <button className="b-btn pressable w-full" disabled={!ok}><Plus size={16} aria-hidden /> 구매 기록 추가</button>
    </form>
  );
}

function ProfileForm({ name, concerns, marketing, onSave }: { name: string; concerns: SkinConcern[]; marketing: boolean; onSave: (v: { name: string; concerns: SkinConcern[]; marketing: boolean }) => void }) {
  const [v, setV] = useState({ name, concerns, marketing });
  const dirty = v.name !== name || v.marketing !== marketing || v.concerns.join() !== concerns.join();
  return (
    <div className="space-y-4">
      <div><label className="field-label" htmlFor="me-name">이름</label><input id="me-name" className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
      <div><span className="field-label">피부 고민</span><ConcernPicker value={v.concerns} onChange={(c) => setV({ ...v, concerns: c })} /></div>
      <label className="flex items-start gap-2.5 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={v.marketing} onChange={(e) => setV({ ...v, marketing: e.target.checked })} /> [선택] 재구매 시점·신제품 안내 수신 동의</label>
      <button className="b-btn pressable w-full @md:w-auto" disabled={!dirty} onClick={() => onSave(v)}>저장</button>
    </div>
  );
}

function CompleteSignup({ onDone }: { onDone: () => Promise<void> }) {
  const [v, setV] = useState({ name: "", concerns: [] as SkinConcern[], agree: false, marketing: false });
  const [err, setErr] = useState<string>();
  return (
    <div className="mx-auto max-w-[520px] pt-8 @3xl:pt-14">
      <p className="b-eyebrow">MIRYEO MEMBERSHIP</p>
      <h1 className="b-section mt-3 text-[1.6rem]">가입을 마무리해 주세요</h1>
      <p className="b-body mt-2">로그인은 되었지만 개인정보 수집·이용 동의가 필요합니다.</p>
      <div className="mt-6 space-y-4 rounded-[28px] border bg-white p-6 @md:p-8" style={{ borderColor: "var(--b-line)" }}>
        <div><label className="field-label" htmlFor="cs-name">이름 (선택)</label><input id="cs-name" className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div><span className="field-label">피부 고민 (선택)</span><ConcernPicker value={v.concerns} onChange={(c) => setV({ ...v, concerns: c })} /></div>
        <ConsentSummary />
        <label className="flex items-start gap-2.5 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={v.agree} onChange={(e) => setV({ ...v, agree: e.target.checked })} /> <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다</span></label>
        <label className="flex items-start gap-2.5 text-[0.92rem]"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={v.marketing} onChange={(e) => setV({ ...v, marketing: e.target.checked })} /> [선택] 재구매 시점·신제품 안내 수신 동의</label>
        {err && <p className="text-[0.88rem]" style={{ color: "var(--danger)" }} role="alert">{err}</p>}
        <button className="b-btn pressable w-full" disabled={!v.agree} onClick={async () => {
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
    <details className="mt-4 rounded-2xl border px-4 pb-3" style={{ borderColor: "var(--b-line)" }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="flex min-h-[44px] cursor-pointer items-center text-[0.88rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>회원 탈퇴</summary>
      <p className="b-caption mt-1">계정 정보와 구매 기록이 삭제됩니다. 추천 기록은 개인을 알아볼 수 없는 통계로만 남습니다. 되돌릴 수 없습니다.</p>
      {err && <p className="mt-1 text-[0.85rem]" style={{ color: "var(--danger)" }}>{err}</p>}
      <button className="mt-3 min-h-[44px] w-full rounded-2xl font-bold text-white disabled:opacity-50" style={{ background: "var(--danger)" }} disabled={busy} onClick={async () => {
        setBusy(true);
        try { const r = await customerApi().deleteAccount(); onDone(r.fullyDeleted); } catch (e) { setErr(e instanceof Error ? e.message : "실패"); } finally { setBusy(false); }
      }}>탈퇴하기</button>
    </details>
  );
}

function Section({ eyebrow, title, sub, children, testId }: { eyebrow: string; title: string; sub?: string; children: React.ReactNode; testId: string }) {
  return (
    <section data-testid={testId} data-eyebrow={eyebrow} className="b-card mt-3 p-4 @3xl:mt-5 @3xl:p-7">
      <h2 className="b-section text-[1.12rem] @3xl:text-[1.3rem]">{title}</h2>
      {sub && <p className="b-caption mt-0.5 text-[0.84rem]">{sub}</p>}
      <div className="mt-3 @3xl:mt-4">{children}</div>
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="b-body rounded-2xl px-4 py-4 text-[0.9rem]" style={{ background: "var(--b-canvas)" }}>{children}</p>;
}
