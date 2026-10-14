import type { AxModel } from "./model";
import type { Role } from "./types";
import { can } from "./permissions";
import { summarizeReceivables } from "./settlements";
import { checkDataQuality } from "./data-quality";
import { measureOutcome, doneAt } from "./action-outcome";
import { addDaysISO, daysBetween, formatDateKR, todayISO } from "./date";
import { formatKRW } from "./analytics";

/* 알림 센터 (PASS 13) — 화면마다 흩어진 '오늘 확인할 것'을 한 목록으로. 저장하지 않고 매번 데이터에서 계산한다
   (해결하면 저절로 사라짐 = 읽음 처리 불필요). 위험 → 주의 → 안내 순, 역할 권한은 메뉴와 같은 규칙. */

export type NoticeTone = "danger" | "warning" | "info" | "success";
export interface Notice { id: string; tone: NoticeTone; title: string; detail: string; href: string }

const ORDER: Record<NoticeTone, number> = { danger: 0, warning: 1, success: 2, info: 3 };

export function buildNotifications(m: AxModel, role: Role, opts: { allowPractice: boolean }): Notice[] {
  const s = m.snapshot;
  const out: Notice[] = [];
  const fin = can(role, "view_financials");

  // 1. 생산 착수 마감 — 지났거나 7일 이내, 진행 중 생산 없음 (RULE '생산 착수'와 같은 조건 중 급한 것)
  const inProd = new Set(s.production.filter((x) => x.status === "생산중" || x.status === "입고예정").map((x) => x.productId));
  const due = s.products
    .map((p) => ({ p, mm: m.metrics.get(p.id) }))
    .filter(({ p, mm }) => mm && mm.daysToDeadline != null && mm.daysToDeadline <= 7 && !inProd.has(p.id) && mm.recommendedOrder > 0)
    .sort((a, b) => a.mm!.daysToDeadline! - b.mm!.daysToDeadline!);
  if (due.length) {
    const passed = due.filter((x) => x.mm!.daysToDeadline! <= 0).length;
    out.push({ id: "lead", tone: passed ? "danger" : "warning", title: passed ? `생산 착수 마감 지남 ${passed}개` : `생산 착수 마감 7일 이내 ${due.length}개`, detail: due.slice(0, 2).map((x) => `${x.p.name} ${x.mm!.daysToDeadline! <= 0 ? "마감 지남" : `D-${x.mm!.daysToDeadline}`}`).join(" · ") + (due.length > 2 ? ` 외 ${due.length - 2}` : ""), href: "/ax/products?tab=production" });
  }

  // 2. 연체 미수금 (대표·관리자)
  if (fin) {
    const rs = summarizeReceivables(s.settlements, m.today);
    if (rs.overdueCount > 0) out.push({ id: "overdue", tone: "danger", title: `연체 미수금 ${rs.overdueCount}건`, detail: `${formatKRW(rs.overdueAmount)} 입금 기한 지남`, href: "/ax/channels?tab=settlements" });
  }

  // 3. 데이터 품질 오류 (계산이 틀어지는 값)
  const errs = checkDataQuality(s, m.today, { allowPractice: opts.allowPractice }).filter((x) => x.level === "오류");
  if (errs.length) out.push({ id: "quality", tone: "danger", title: `데이터 품질 오류 ${errs.length}종`, detail: errs.slice(0, 2).map((x) => x.title).join(" · "), href: "/ax/data?tab=quality" });

  // 4. 판매 입력 지연 — 마지막 판매일이 7일 넘게 지남 (분석이 그날에 멈춰 있음)
  const last = m.kpis.lastSaleDate;
  if (last && last <= m.today) {
    const lag = daysBetween(last, m.today);
    if (lag > 7) out.push({ id: "sales-lag", tone: "warning", title: `판매 입력 ${lag}일 지연`, detail: `마지막 판매일 ${formatDateKR(last)} — 분석·추천이 그날 기준입니다`, href: "/ax/data" });
  }

  // 5. 새 Action (검토 전)
  const fresh = m.actions.filter((a) => a.status === "NEW");
  if (fresh.length) out.push({ id: "new-actions", tone: "info", title: `새 Action ${fresh.length}건 검토 대기`, detail: fresh.slice(0, 2).map((a) => a.title).join(" · ") + (fresh.length > 2 ? ` 외 ${fresh.length - 2}` : ""), href: "/ax/growth" });

  // 6. 사후 성과 측정 완료 — 완료 후 14일이 지나 최근 7일 안에 결과가 나온 Action (실행 → 결과 확인 루프)
  const yesterday = addDaysISO(m.today, -1);
  const measured = m.actions.filter((a) => {
    if (a.status !== "DONE") return false;
    const d = doneAt(a, s);
    if (!d) return false;
    const ready = addDaysISO(todayISO(new Date(d)), m.planning.outcomeDays - 1);
    return ready <= yesterday && daysBetween(ready, m.today) <= 7 && measureOutcome(a, s, m.today, m.planning.outcomeDays).complete;
  });
  if (measured.length) out.push({ id: "outcome", tone: "success", title: `사후 성과 측정 완료 ${measured.length}건`, detail: measured.slice(0, 2).map((a) => a.title).join(" · "), href: "/ax/reports/weekly" });

  // 7. 결과 확정 대기 Proof (대표만 확정)
  if (can(role, "confirm_proof")) {
    const pending = s.proofEvents.filter((p) => p.status === "RECORDED");
    if (pending.length) out.push({ id: "proof", tone: "info", title: `결과 확정 대기 ${pending.length}건`, detail: "완료된 Action의 결과를 확인하고 확정하세요", href: "/ax/reports#proofs" });
  }

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
