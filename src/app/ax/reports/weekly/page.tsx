"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { StatusBadge } from "@/components/ax/Cards";
import { BriefingCard } from "@/components/ax/BriefingCard";
import { ACTION_STATUS_LABEL } from "@/components/ax/Cards";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive, DATA_SOURCE_LABEL } from "@/lib/config";
import { addDaysISO, daysBetween, formatDateKR, formatDateTimeKR } from "@/lib/date";
import { formatKRW } from "@/lib/analytics";
import { formatChange, formatKpiValue, inDateRange, measureMoneyKpis, weekRange } from "@/lib/evidence";
import type { KpiSnapshot } from "@/lib/types";

/* 주간 Evidence 리포트 — 시스템에 기록된 사실만 집계. 인쇄(PDF 저장)용 레이아웃. */

function Inner() {
  const m = useModel();
  const { role } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.get("w") ?? "") ? params.get("w")! : m.today;
  const r = weekRange(anchor);
  const isCurrent = r.to >= m.today;
  const s = m.snapshot;
  const fin = can(role, "view_financials");
  const go = (d: string) => router.replace(`/ax/reports/weekly?w=${d}`, { scroll: false });

  const inWeek = (iso: string) => inDateRange(iso, r);
  const created = s.actions.filter((a) => inWeek(a.createdAt));
  const ev = s.actionEvents.filter((e) => inWeek(e.createdAt));
  const approved = ev.filter((e) => e.toStatus === "IN_PROGRESS").length;
  const doneEvents = ev.filter((e) => e.toStatus === "DONE");
  const dismissed = ev.filter((e) => e.toStatus === "DISMISSED").length;
  const doneActions = doneEvents.map((e) => s.actions.find((a) => a.id === e.growthActionId)).filter((a): a is NonNullable<typeof a> => !!a);
  const proofsCreated = s.proofEvents.filter((p) => inWeek(p.createdAt));
  const proofsConfirmed = s.proofEvents.filter((p) => p.resultConfirmedAt && inWeek(p.resultConfirmedAt));
  const events = s.customerEvents.filter((e) => inWeek(e.createdAt));
  const sessions = (t: string) => new Set(events.filter((e) => e.eventType === t).map((e) => e.sessionId)).size;
  const count = (t: string) => events.filter((e) => e.eventType === t).length;
  const sales = s.sales.filter((x) => x.saleDate >= r.from && x.saleDate <= r.to);
  const manualSales = sales.filter((x) => x.source !== "seed");
  const money = measureMoneyKpis(s, r);
  const open = m.actions.filter((a) => a.status === "NEW" || a.status === "REVIEWED" || a.status === "IN_PROGRESS").slice(0, 5);
  const pilotWeek = s.org.pilotStartedOn ? Math.floor(daysBetween(s.org.pilotStartedOn, r.from) / 7) : null;

  const gaps = [
    !s.org.pilotStartedOn && "Pilot 시작일(Week 0) 미지정",
    !s.org.axOwnerName && "AX OWNER 미지정",
    money.some((k) => !k.baseline) && `Money KPI Baseline 미잠금 ${money.filter((k) => !k.baseline).map((k) => k.key).join(", ")}`,
    manualSales.length === 0 && "이번 주 직접 입력한 판매 데이터 없음",
    events.length === 0 && "이번 주 고객 이벤트 없음",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[980px]">
      <div data-print="hide" className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/ax/reports" className="btn-ghost !min-h-[40px] text-[0.9rem]"><ArrowLeft size={16} aria-hidden /> 실증·Evidence</Link>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary !min-h-[40px] !px-3" aria-label="이전 주" onClick={() => go(addDaysISO(r.from, -7))}><ChevronLeft size={17} /></button>
          <span className="tabular min-w-[190px] text-center text-[0.92rem] font-semibold">{formatDateKR(r.from)} ~ {formatDateKR(r.to)}</span>
          <button className="btn-secondary !min-h-[40px] !px-3" aria-label="다음 주" disabled={isCurrent} onClick={() => go(addDaysISO(r.from, 7))}><ChevronRight size={17} /></button>
          <button className="btn-primary !min-h-[40px] text-[0.9rem]" onClick={() => window.print()}><Printer size={16} aria-hidden /> 인쇄 / PDF 저장</button>
        </div>
      </div>

      <article data-testid="weekly-report" className="ax-card p-6 @3xl:p-9 print:!border-0 print:!p-0">
        <header className="border-b pb-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[0.82rem] font-bold tracking-wide text-ink-soft">MIRYEO BUSINESS AX · 주간 EVIDENCE 리포트</div>
              <h1 className="mt-1 text-[1.6rem] font-bold leading-tight">{s.org.name}</h1>
              <p className="tabular mt-1 text-[0.95rem]">{formatDateKR(r.from)} (월) ~ {formatDateKR(r.to)} (일){isCurrent ? " · 진행 중인 주" : ""}</p>
            </div>
            <div className="text-right text-[0.84rem]">
              <StatusBadge tone={isLive ? "success" : "warning"}>{DATA_SOURCE_LABEL}</StatusBadge>
              <div className="mt-1.5 text-ink-soft">Pilot {pilotWeek == null ? "시작일 미지정" : pilotWeek < 0 ? "시작 전" : `Week ${pilotWeek}`}</div>
              <div className="text-ink-soft">AX OWNER {s.org.axOwnerName || "REQUIRED / UNASSIGNED"}</div>
              <div className="text-ink-soft">작성 {formatDateTimeKR(new Date().toISOString())}</div>
            </div>
          </div>
          {!isLive && <p className="mt-3 rounded-lg p-2.5 text-[0.84rem] font-semibold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO 데이터 — 시연용이며 실증 자료로 사용할 수 없습니다.</p>}
        </header>

        {isCurrent && <div className="mt-6 print-break-avoid"><BriefingCard compact /></div>}

        <Section n={1} title="이번 주 운영 요약">
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
            <Stat label="새 Action (RULE 감지)" value={created.length} />
            <Stat label="승인 · 실행 착수" value={approved} />
            <Stat label="완료" value={doneEvents.length} />
            <Stat label="보류·제외" value={dismissed} />
            <Stat label="Proof 기록" value={proofsCreated.length} />
            <Stat label="Proof 결과 확정" value={proofsConfirmed.length} />
            <Stat label="Finder 완료 세션" value={sessions("finder_complete")} />
            <Stat label="Passport 저장 세션" value={sessions("passport_save")} />
            <Stat label="찜 추가" value={count("wishlist_add")} />
            <Stat label="구매채널 클릭" value={count("outbound_purchase_click")} />
            <Stat label="판매 입력 행 (직접)" value={manualSales.length} />
            {fin ? <Stat label="판매 매출 (기록 기준)" value={formatKRW(sales.reduce((a, x) => a + x.revenue, 0))} /> : <Stat label="판매 수량" value={sales.reduce((a, x) => a + x.units, 0)} />}
          </div>
        </Section>

        <Section n={2} title="Money KPI — Baseline 대비 (이번 주 측정)">
          <div tabIndex={0} className="table-scroll">
            <table className="w-full text-[0.88rem]">
              <thead><tr className="border-b text-left text-ink-soft" style={{ borderColor: "var(--border)" }}><th className="py-2 pr-3 font-semibold">KPI</th><th className="py-2 pr-3 font-semibold">Baseline</th><th className="py-2 pr-3 font-semibold">이번 주</th><th className="py-2 pr-3 font-semibold">변화</th><th className="py-2 font-semibold">표본</th></tr></thead>
              <tbody>
                {money.map((k) => (
                  <tr key={k.key} className="border-b align-top" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 pr-3"><b>{k.key}</b> · {k.name}</td>
                    <td className="tabular py-2 pr-3">{k.baseline ? formatKpiValue(k.baseline.value, k.unit) : <span style={{ color: "var(--warning)" }}>REQUIRED</span>}</td>
                    <td className="tabular py-2 pr-3">{formatKpiValue(k.current, k.unit)}</td>
                    <td className="tabular py-2 pr-3" style={k.change ? { color: k.change.improved ? "var(--success)" : "var(--danger)" } : undefined}>{k.change ? `${formatChange(k.change, k.unit)} ${k.change.improved ? "개선" : "악화"}` : "-"}</td>
                    <td className="py-2 text-ink-soft">{k.sampleLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.8rem] text-ink-soft">TARGET은 고객 확정 전 설정하지 않습니다 (DO NOT INVENT). 표본이 5 미만이면 변화는 참고용입니다.</p>
        </Section>

        <Section n={3} title={`완료된 Action (${doneActions.length})`}>
          {doneActions.length === 0 ? <Empty>이번 주 완료된 Action이 없습니다.</Empty> : (
            <ul className="space-y-2">
              {doneActions.map((a) => (
                <li key={a.id} className="print-break-avoid rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center gap-1.5"><StatusBadge tone="neutral">{a.category}</StatusBadge><b>{a.title}</b></div>
                  <p className="mt-1 text-[0.88rem] text-ink-soft">담당 {a.assigneeName ?? "-"} · 승인 {a.approvedBy ?? "-"}</p>
                  <p className="mt-1 text-[0.9rem]">결과: {a.resultNote ?? "-"}</p>
                  <KpiDiff before={a.kpiBefore} after={a.kpiAfter} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section n={4} title={`Proof Event (기록 ${proofsCreated.length} · 확정 ${proofsConfirmed.length})`}>
          {proofsCreated.length + proofsConfirmed.length === 0 ? <Empty>이번 주 Proof Event가 없습니다.</Empty> : (
            <ul className="space-y-2">
              {[...new Map([...proofsCreated, ...proofsConfirmed].map((p) => [p.id, p])).values()].map((p) => (
                <li key={p.id} className="print-break-avoid rounded-xl border p-3.5 text-[0.88rem]" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={p.status === "RESULT_CONFIRMED" ? "success" : p.status === "REJECTED" ? "neutral" : "info"}>{p.status === "RESULT_CONFIRMED" ? "결과 확정" : p.status === "REJECTED" ? "반려" : "측정중"}</StatusBadge>
                    <StatusBadge tone="neutral">{p.eventType}</StatusBadge>
                    <span className="text-ink-soft">{formatDateTimeKR(p.createdAt)} · {p.actorName}</span>
                  </div>
                  <p className="mt-1.5"><b>Trigger</b> {p.trigger}</p>
                  <p><b>Decision ({p.decisionMethod})</b> {p.decision}</p>
                  <p><b>Result</b> {p.result}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section n={5} title="다음 주 우선 과제">
          {open.length === 0 ? <Empty>열린 Action이 없습니다.</Empty> : (
            <ol className="space-y-1.5 text-[0.9rem]">
              {open.map((a, i) => <li key={a.id} className="flex gap-2"><span className="tabular font-bold">{i + 1}.</span><span><b>{a.title}</b> <span className="text-ink-soft">— {ACTION_STATUS_LABEL[a.status]} · {a.priority}</span></span></li>)}
            </ol>
          )}
          {gaps.length > 0 && (
            <div className="mt-4 rounded-xl p-3.5 text-[0.88rem]" style={{ background: "var(--warning-soft)" }}>
              <div className="font-bold" style={{ color: "var(--warning)" }}>실증 공백 (채워야 효과를 주장할 수 있음)</div>
              <ul className="mt-1 list-disc pl-5">{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
        </Section>

        <footer className="mt-8 border-t pt-4 text-[0.78rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
          이 리포트는 시스템에 기록된 사실(Action·Proof·고객 이벤트·판매 입력)만 집계합니다. 판단 방식은 RULE/STATISTICAL이며, 효과를 주장할 때는 Baseline·측정 기간·표본 수를 함께 제시해야 합니다. · 가연인터내셔널 MIRYEO Business AX · Powered by 미래AI랩
        </footer>
      </article>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[1.1rem] font-bold"><span className="tabular text-ink-soft">{n}.</span> {title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3.5 py-3">
      <div className="text-[0.78rem] text-ink-soft">{label}</div>
      <div className="tabular mt-0.5 text-[1.3rem] font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-surface-muted p-3.5 text-[0.9rem] text-ink-soft">{children}</p>;
}

function KpiDiff({ before, after }: { before?: KpiSnapshot[] | null; after?: KpiSnapshot[] | null }) {
  const labels = [...new Set([...(before ?? []), ...(after ?? [])].map((k) => k.label))];
  if (labels.length === 0) return null;
  return (
    <div className="mt-2 grid gap-1 text-[0.82rem] @xl:grid-cols-2">
      {labels.map((l) => (
        <div key={l} className="flex justify-between gap-2 rounded-lg bg-surface-muted px-2.5 py-1.5">
          <span className="text-ink-soft">{l}</span>
          <span className="tabular">{before?.find((k) => k.label === l)?.value ?? "-"} → {after?.find((k) => k.label === l)?.value ?? "-"}</span>
        </div>
      ))}
    </div>
  );
}

export default function WeeklyReportPage() {
  return <Suspense><Inner /></Suspense>;
}
