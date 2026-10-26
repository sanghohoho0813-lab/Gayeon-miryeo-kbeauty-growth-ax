"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink, PauseCircle, PlayCircle, Sparkles } from "lucide-react";
import type { GrowthAction, KpiSnapshot } from "@/lib/types";
import { Drawer } from "./Modal";
import { ACTION_STATUS_LABEL, ACTION_STATUS_TONE, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { CoverBarFor, ScenarioButton } from "./ProductionPlanner";
import { ActionOutcomeView } from "./ActionOutcomeView";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { formatDateTimeKR } from "@/lib/date";
import { ACTION_WAIT_ALERT_DAYS, actionWaitDays, OPEN_STATUSES } from "@/lib/analytics";

/* Growth Action Lifecycle — AX Decision → Human Action → Result → Proof Event (L2~L3, 자동실행 없음) */

const STEPS = ["NEW", "REVIEWED", "IN_PROGRESS", "DONE"] as const;

function Snapshot({ title, items }: { title: string; items?: KpiSnapshot[] | null }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-[0.8rem] font-semibold text-ink-soft">{title}</div>
      {items && items.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-[0.88rem]">
          {items.map((k) => <li key={k.label} className="flex justify-between gap-2"><span className="text-ink-soft">{k.label}</span><span className="tabular font-semibold">{k.value}</span></li>)}
        </ul>
      ) : <div className="mt-1.5 text-[0.85rem] text-ink-soft">아직 기록 전</div>}
    </div>
  );
}

/** nav: 목록 순서대로 이어서 처리 (PASS 32, D-106) — 열 때의 목록 순서(ids)를 고정해 두므로
 *  처리해서 상태가 바뀌어도(목록에서 빠져도) 자리가 흔들리지 않는다. J 다음 · K 이전 (입력 중에는 무시) */
export type ActionNav = { ids: string[]; onGo: (a: GrowthAction) => void };

