"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, FileText, Lock, Plus, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge, type Tone } from "@/components/ax/Cards";
import { AiReadyButton, AI_SPECS } from "@/components/ax/AiReady";
import { EmptyState } from "@/components/ax/States";
import { Modal } from "@/components/ax/Modal";
import { toast } from "@/components/ax/Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { daysBetween, formatDateKR, formatDateTimeKR } from "@/lib/date";
import { BaselineHistory, BaselineLockModal, BASELINE_SOURCE_LABEL } from "@/components/ax/BaselineLock";
import { formatChange, formatKpiValue, lastDays, measureMoneyKpis, type MoneyKpiMeasure } from "@/lib/evidence";
import type { ProofEvent } from "@/lib/types";

type EvStatus = "BASELINE REQUIRED" | "측정중" | "증거 축적중" | "RESULT CONFIRMED";
const EV_TONE: Record<EvStatus, Tone> = { "BASELINE REQUIRED": "warning", 측정중: "info", "증거 축적중": "primary", "RESULT CONFIRMED": "success" };
const KIND_LABEL = { COST: "COST", REVENUE: "REVENUE", SCALE: "SCALE" } as const;

const PLAN = [
  { weeks: [0, 0], title: "Week 0 — Baseline Lock", desc: "실데이터 1~2종 입력 · KPI 측정방식 확정 · AX OWNER 지정" },
  { weeks: [1, 4], title: "Week 1~4 — Adoption / First Proof", desc: "주 2회 이상 사용 · 첫 Proof Event 3건" },
  { weeks: [5, 8], title: "Week 5~8 — Business Lift", desc: "Baseline 대비 변화 실측 비교" },
  { weeks: [9, 12], title: "Week 9~12 — Enterprise Value / Judge Pack", desc: "Evidence Pack · Government/Investor Story" },
];

