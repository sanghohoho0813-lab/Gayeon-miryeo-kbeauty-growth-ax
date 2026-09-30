"use client";

import { DataCard } from "./Cards";
import { ExportButton } from "./ExportButton";
import { ACTION_STATUS_LABEL } from "./Cards";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can, type Permission } from "@/lib/permissions";
import { EVENT_LABEL } from "@/lib/analytics";
import { monthLabel, monthlySummary } from "@/lib/monthly";
import { outstanding, overdueDays, SETTLEMENT_KIND_LABEL, SETTLEMENT_STATUS_LABEL } from "@/lib/settlements";
import type { CsvRow } from "@/lib/export";

/* 데이터 내보내기 (계약 제5조 "CSV·엑셀 입력 또는 내보내기") — 권한별 제한, 고객 개인정보 제외 */
export function ExportCenter() {
  const m = useModel();
  const { role } = useSession();
  const s = m.snapshot;
  const pName = (id: string) => m.productById.get(id)?.name ?? "";
  const cName = (id: string) => s.channels.find((c) => c.id === id)?.name ?? "";
  const fin = can(role, "view_financials");

  const items: { name: string; file: string; desc: string; perm?: Permission; rows: () => CsvRow[] }[] = [
    { name: "판매기록", file: "sales", desc: "판매일·상품·채널·수량·매출·입력방식 (최근 약 13개월)", perm: "view_financials", rows: () => [...s.sales].sort((a, b) => a.saleDate.localeCompare(b.saleDate)).map((r) => ({ 판매일: r.saleDate, SKU: m.productById.get(r.productId)?.sku ?? "", 상품: pName(r.productId), 채널: cName(r.channelId), 수량: r.units, 매출: r.revenue, 입력: r.source })) },
    { name: "상품목록", file: "products", desc: "SKU·이름·카테고리·판매가·(원가)·사용기간·공개 여부 — 상품 일괄 등록 양식과 호환", rows: () => s.products.map((p) => ({ SKU: p.sku, 제품명: p.name, 카테고리: p.category, 판매가: p.price, ...(fin ? { 원가: p.cost ?? "" } : {}), 피부고민: p.concerns.join(";"), 사용감: p.texture ?? "", 루틴단계: p.routineStep ?? "", 사용기간: p.usageDays ?? "", 구매링크: p.purchaseLinks[0]?.url ?? "", 공개여부: p.isPublished ? "Y" : "N" })) },
    { name: "재고현황", file: "inventory", desc: "SKU별 현재·안전·입고예정 재고, 판매속도·예상 소진일", rows: () => s.products.map((p) => { const mm = m.metrics.get(p.id); const inv = s.inventory.find((i) => i.productId === p.id); return { SKU: p.sku, 상품: p.name, 현재재고: inv?.currentStock ?? "", 안전재고: inv?.safetyStock ?? "", 입고예정: inv?.incomingStock ?? "", 일판매속도: mm ? Math.round(mm.dailyVelocity * 10) / 10 : "", 소진예상일수: mm && Number.isFinite(mm.daysOfStock) ? Math.round(mm.daysOfStock) : "", 상태: mm?.stockStatus ?? "" }; }) },
    { name: "월별실적", file: "monthly", desc: "최근 12개월 매출·수량·매출총이익", perm: "view_financials", rows: () => monthlySummary(s.sales, s.products, s.channels, m.today, 12).map((r) => ({ 월: monthLabel(r.month), 매출: r.revenue, 수량: r.units, 매출총이익: r.grossProfit, 원가입력매출: r.costedRevenue })) },
    { name: "정산_미수금", file: "settlements", desc: "청구·입금·잔액·연체일수", perm: "view_financials", rows: () => s.settlements.map((x) => ({ 구분: SETTLEMENT_KIND_LABEL[x.kind], 거래처: x.counterparty, 내용: x.description ?? "", 청구액: x.amount, 입금액: x.paidAmount, 잔액: outstanding(x), 청구일: x.issuedOn, 입금기한: x.dueOn ?? "", 상태: SETTLEMENT_STATUS_LABEL[x.status], 연체일수: overdueDays(x, m.today) })) },
    { name: "GrowthAction_이력", file: "growth_actions", desc: "Action·상태 전환 이력 (누가·언제·무엇을) — 실증 자료", rows: () => s.actionEvents.map((e) => { const a = s.actions.find((x) => x.id === e.growthActionId); return { 시각: e.createdAt, Action: a?.title ?? "", 분류: a?.category ?? "", 판단방식: a?.decisionMethod ?? "", 이전상태: e.fromStatus ? ACTION_STATUS_LABEL[e.fromStatus] : "", 변경상태: ACTION_STATUS_LABEL[e.toStatus], 메모: e.note ?? "", 처리자: e.actorName }; }) },
    { name: "ProofEvent", file: "proof_events", desc: "판단·실행·결과·KPI 전후·확정 여부 — 실증 자료", rows: () => s.proofEvents.map((p) => ({ 기록시각: p.createdAt, 유형: p.eventType, Trigger: p.trigger, 판단: p.decision, 판단방식: p.decisionMethod, 실행: p.action, 결과: p.result, KPI_전: p.kpiBefore.map((k) => `${k.label} ${k.value}`).join(" / "), KPI_후: p.kpiAfter.map((k) => `${k.label} ${k.value}`).join(" / "), 데이터출처: p.dataSource, 상태: p.status, 확정시각: p.resultConfirmedAt ?? "", 기록자: p.actorName })) },
    { name: "고객행동_일별", file: "customer_events_daily", desc: "고객 화면 행동 일별 건수 (익명 집계, 개인정보 없음)", rows: () => {
      const byDay = new Map<string, Record<string, number>>();
      for (const e of s.customerEvents) { const d = e.createdAt.slice(0, 10); const row = byDay.get(d) ?? {}; row[EVENT_LABEL[e.eventType]] = (row[EVENT_LABEL[e.eventType]] ?? 0) + 1; byDay.set(d, row); }
      return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, r]) => ({ 날짜: d, ...r }));
    } },
  ];

  return (
    <DataCard title="데이터 내보내기 (CSV · 엑셀에서 바로 열림)">
      <ul className="grid gap-3 @3xl:grid-cols-2">
        {items.map((it) => {
          const allowed = !it.perm || can(role, it.perm);
          return (
            <li key={it.name} className="flex items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <span className="min-w-0"><span className="block font-semibold">{it.name.replace(/_/g, " ")}</span><span className="text-[0.84rem] text-ink-soft">{allowed ? it.desc : "대표·관리자 권한"}</span></span>
              <ExportButton name={it.name} file={it.file} rows={it.rows} label="내보내기" disabled={!allowed} />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[0.8rem] text-ink-soft">고객 회원 개인정보(이메일·이름)는 내보내기를 제공하지 않습니다. 필요 시 대표 승인 후 별도 처리합니다. Demo 모드 파일명에는 _DEMO가 붙습니다.</p>
    </DataCard>
  );
}