export function ActionDrawer({ action, onClose, nav }: { action: GrowthAction | null; onClose: () => void; nav?: ActionNav }) {
  const model = useModel();
  const { run } = useData();
  const { role, actorName } = useSession();
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState("");
  const [link, setLink] = useState("");
  const [feature, setFeature] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [busy, setBusy] = useState(false);
  // 다른 Action으로 넘어가면 쓰던 입력칸을 비움 (이전 Action의 담당자·메모가 따라오지 않게)
  const [forId, setForId] = useState(action?.id);
  if (forId !== action?.id) {
    setForId(action?.id);
    setAssignee(""); setNote(""); setResult(""); setLink(""); setFeature(false); setDismissReason("");
  }
  const ids = nav?.ids ?? [];
  const pos = action ? ids.indexOf(action.id) : -1;
  const prevA = pos > 0 ? model.actions.find((x) => x.id === ids[pos - 1]) : undefined;
  const nextA = pos >= 0 && pos < ids.length - 1 ? model.actions.find((x) => x.id === ids[pos + 1]) : undefined;
  useEffect(() => {
    if (!action || !nav || pos < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = e.target instanceof Element ? e.target : null; // window·document에서 온 키도 있음
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelectorAll("[data-overlay]").length > 1) return; // 위에 다른 창(조건 바꿔 보기 등)이 열려 있으면 무시
      // 한글 입력 상태에서도 같은 자리 키(ㅓ·ㅏ)로 동작하도록 e.code로 판단
      const go = e.code === "KeyJ" ? nextA : e.code === "KeyK" ? prevA : undefined;
      if (go) { e.preventDefault(); nav.onGo(go); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!action) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;
  const a = model.actions.find((x) => x.id === action.id) ?? action;
  const cand = model.candidateByRule.get(a.ruleKey);
  const current = cand?.snapshot ?? a.snapshot;
  // 추천 뒤 데이터·운영 기준값이 바뀌어 RULE 결과가 달라졌으면 '지금 다시 계산한 판단'을 함께 보여 준다 (추천 당시 기록은 그대로)
  const recalc = cand && OPEN_STATUSES.includes(a.status) && (cand.recommendation !== a.recommendation || cand.judgement !== a.judgement) ? cand : null;
  const events = model.snapshot.actionEvents.filter((e) => e.growthActionId === a.id);
  const product = a.linkedProductId ? model.productById.get(a.linkedProductId) : undefined;
  const canApprove = can(role, "approve_action");
  const canExecute = can(role, "execute_action");
  const proof = model.snapshot.proofEvents.find((p) => p.growthActionId === a.id);

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      toast(label);
    } catch (e) {
      toast(e instanceof Error ? e.message : "처리하지 못했습니다", "error");
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = a.status === "DISMISSED" ? -1 : STEPS.indexOf(a.status as (typeof STEPS)[number]);
  const wait = actionWaitDays(a, model.today);
  const toolbar = nav && pos >= 0 && ids.length > 1 ? (
    <div className="flex items-center justify-between gap-2" data-testid="action-nav">
      <span className="tabular text-[0.86rem] font-semibold text-ink-soft" aria-hidden data-testid="action-nav-pos">{pos + 1} / {ids.length}</span>
      <span className="sr-only" aria-live="polite">{`전체 ${ids.length}건 중 ${pos + 1}번째: ${a.title}`}</span>
      <span className="ml-auto hidden text-[0.76rem] text-ink-soft @md:inline" aria-hidden>키보드 J 다음 · K 이전</span>
      <span className="flex gap-1.5">
        <button type="button" className="btn-secondary !min-h-[38px] !px-3 text-[0.86rem]" disabled={!prevA} onClick={() => prevA && nav.onGo(prevA)} aria-keyshortcuts="K" title={prevA?.title} data-testid="action-prev"><ChevronLeft size={16} aria-hidden /> 이전</button>
        <button type="button" className="btn-secondary !min-h-[38px] !px-3 text-[0.86rem]" disabled={!nextA} onClick={() => nextA && nav.onGo(nextA)} aria-keyshortcuts="J" title={nextA?.title} data-testid="action-next">다음 <ChevronRight size={16} aria-hidden /></button>
      </span>
    </div>
  ) : undefined;

  return (
    <Drawer open onClose={onClose} title={a.title} toolbar={toolbar} bodyKey={a.id} footer={a.status === "NEW" ? (
      // 첫 단계 버튼은 아래에 고정 — 근거가 길어도 스크롤 없이 누를 수 있게 (PASS 15)
      <button className="btn-primary w-full" disabled={busy} onClick={() => act("검토 완료로 표시했습니다", () => run((s) => s.updateAction(a.id, { status: "REVIEWED" }, { from: "NEW", to: "REVIEWED", actorName })))}>
        <ClipboardCheck size={17} aria-hidden /> 근거 확인 — 검토 완료
      </button>
    ) : undefined}>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={ACTION_STATUS_TONE[a.status]}>{ACTION_STATUS_LABEL[a.status]}</StatusBadge>
        <StatusBadge tone="neutral">{a.category}</StatusBadge>
        <StatusBadge tone="primary">판단 방식: {a.decisionMethod}</StatusBadge>
        {wait != null && wait >= ACTION_WAIT_ALERT_DAYS && <StatusBadge tone="warning">{wait}일째 대기</StatusBadge>}
        {!isLive && <StatusBadge tone="warning">DEMO</StatusBadge>}
      </div>

      {/* Lifecycle 진행 */}
      <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="처리 단계">
        {["추천", "검토", "실행", "결과"].map((label, i) => (
          <li key={label} className="text-center">
            <div className="h-1.5 rounded-full" style={{ background: i <= stepIndex ? "var(--primary)" : "var(--surface-muted)" }} />
            <div className="mt-1 text-[0.75rem] font-semibold" style={{ color: i <= stepIndex ? "var(--primary)" : "var(--text-secondary)" }}>{label}</div>
          </li>
        ))}
      </ol>

      <section className="mt-5">
        <p className="text-[1rem] leading-relaxed">{a.judgement}</p>
        <div className="mt-3 rounded-xl p-4" style={{ background: "var(--primary-soft)" }}>
          <div className="flex items-center gap-1.5 text-[0.88rem] font-bold" style={{ color: "var(--primary)" }}><Sparkles size={15} aria-hidden /> 왜? — 근거 (사용 데이터)</div>
          <ul className="mt-2 space-y-1 text-[0.9rem]">{a.evidence.map((e) => <li key={e}>· {e}</li>)}</ul>
          <div className="mt-3 text-[0.88rem]"><span className="font-semibold">예상 영향:</span> {a.impact.join(" · ")}</div>
          <div className="mt-1 text-[0.88rem]"><span className="font-semibold">권장 행동:</span> {a.recommendation}</div>
        </div>
        {a.category === "생산" && product?.leadTimeDays != null && (
          // 생산 Action: 두 기간 비교 그림 + 조건 바꿔 보기 (PASS 21, D-076) — 지금 데이터 기준
          <div className="mt-2 rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }} data-testid="action-coverbar">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[0.86rem] font-bold">지금 기준 두 기간 비교</span><ScenarioButton product={product} /></div>
            <CoverBarFor product={product} />
          </div>
        )}
        {recalc && (
          <div className="mt-2 rounded-xl border p-3.5 text-[0.88rem]" style={{ borderColor: "var(--warning)" }} data-testid="action-recalc">
            <div className="font-bold" style={{ color: "var(--warning)" }}>지금 데이터·기준으로 다시 계산하면</div>
            <p className="mt-1">{recalc.judgement}</p>
            <p className="mt-1"><span className="font-semibold">권장 행동:</span> {recalc.recommendation}</p>
            <p className="mt-1 text-[0.8rem] text-ink-soft">위 판단·근거는 추천 당시 기록이라 바꾸지 않습니다. 검토할 때 이 최신 계산을 함께 보세요.</p>
          </div>
        )}
        {product && (
          <Link href={a.href} className="mt-2 inline-flex items-center gap-1 text-[0.88rem] font-semibold" style={{ color: "var(--primary)" }}>
            관련 화면 열기 <ExternalLink size={14} aria-hidden />
          </Link>
        )}
      </section>

      <section className="mt-5 grid gap-2 @md:grid-cols-2">
        <Snapshot title="KPI Before (승인 시점)" items={a.kpiBefore} />
        <Snapshot title={a.status === "DONE" ? "KPI After (완료 시점)" : "현재 KPI"} items={a.status === "DONE" ? a.kpiAfter : current} />
      </section>
      <ActionOutcomeView action={a} />

      {/* 상태별 조작 */}
      <section className="mt-5 space-y-3">
        {a.status === "REVIEWED" && (
          canApprove ? (
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <div className="font-semibold">승인 · 담당자 지정</div>
              <label className="field-label mt-3" htmlFor="assignee">담당자</label>
              <input id="assignee" className="field" placeholder="예: 재고 담당 / 이름" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              <button
                className="btn-primary mt-3 w-full"
                disabled={busy || !assignee.trim()}
                onClick={() => act("승인했습니다 — 실행 단계로 이동", () => run((s) => s.updateAction(a.id, { status: "IN_PROGRESS", assigneeName: assignee.trim(), approvedBy: actorName, approvedAt: new Date().toISOString(), kpiBefore: current }, { from: "REVIEWED", to: "IN_PROGRESS", note: `승인 · 담당 ${assignee.trim()}`, actorName })))}
              >
                <PlayCircle size={17} aria-hidden /> 승인하고 실행 시작
              </button>
              <p className="mt-2 text-[0.8rem] text-ink-soft">승인 시점의 KPI가 Before로 저장됩니다.</p>
            </div>
          ) : (
            <p className="rounded-xl bg-surface-muted p-3 text-[0.9rem] text-ink-soft">승인·담당 지정은 대표/관리자 권한입니다. (현재: {ROLE_LABEL[role]})</p>
          )
        )}

        {a.status === "IN_PROGRESS" && (
          canExecute ? (
            <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <div className="text-[0.88rem] text-ink-soft">승인 {a.approvedBy} · {formatDateTimeKR(a.approvedAt)} · 담당 {a.assigneeName}</div>
              <div>
                <label className="field-label" htmlFor="exec">실행 메모 (실제로 한 일)</label>
                <textarea id="exec" className="field" placeholder="예: OEM 파트너에 추가 생산 1,200개 요청 (납기 3주)" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="btn-secondary mt-2" disabled={busy || !note.trim()} onClick={() => act("실행 메모를 저장했습니다", async () => { await run((s) => s.updateAction(a.id, { executionNote: note.trim() }, { from: "IN_PROGRESS", to: "IN_PROGRESS", note: note.trim(), actorName })); setNote(""); })}>
                  메모 저장
                </button>
                {a.executionNote && <p className="mt-2 text-[0.85rem] text-ink-soft">최근 메모: {a.executionNote}</p>}
              </div>
              <div>
                <label className="field-label" htmlFor="result">결과 (관찰된 사실)</label>
                <textarea id="result" className="field" placeholder="예: 입고 일정 확정, 해당 기간 품절 없이 판매 유지" value={result} onChange={(e) => setResult(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="link">증빙 링크 (선택)</label>
                <input id="link" className="field" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
              </div>
              {product && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-surface-muted p-3 text-[0.9rem]">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={feature} onChange={(e) => setFeature(e.target.checked)} />
                  <span><span className="font-semibold">고객 화면에 &lsquo;지금 주목받는 제품&rsquo;으로 14일 노출</span><br /><span className="text-ink-soft">사람이 선택한 경우에만 MIRYEO AI Beauty 홈에 반영됩니다 (Closed Loop).</span></span>
                </label>
              )}
              <button
                className="btn-primary w-full"
                disabled={busy || !result.trim()}
                onClick={() =>
                  act("결과를 기록했습니다 — Proof Event 생성", async () => {
                    await run(async (s) => {
                      const after = current;
                      await s.updateAction(a.id, { status: "DONE", resultNote: result.trim(), kpiAfter: after, customerEffect: feature ? "feature_product" : null }, { from: "IN_PROGRESS", to: "DONE", note: result.trim(), actorName });
                      if (feature && product) await s.setProductFeatured(product.id, new Date(Date.now() + 14 * 86_400_000).toISOString());
                      await s.createProof({
                        growthActionId: a.id,
                        eventType: a.proofType,
                        trigger: a.judgement,
                        decision: a.recommendation,
                        decisionMethod: a.decisionMethod,
                        why: a.evidence.join(" / "),
                        humanApproval: a.approvedBy ? `${a.approvedBy} · ${formatDateTimeKR(a.approvedAt)}` : "미승인",
                        action: [a.executionNote, feature ? "고객 화면 주목 노출 14일" : null].filter(Boolean).join(" / ") || "(실행 메모 없음)",
                        result: result.trim(),
                        kpiBefore: a.kpiBefore ?? [],
                        kpiAfter: after,
                        dataSource: isLive ? "SUPABASE LIVE" : "BROWSER DEMO",
                        actorName,
                        evidenceLink: link.trim() || null,
                        status: "RECORDED",
                      });
                    });
                  })
                }
              >
                <CheckCircle2 size={17} aria-hidden /> 결과 기록하고 완료
              </button>
            </div>
          ) : null
        )}

        {a.status === "DONE" && (
          <div className="rounded-xl p-4" style={{ background: "var(--success-soft)" }}>
            <div className="font-semibold" style={{ color: "var(--success)" }}>완료 · 결과 기록됨</div>
            <p className="mt-1 text-[0.92rem]">{a.resultNote}</p>
            {a.customerEffect === "feature_product" && <p className="mt-1 text-[0.85rem]">고객 화면 반영: 지금 주목받는 제품 (14일)</p>}
            {proof && (
              <Link href="/ax/reports#proofs" className="mt-2 inline-flex items-center gap-1 text-[0.88rem] font-semibold" style={{ color: "var(--primary)" }}>
                Proof Event 보기 ({proof.status === "RESULT_CONFIRMED" ? "결과 확정" : "측정중"}) <ExternalLink size={14} aria-hidden />
              </Link>
            )}
          </div>
        )}

        {a.status === "DISMISSED" && <p className="rounded-xl bg-surface-muted p-3 text-[0.9rem]">보류·제외 사유: {a.dismissReason ?? "-"}</p>}

        {(a.status === "NEW" || a.status === "REVIEWED") && canApprove && (
          <details className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <summary className="cursor-pointer text-[0.9rem] font-semibold text-ink-soft">이번에는 하지 않음 (보류·제외)</summary>
            <input className="field mt-2" placeholder="사유 (예: 이미 별도 대응 중)" value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} />
            <button className="btn-secondary mt-2" disabled={busy || !dismissReason.trim()} onClick={() => act("보류·제외했습니다", () => run((s) => s.updateAction(a.id, { status: "DISMISSED", dismissReason: dismissReason.trim() }, { from: a.status, to: "DISMISSED", note: dismissReason.trim(), actorName })))}>
              <PauseCircle size={16} aria-hidden /> 보류·제외
            </button>
          </details>
        )}
      </section>

      {/* 처리 이력 */}
      <section className="mt-6">
        <h3 className="text-[0.95rem] font-bold">처리 이력</h3>
        <ol className="mt-2 space-y-2 border-l-2 pl-4" style={{ borderColor: "var(--border)" }}>
          {events.map((e) => (
            <li key={e.id} className="text-[0.86rem]">
              <span className="tabular text-ink-soft">{formatDateTimeKR(e.createdAt)}</span> · <span className="font-semibold">{ACTION_STATUS_LABEL[e.toStatus]}</span> · {e.actorName}
              {e.note && <div className="text-ink-soft">{e.note}</div>}
            </li>
          ))}
        </ol>
      </section>
    </Drawer>
  );
}