export default function ReportsPage() {
  const m = useModel();
  const { run } = useData();
  const { role, actorName } = useSession();
  const [manual, setManual] = useState(false);
  const [lockKpi, setLockKpi] = useState<MoneyKpiMeasure | null>(null);
  const proofs = [...m.snapshot.proofEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const confirmed = proofs.filter((p) => p.status === "RESULT_CONFIRMED").length;
  const pilotStart = m.snapshot.org.pilotStartedOn;
  const week = pilotStart ? Math.max(0, Math.floor(daysBetween(pilotStart, m.today) / 7)) : null;

  const range = lastDays(28, m.today);
  const money = measureMoneyKpis(m.snapshot, range);
  const doneActions = m.actions.filter((a) => a.status === "DONE").length;
  const axOwner = m.snapshot.org.axOwnerName?.trim();

  const operating: [string, string, EvStatus][] = [
    ["Action 실행률", `${doneActions}/${m.actions.length} 완료`, doneActions ? "증거 축적중" : "측정중"],
    ["Customer Event 축적", `${m.customer.totalCount.toLocaleString()}건 (실제 발생 ${m.customer.liveCount})`, m.customer.liveCount ? "증거 축적중" : "측정중"],
    ["재고위험 대응", `재고 관련 Proof ${proofs.filter((p) => p.eventType === "INVENTORY_RISK_RESPONSE").length}건`, "측정중"],
    ["Money KPI Baseline", `${money.filter((k) => k.baseline).length}/3 잠금`, money.every((k) => k.baseline) ? "증거 축적중" : "BASELINE REQUIRED"],
  ];
  const enterprise: [string, string, EvStatus][] = [
    ["표준화된 Workflow", "Action 5단계 + Proof Event 구조 운영", m.snapshot.actionEvents.length ? "증거 축적중" : "측정중"],
    ["Proprietary Customer Data", "Finder 고민·관심 제품 — 자사 DB 축적", m.customer.liveCount ? "증거 축적중" : "측정중"],
    ["대표 개인의존도 감소", "직원 처리 Action 비율 (역할별 이력)", "측정중"],
    ["IP / 특허", "상태 미확인 — 사실 확인 전 표시 금지", "BASELINE REQUIRED"],
  ];

  return (
    <div>
      <PageHeader
        title="실증·Evidence"
        description="판단 → 실행 → 결과를 Proof Event로 남기고, 12주 동안 Operating / Enterprise Value Evidence를 축적합니다. Baseline이 없으면 개선률을 만들지 않습니다."
        actions={<><Link href="/ax/reports/weekly" className="btn-secondary !min-h-[40px] text-[0.86rem]"><FileText size={15} aria-hidden /> 주간 리포트</Link><AiReadyButton spec={AI_SPECS.report} /><StatusBadge tone={isLive ? "success" : "warning"}>{isLive ? "LIVE" : "DEMO — 실증 자료로 사용 불가"}</StatusBadge></>}
      />

      <div className="grid gap-6 @4xl:grid-cols-3">
        <DataCard title="Pilot 진행">
          {week == null ? (
            <>
              <div className="text-[1.5rem] font-bold">NOT STARTED</div>
              <p className="mt-1 text-[0.9rem] text-ink-soft">Week 0 시작일이 지정되지 않았습니다.</p>
              {can(role, "manage_org") && <Link href="/ax/settings#pilot" className="btn-secondary mt-3 !min-h-[40px] text-[0.86rem]">시작일 지정 <ArrowRight size={15} aria-hidden /></Link>}
            </>
          ) : (
            <>
              <div className="tabular text-[1.5rem] font-bold">Week {Math.min(week, 12)} / 12</div>
              <p className="mt-1 text-[0.9rem] text-ink-soft">시작 {formatDateKR(pilotStart)}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="bar-reveal h-full rounded-full" style={{ width: `${Math.min(100, (week / 12) * 100)}%`, background: "var(--primary)" }} /></div>
            </>
          )}
        </DataCard>
        <DataCard title="Proof Event">
          <div className="tabular text-[1.5rem] font-bold">{proofs.length}건</div>
          <p className="mt-1 text-[0.9rem] text-ink-soft">결과 확정 {confirmed} · 측정중 {proofs.filter((p) => p.status === "RECORDED").length}</p>
        </DataCard>
        <DataCard title="AX OWNER">
          {axOwner ? (
            <>
              <div className="text-[1.2rem] font-bold">{axOwner}</div>
              <p className="mt-1 text-[0.9rem] text-ink-soft">실증 책임자 · 주 1회 Evidence 점검</p>
            </>
          ) : (
            <>
              <div className="text-[1.2rem] font-bold" style={{ color: "var(--warning)" }}>REQUIRED / UNASSIGNED</div>
              <p className="mt-1 text-[0.9rem] text-ink-soft">실증 책임자 지정 필요 (AX_COACH_PLAN)</p>
              {can(role, "manage_org") && <Link href="/ax/settings#pilot" className="btn-secondary mt-3 !min-h-[40px] text-[0.86rem]">지정하기 <ArrowRight size={15} aria-hidden /></Link>}
            </>
          )}
        </DataCard>
      </div>

      <DataCard className="mt-6" id="baseline" title="MONEY KPI 3 — Baseline 대비">
        <div className="grid gap-3 @4xl:grid-cols-3">
          {money.map((k) => {
            const status: EvStatus = !k.baseline ? "BASELINE REQUIRED" : k.current == null ? "측정중" : "증거 축적중";
            return (
              <div key={k.key} data-testid={`kpi-${k.key}`} className="flex flex-col rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between gap-2"><span className="text-[0.8rem] font-bold text-ink-soft">{KIND_LABEL[k.key]} KPI</span><StatusBadge tone={EV_TONE[status]}>{status}</StatusBadge></div>
                <div className="mt-1.5 font-bold leading-snug">{k.name}</div>
                <dl className="mt-3 space-y-1.5 text-[0.86rem]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-soft">BASELINE</dt>
                    {k.baseline ? (
                      <dd className="text-right"><span className="tabular font-semibold">{formatKpiValue(k.baseline.value, k.unit)}</span><span className="block text-[0.78rem] text-ink-soft">{k.baseline.periodFrom ? `${formatDateKR(k.baseline.periodFrom)}~${formatDateKR(k.baseline.periodTo)} · ` : ""}{BASELINE_SOURCE_LABEL[k.baseline.source]}</span></dd>
                    ) : <dd className="font-semibold" style={{ color: "var(--warning)" }}>REQUIRED / UNKNOWN</dd>}
                  </div>
                  <div className="flex justify-between gap-2"><dt className="text-ink-soft">현재 (최근 28일)</dt><dd className="text-right"><span className="tabular font-semibold">{formatKpiValue(k.current, k.unit)}</span><span className="block text-[0.78rem] text-ink-soft">{k.sampleLabel}</span></dd></div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink-soft">Baseline 대비</dt>
                    <dd className="tabular text-right font-semibold" style={k.change ? { color: k.change.improved ? "var(--success)" : "var(--danger)" } : undefined}>
                      {k.change ? `${formatChange(k.change, k.unit)} ${k.change.improved ? "개선" : "악화"}` : <span className="font-normal text-ink-soft">{k.baseline ? "측정값 대기" : "Baseline 잠금 후 표시"}</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2"><dt className="text-ink-soft">방향</dt><dd>{k.direction === "lower" ? "낮을수록 좋음" : "높을수록 좋음"}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-ink-soft">TARGET</dt><dd className="font-semibold">DO NOT INVENT</dd></div>
                </dl>
                <p className="mt-2 text-[0.78rem] text-ink-soft">측정: {k.method}</p>
                <BaselineHistory items={k.history} />
                {can(role, "manage_org") && (
                  <button className="btn-secondary mt-auto !min-h-[40px] text-[0.85rem]" style={{ marginTop: "0.9rem" }} onClick={() => setLockKpi(k)}>
                    <Lock size={15} aria-hidden /> {k.baseline ? "다시 잠금 (이력 보존)" : "Baseline 잠금"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[0.8rem] text-ink-soft">현재 측정값은 {isLive ? "Supabase 실데이터" : "DEMO 기준값 + 이 브라우저에서 발생한 행동"} 기준입니다. Baseline 잠금 전에는 개선률을 표시하지 않으며, 표본이 적으면 변화율은 참고용입니다.{!can(role, "manage_org") && " Baseline 잠금은 대표(OWNER) 권한입니다."}</p>
      </DataCard>

      <DataCard className="mt-6" id="proofs" title="Proof Event — 판단·실행·결과" action={can(role, "execute_action") && <button className="btn-secondary !min-h-[40px] text-[0.86rem]" onClick={() => setManual(true)}><Plus size={15} aria-hidden /> 수동 Proof 기록</button>}>
        {proofs.length === 0 ? (
          <EmptyState title="아직 Proof Event가 없습니다" desc="AI Growth Center에서 Action을 승인·실행하고 결과를 기록하면 자동으로 생성됩니다." action={<Link href="/ax/growth" className="btn-primary">Action 처리하러 가기</Link>} />
        ) : (
          <ul className="stagger space-y-3">{proofs.map((p) => <ProofItem key={p.id} p={p} canConfirm={can(role, "confirm_proof")} onStatus={async (status) => {
            try { await run((s) => s.updateProof(p.id, { status, resultConfirmedAt: status === "RESULT_CONFIRMED" ? new Date().toISOString() : null })); toast(status === "RESULT_CONFIRMED" ? "결과를 확정했습니다" : "반려했습니다"); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
          }} />)}</ul>
        )}
      </DataCard>

      <div className="mt-6 grid gap-6 @4xl:grid-cols-2">
        {([["Operating Evidence (운영 증거)", operating], ["Enterprise Value Evidence (기업가치 증거)", enterprise]] as const).map(([title, items]) => (
          <DataCard key={title} title={title}>
            <ul className="space-y-2">
              {items.map(([name, desc, st]) => (
                <li key={name} className="flex items-start justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3">
                  <span><span className="block font-semibold">{name}</span><span className="text-[0.86rem] text-ink-soft">{desc}</span></span>
                  <StatusBadge tone={EV_TONE[st]}>{st}</StatusBadge>
                </li>
              ))}
            </ul>
          </DataCard>
        ))}
      </div>

      <DataCard className="mt-6" title="12주 Evidence Plan">
        <ol className="grid gap-3 @3xl:grid-cols-4">
          {PLAN.map((p) => {
            const active = week != null && week >= p.weeks[0] && week <= p.weeks[1];
            return (
              <li key={p.title} className="rounded-xl border-2 p-4" style={{ borderColor: active ? "var(--primary)" : "var(--border)", background: active ? "var(--primary-soft)" : undefined }}>
                <div className="font-bold leading-snug">{p.title}</div>
                <p className="mt-1 text-[0.86rem] text-ink-soft">{p.desc}</p>
                {active && <StatusBadge tone="primary">현재 단계</StatusBadge>}
              </li>
            );
          })}
        </ol>
      </DataCard>

      <DataCard className="mt-6" title="Before / After — 운영 방식 (정성)">
        <ul className="grid gap-3 @3xl:grid-cols-2">
          {[
            ["데이터 확인", "채널 관리자 화면·엑셀에 분산", "한 화면에서 4주 판매·재고·고객 행동"],
            ["생산 판단", "경험 의존", "판매속도·재고일수 근거 + 사람 승인"],
            ["고객 반응", "외부 플랫폼에 흩어짐", "Finder·Passport·찜이 자사 DB로"],
            ["실행 추적", "구두 지시, 결과 기록 없음", "Action 5단계 + Proof Event"],
          ].map(([l, b, a]) => (
            <li key={l} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold">{l}</div>
              <div className="mt-2 grid gap-2 text-[0.88rem] @xl:grid-cols-2">
                <div className="rounded-lg bg-surface-muted p-2.5 text-ink-soft">Before · {b}</div>
                <div className="rounded-lg p-2.5 font-medium" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>After · {a}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.8rem] text-ink-soft">정량 Before/After는 Baseline 확정 후 실측값으로만 표시합니다.</p>
      </DataCard>

      {lockKpi && <BaselineLockModal kpi={lockKpi} range={range} onClose={() => setLockKpi(null)} />}
      {manual && <ManualProof onClose={() => setManual(false)} onSave={async (p) => {
        try { await run((s) => s.createProof({ ...p, actorName, dataSource: "MANUAL", status: "RECORDED" })); toast("수동 Proof를 기록했습니다"); setManual(false); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
      }} />}
    </div>
  );
}

function ProofItem({ p, canConfirm, onStatus }: { p: ProofEvent; canConfirm: boolean; onStatus: (s: ProofEvent["status"]) => void }) {
  const tone: Tone = p.status === "RESULT_CONFIRMED" ? "success" : p.status === "REJECTED" ? "neutral" : "info";
  return (
    <li className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={tone}>{p.status === "RESULT_CONFIRMED" ? "RESULT CONFIRMED" : p.status === "REJECTED" ? "반려" : "측정중"}</StatusBadge>
        <StatusBadge tone="neutral">{p.eventType}</StatusBadge>
        <StatusBadge tone={p.dataSource === "SUPABASE LIVE" || p.dataSource === "MANUAL" ? "primary" : "warning"}>{p.dataSource}</StatusBadge>
        <span className="text-[0.8rem] text-ink-soft">{formatDateTimeKR(p.createdAt)} · {p.actorName}</span>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[0.9rem] @3xl:grid-cols-2">
        <div><dt className="inline font-semibold">Trigger · </dt><dd className="inline text-ink-soft">{p.trigger}</dd></div>
        <div><dt className="inline font-semibold">Decision ({p.decisionMethod}) · </dt><dd className="inline text-ink-soft">{p.decision}</dd></div>
        <div><dt className="inline font-semibold">승인 · </dt><dd className="inline text-ink-soft">{p.humanApproval}</dd></div>
        <div><dt className="inline font-semibold">Action · </dt><dd className="inline text-ink-soft">{p.action}</dd></div>
        <div className="@3xl:col-span-2"><dt className="inline font-semibold">Result · </dt><dd className="inline">{p.result}</dd></div>
      </dl>
      {(p.kpiBefore.length > 0 || p.kpiAfter.length > 0) && (
        <div className="mt-3 grid gap-2 text-[0.84rem] @xl:grid-cols-2">
          {[["KPI Before", p.kpiBefore], ["KPI After", p.kpiAfter]].map(([t, list]) => (
            <div key={t as string} className="rounded-lg bg-surface-muted p-2.5">
              <div className="font-semibold">{t as string}</div>
              {(list as ProofEvent["kpiBefore"]).map((k) => <div key={k.label} className="flex justify-between"><span className="text-ink-soft">{k.label}</span><span className="tabular">{k.value}</span></div>)}
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {p.evidenceLink && <a href={p.evidenceLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.86rem] font-semibold" style={{ color: "var(--primary)" }}>증빙 <ExternalLink size={13} aria-hidden /></a>}
        {p.status === "RECORDED" && canConfirm && (
          <>
            <button className="btn-primary !min-h-[38px] text-[0.85rem]" onClick={() => onStatus("RESULT_CONFIRMED")}><CheckCircle2 size={15} aria-hidden /> 결과 확정</button>
            <button className="btn-secondary !min-h-[38px] text-[0.85rem]" onClick={() => onStatus("REJECTED")}><XCircle size={15} aria-hidden /> 반려</button>
          </>
        )}
        {p.status === "RECORDED" && !canConfirm && <span className="text-[0.8rem] text-ink-soft">결과 확정은 대표(OWNER) 권한</span>}
        {p.resultConfirmedAt && <span className="text-[0.8rem] text-ink-soft">확정 {formatDateTimeKR(p.resultConfirmedAt)}</span>}
      </div>
    </li>
  );
}

function ManualProof({ onClose, onSave }: { onClose: () => void; onSave: (p: Omit<ProofEvent, "id" | "createdAt" | "actorName" | "dataSource" | "status">) => void }) {
  const [f, setF] = useState({ trigger: "", decision: "", action: "", result: "", before: "", after: "", link: "" });
  const kv = (s: string) => s.split("\n").map((l) => l.split(":")).filter(([a, b]) => a?.trim() && b?.trim()).map(([label, value]) => ({ label: label.trim(), value: value.trim() }));
  const ok = f.trigger.trim() && f.decision.trim() && f.action.trim() && f.result.trim();
  return (
    <Modal open onClose={onClose} title="수동 Proof 기록" maxWidth="max-w-2xl">
      <p className="mb-3 text-[0.88rem] text-ink-soft">시스템 밖에서 한 판단·실행도 근거와 함께 기록합니다. 관찰된 사실만 입력하세요.</p>
      <div className="grid gap-3 @xl:grid-cols-2">
        {([["trigger", "Trigger (무엇을 보고)"], ["decision", "Decision (무엇을 결정)"], ["action", "Action (실제로 한 일)"], ["result", "Result (관찰된 결과)"]] as const).map(([k, l]) => (
          <div key={k}><label className="field-label" htmlFor={`mp-${k}`}>{l}</label><textarea id={`mp-${k}`} className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <div><label className="field-label" htmlFor="mp-before">KPI Before (줄마다 이름: 값)</label><textarea id="mp-before" className="field" placeholder="주간 취합 시간: 3시간" value={f.before} onChange={(e) => setF({ ...f, before: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="mp-after">KPI After</label><textarea id="mp-after" className="field" value={f.after} onChange={(e) => setF({ ...f, after: e.target.value })} /></div>
        <div className="@xl:col-span-2"><label className="field-label" htmlFor="mp-link">증빙 링크 (선택)</label><input id="mp-link" className="field" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" disabled={!ok} onClick={() => onSave({ eventType: "MANUAL", trigger: f.trigger.trim(), decision: f.decision.trim(), decisionMethod: "HUMAN", why: "", humanApproval: "수동 기록", action: f.action.trim(), result: f.result.trim(), kpiBefore: kv(f.before), kpiAfter: kv(f.after), evidenceLink: f.link.trim() || null })}>기록</button>
      </div>
    </Modal>
  );
}
