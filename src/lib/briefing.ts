import type { AxModel } from "./model";
import { formatKRW, INTEREST_GROWTH_MIN, INTEREST_THRESHOLD, OPEN_STATUSES } from "./analytics";
import { summarizeReceivables } from "./settlements";
import { repurchaseDue, repurchaseSchedule } from "./repurchase";
import { monthlySummary, marginRate } from "./monthly";
import { activeBaseline } from "./evidence";
import { daysBetween } from "./date";

/* 대표자용 브리핑 — RULE 기반 요약 (계약 별지 제1호 ④ "대표자용 요약").
   모든 문장은 시스템에 기록된 숫자에서 나오며, 근거가 없으면 문장을 만들지 않는다. LLM 문장 다듬기는 승인 시 연결(READY). */

export type BriefTone = "risk" | "warn" | "good" | "info";
export interface BriefLine { tone: BriefTone; topic: string; text: string; href?: string }
export interface Briefing { headline: string; lines: BriefLine[] }

const pct = (r: number) => `${r >= 0 ? "+" : ""}${Math.round(r * 100)}%`;

export function buildBriefing(m: AxModel, opts: { financial: boolean }): Briefing {
  const lines: BriefLine[] = [];
  const s = m.snapshot;
  const metrics = s.products.map((p) => ({ p, mm: m.metrics.get(p.id)! })).filter((x) => x.mm);

  // 매출 (재무 권한)
  if (opts.financial && m.kpis.revenue28 > 0) {
    const g = m.kpis.revenueGrowth;
    lines.push({ tone: g == null ? "info" : g >= 0 ? "good" : "warn", topic: "매출", text: `최근 4주 매출 ${formatKRW(m.kpis.revenue28)}${g == null ? "" : `, 이전 4주 대비 ${pct(g)}`}.`, href: "/ax/monthly" });
    const months = monthlySummary(s.sales, s.products, s.channels, m.today, 2);
    const last = months[0];
    const mr = marginRate(last);
    if (last.revenue > 0 && mr != null) lines.push({ tone: "info", topic: "이익", text: `지난달 매출총이익률 ${Math.round(mr * 100)}% (원가 입력 제품 기준, 판관비 제외).`, href: "/ax/monthly" });
  }

  // 제품 성장·부진
  const growing = metrics.filter((x) => x.mm.prev4wUnits > 0).sort((a, b) => b.mm.growthRate - a.mm.growthRate);
  if (growing[0] && growing[0].mm.growthRate > 0.1) lines.push({ tone: "good", topic: "성장", text: `${growing[0].p.name} 판매가 ${pct(growing[0].mm.growthRate)} 늘어 가장 빠르게 성장 중입니다.`, href: "/ax/products" });
  const falling = growing[growing.length - 1];
  if (falling && falling.mm.growthRate < -0.15) lines.push({ tone: "warn", topic: "부진", text: `${falling.p.name} 판매가 ${pct(falling.mm.growthRate)} 줄었습니다. 채널·노출 점검이 필요합니다.`, href: "/ax/products" });

  // 재고
  const risk = metrics.filter((x) => x.mm.stockStatus === "품절위험" || x.mm.stockStatus === "부족주의").sort((a, b) => a.mm.daysOfStock - b.mm.daysOfStock);
  if (risk.length) lines.push({ tone: risk.some((x) => x.mm.stockStatus === "품절위험") ? "risk" : "warn", topic: "재고", text: `재고 위험 ${risk.length}개 SKU — ${risk.slice(0, 2).map((x) => `${x.p.name} 약 ${Math.round(x.mm.daysOfStock)}일분`).join(", ")}.`, href: "/ax/products?tab=inventory" });

  // 미수금 (재무 권한)
  if (opts.financial) {
    const rs = summarizeReceivables(s.settlements, m.today);
    if (rs.overdueCount > 0) lines.push({ tone: "risk", topic: "미수금", text: `받을 돈 ${formatKRW(rs.outstanding)} 중 ${formatKRW(rs.overdueAmount)}(${rs.overdueCount}건)이 입금 기한을 넘겼습니다 (최장 ${rs.maxOverdueDays}일).`, href: "/ax/channels?tab=settlements" });
    else if (rs.outstanding > 0) lines.push({ tone: "info", topic: "미수금", text: `받을 돈 ${formatKRW(rs.outstanding)} — 연체 없음, 30일 내 도래 ${formatKRW(rs.dueIn30)}.`, href: "/ax/channels?tab=settlements" });
  }

  // 고객
  const c = m.customer;
  const hot = c.productInterest.find((pi) => pi.recentScore >= INTEREST_THRESHOLD && (pi.growth ?? 0) >= INTEREST_GROWTH_MIN);
  if (c.recent.finder_complete > 0 || hot) {
    const d = c.prev.finder_complete > 0 ? ` (이전 7일 ${c.prev.finder_complete}건)` : "";
    lines.push({ tone: hot ? "good" : "info", topic: "고객", text: `최근 7일 AI 추천 완료 ${c.recent.finder_complete}건${d}.${hot ? ` ${m.productById.get(hot.productId)?.name ?? ""} 관심이 급상승했습니다.` : ""}`, href: "/ax/customers" });
  }
  if (s.customerAccounts.length > 0) {
    const due = new Set(repurchaseDue(repurchaseSchedule(s.customerPurchases, m.productById, m.today)).map((d) => d.purchase.customerUserId));
    if (due.size > 0) lines.push({ tone: "info", topic: "재구매", text: `재구매 시점이 된 회원 ${due.size}명 (전체 회원 ${s.customerAccounts.length}명).`, href: "/ax/customers#members" });
  }

  // 실행
  const open = m.actions.filter((a) => OPEN_STATUSES.includes(a.status));
  const waiting = open.filter((a) => a.status !== "IN_PROGRESS" && daysBetween(a.createdAt.slice(0, 10), m.today) >= 3);
  if (open.length) lines.push({ tone: waiting.length ? "warn" : "info", topic: "실행", text: `열린 Action ${open.length}건 (우선 ${open.filter((a) => a.priority === "우선").length}건)${waiting.length ? `, 3일 넘게 승인·착수 대기 ${waiting.length}건` : ""}.`, href: "/ax/growth" });

  // 실증 공백
  const missingBaseline = (["COST", "REVENUE", "SCALE"] as const).filter((k) => !activeBaseline(s.baselines, k));
  if (!s.org.axOwnerName || missingBaseline.length) lines.push({ tone: "info", topic: "실증", text: `${!s.org.axOwnerName ? "AX OWNER 미지정" : ""}${!s.org.axOwnerName && missingBaseline.length ? " · " : ""}${missingBaseline.length ? `Baseline 미잠금 ${missingBaseline.join(", ")}` : ""} — 효과를 주장하려면 먼저 채워야 합니다.`, href: "/ax/reports#baseline" });

  const order: BriefTone[] = ["risk", "warn", "good", "info"];
  const top = [...lines].sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone))[0];
  const headline = !top ? "기록된 데이터가 아직 적어 요약할 내용이 없습니다." : top.tone === "risk" ? `오늘은 ${lines.filter((l) => l.tone === "risk").map((l) => l.topic).join("·")} 대응이 우선입니다.` : top.tone === "warn" ? `${lines.filter((l) => l.tone === "warn").map((l) => l.topic).join("·")} 점검이 필요합니다.` : "큰 위험 신호는 없습니다. 성장 제품과 실행 중인 Action을 확인하세요.";
  return { headline, lines: lines.slice(0, 10) };
}
