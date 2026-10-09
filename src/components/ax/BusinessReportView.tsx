"use client";

import { Download, Printer } from "lucide-react";
import { StatusBadge } from "./Cards";
import { useModel } from "@/components/providers/DataProvider";
import { isLive, DATA_SOURCE_LABEL } from "@/lib/config";
import { formatDateKR, formatDateTimeKR } from "@/lib/date";
import { formatPrice } from "@/lib/analytics";
import { monthLabel } from "@/lib/monthly";
import { BASELINE_SOURCE_LABEL, formatKpiValue } from "@/lib/evidence";
import { downloadCSV } from "@/lib/export";
import { buildBusinessReport, businessReportRows, type Share } from "@/lib/business-report";

/* 사업화 실적 자료 — 정책자금·보증·벤처 신청서에 첨부할 '시스템 기록 근거'. 인쇄·PDF·CSV.
   평가 문장·전망·회사 소개는 쓰지 않는다 (신청서 본문은 대표가 작성). */
const pct = (v: number | null, signed = false) => (v == null ? "—" : `${signed && v > 0 ? "+" : ""}${Math.round(v * 1000) / 10}%`);

export function BusinessReportView() {
  const m = useModel();
  const r = buildBusinessReport(m.snapshot, m.today, isLive);
  const max = Math.max(1, ...r.sales.monthly.map((x) => x.revenue));
  const empty = r.coverage.salesRows === 0;

  return (
    <div>
      <div data-print="hide" className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.88rem] text-ink-soft">정책자금·보증·벤처 신청서의 매출·판로·운영 실적 근거로 첨부합니다. 숫자는 모두 시스템 기록에서 계산되며, 회사 개요·재무제표·인증은 원본 서류를 사용합니다.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary !min-h-[40px] text-[0.88rem]" onClick={() => downloadCSV(`miryeo_business_evidence_${m.today}.csv`, businessReportRows(r))}><Download size={15} aria-hidden /> 근거 데이터 CSV</button>
          <button className="btn-primary !min-h-[40px] text-[0.88rem]" onClick={() => window.print()}><Printer size={15} aria-hidden /> 인쇄 / PDF 저장</button>
        </div>
      </div>

      <article data-testid="business-report" className="ax-card p-6 @3xl:p-9 print:!border-0 print:!p-0">
        <header className="border-b pb-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.8rem] font-semibold tracking-wide text-ink-soft">사업화 실적 자료 · 시스템 기록 근거</p>
              <h2 className="mt-1 text-[1.5rem] font-bold">{m.snapshot.org.name}</h2>
              <p className="tabular mt-1 text-[0.95rem]">{formatDateKR(r.from)} ~ {formatDateKR(r.to)} (최근 {r.months.length}개월)</p>
            </div>
            <div className="text-right text-[0.84rem]">
              <StatusBadge tone={isLive ? "success" : "warning"}>{DATA_SOURCE_LABEL}</StatusBadge>
              <div className="mt-1.5 text-ink-soft">작성 {formatDateTimeKR(new Date().toISOString())}</div>
              <div className="text-ink-soft">MIRYEO Business AX 자동 집계</div>
            </div>
          </div>
          {!isLive && <p className="mt-3 rounded-lg p-2.5 text-[0.88rem] font-bold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }} data-testid="business-demo-warning">DEMO 데이터 — 시연용 예시입니다. 실제 실적이 아니므로 신청서에 제출할 수 없습니다.</p>}
          {isLive && (r.excluded.demoProducts > 0 || r.excluded.seedSales > 0) && <p className="mt-3 text-[0.84rem] text-ink-soft">Demo 표시 상품 {r.excluded.demoProducts}개와 그 판매·시드 {r.excluded.seedSales}행은 제외했습니다.</p>}
        </header>

        {empty ? (
          <p className="mt-6 rounded-xl bg-surface-muted p-4 text-[0.92rem]">기간 안에 판매 기록이 없습니다. 데이터 관리에서 판매 파일을 올리면 이 자료가 자동으로 채워집니다.</p>
        ) : (
          <>
            <Section n={1} title="매출 추이">
              <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
                <Stat label={`기간 매출 (${r.coverage.monthsWithSales}개월 판매)`} value={formatPrice(r.sales.total)} />
                <Stat label="판매 수량" value={`${r.sales.units.toLocaleString()}개`} />
                <Stat label={`최근 완료 3개월 (${r.sales.recentLabel})`} value={formatPrice(r.sales.recent3)} sub={`직전 3개월 대비 ${pct(r.sales.growth3, true)}`} />
                <Stat label="매출총이익률 (원가 입력 상품)" value={pct(r.sales.grossMargin)} sub={r.sales.costedShare != null ? `원가 입력 매출 ${pct(r.sales.costedShare)}` : undefined} />
              </div>
              <table className="mt-3 w-full text-[0.84rem]" data-testid="business-monthly">
                <thead><tr className="text-left text-ink-soft"><th className="w-[72px] py-1 font-semibold">월</th><th className="py-1 font-semibold">매출</th><th className="w-[120px] py-1 text-right font-semibold">금액</th></tr></thead>
                <tbody>
                  {r.sales.monthly.map((x) => (
                    <tr key={x.month} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="tabular py-1">{monthLabel(x.month)}{x.month === r.sales.partialMonth && <span className="block text-[0.7rem] text-ink-soft">진행 중</span>}</td>
                      <td className="py-1 pr-3"><span className="block h-2.5 rounded-full" style={{ width: `${Math.max(x.revenue > 0 ? 2 : 0, Math.round((x.revenue / max) * 100))}%`, background: "var(--primary)" }} aria-hidden /></td>
                      <td className="tabular py-1 text-right">{x.revenue ? formatPrice(x.revenue) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section n={2} title="판매 채널 · 기업 간 거래(B2B) · 수출">
              <div className="grid gap-4 @3xl:grid-cols-2">
                <ShareList title={`채널 유형별 (판매 채널 ${r.channels.activeCount}곳)`} rows={r.channels.byType.map((c) => ({ name: c.type, revenue: c.revenue, share: c.share }))} />
                <ShareList title="매출 상위 채널" rows={r.channels.top} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 @xl:grid-cols-4">
                <Stat label="B2B 거래처 (거래중)" value={`${r.b2b.accounts}곳 (${r.b2b.active})`} />
                <Stat label="B2B 누적 거래액 (입력값)" value={formatPrice(r.b2b.cumulativeRevenue)} />
                <Stat label="수출 권역" value={`${r.exports.regions}곳`} />
                <Stat label="수출 누적액 (입력값)" value={formatPrice(r.exports.cumulativeRevenue)} />
              </div>
              {r.exports.list.length > 0 && <p className="mt-2 text-[0.82rem] text-ink-soft">수출: {r.exports.list.map((e) => `${e.region} ${formatPrice(e.revenue)}`).join(" · ")}</p>}
            </Section>

            <Section n={3} title="제품">
              <div className="grid gap-4 @3xl:grid-cols-[1fr_2fr]">
                <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-1">
                  <Stat label="등록 SKU" value={`${r.products.skus}개`} />
                  <Stat label="고객 화면 공개" value={`${r.products.published}개`} />
                </div>
                <ShareList title="매출 상위 제품" rows={r.products.top} />
              </div>
            </Section>
          </>
        )}

        <Section n={4} title="고객 반응 (MIRYEO AI Beauty)">
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3">
            <Stat label="AI 제품 추천 완료 (세션)" value={r.customers.finderSessions.toLocaleString()} />
            <Stat label="추천 결과 확인 (세션)" value={r.customers.recommendationViews.toLocaleString()} />
            <Stat label="구매처 이동" value={`${r.customers.outboundClicks.toLocaleString()}건`} />
            <Stat label="뷰티 기록 저장 (세션)" value={r.customers.passportSaves.toLocaleString()} />
            <Stat label="회원 (동의 가입)" value={`${r.customers.members}명`} />
            <Stat label="기록된 구매" value={`${r.customers.purchasesRecorded}건`} />
          </div>
        </Section>

        <Section n={5} title="AX 시스템 운영 실적">
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3">
            <Stat label="RULE 감지 Action" value={`${r.ax.created}건`} />
            <Stat label="실행 완료" value={`${r.ax.done}건`} />
            <Stat label="현재 진행 중" value={`${r.ax.open}건`} />
            <Stat label="Proof 기록" value={`${r.ax.proofsRecorded}건`} />
            <Stat label="Proof 결과 확정 (대표)" value={`${r.ax.proofsConfirmed}건`} />
            <Stat label="실증 시작 · AX OWNER" value={`${r.ax.pilotStartedOn ? formatDateKR(r.ax.pilotStartedOn) : "미지정"} · ${r.ax.axOwner || "미지정"}`} />
          </div>
          <table className="mt-3 w-full text-[0.84rem]">
            <thead><tr className="text-left text-ink-soft"><th className="py-1 font-semibold">Money KPI (최근 28일)</th><th className="py-1 font-semibold">현재</th><th className="py-1 font-semibold">Baseline (도입 전 기준)</th></tr></thead>
            <tbody>
              {r.ax.kpis.map((k) => (
                <tr key={k.key} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1.5 pr-2">{k.name}<div className="text-[0.74rem] text-ink-soft">{k.sampleLabel}</div></td>
                  <td className="tabular py-1.5 pr-2">{formatKpiValue(k.current, k.unit)}</td>
                  <td className="py-1.5">{k.baseline ? `${formatKpiValue(k.baseline.value, k.unit)} · ${BASELINE_SOURCE_LABEL[k.baseline.source]}` : "없음 — 개선률 제시 불가"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section n={6} title="데이터 출처·범위">
          <ul className="list-disc space-y-1 pl-5 text-[0.86rem]">
            <li>판매 기록 {r.coverage.salesRows.toLocaleString()}행 · {r.coverage.firstSale ? `${formatDateKR(r.coverage.firstSale)} ~ ${formatDateKR(r.coverage.lastSale)}` : "없음"} · 직접 입력 {r.coverage.bySource.manual} · 파일 {r.coverage.bySource.csv}{r.coverage.bySource.seed ? ` · Demo 시드 ${r.coverage.bySource.seed}` : ""}</li>
            <li>B2B·수출 누적액은 거래처·권역별로 입력한 값이며 판매 기록과 별도입니다.</li>
            <li>판단 방식: 규칙(RULE)·통계. Action은 사람이 승인·실행하고, Proof는 대표가 결과를 확정한 것만 '확정'으로 셉니다.</li>
            <li>이 자료는 평가나 전망을 포함하지 않습니다. 해석·사업계획은 신청서 본문에 작성합니다.</li>
          </ul>
        </Section>
      </article>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="print-break-avoid mt-7">
      <h3 className="mb-3 text-[1.1rem] font-bold"><span className="tabular text-ink-soft">{n}.</span> {title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-muted px-3.5 py-3">
      <div className="text-[0.78rem] text-ink-soft">{label}</div>
      <div className="break-any tabular mt-0.5 text-[1.15rem] font-bold">{value}</div>
      {sub && <div className="tabular text-[0.8rem] text-ink-soft">{sub}</div>}
    </div>
  );
}

function ShareList({ title, rows }: { title: string; rows: Share[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[0.84rem] font-semibold">{title}</div>
      {rows.length === 0 ? <p className="text-[0.84rem] text-ink-soft">기록 없음</p> : (
        <ul className="space-y-1.5">
          {rows.map((x) => (
            <li key={x.name} className="text-[0.84rem]">
              <div className="flex justify-between gap-2"><span className="break-any min-w-0">{x.name}</span><span className="tabular shrink-0">{formatPrice(x.revenue)} · {Math.round(x.share * 100)}%</span></div>
              <span className="mt-0.5 block h-1.5 rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${Math.round(x.share * 100)}%`, background: "var(--primary)" }} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
