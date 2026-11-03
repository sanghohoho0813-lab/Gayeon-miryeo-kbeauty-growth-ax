import type { Settlement } from "./types";
import { outstanding, overdueDays } from "./settlements";

/* 지난 확인 이후 (PASS 37, D-136) — 대시보드를 열 때 '지난번 확인한 뒤 새로 생긴 일'만 모아 보여 준다.
   확인한 때의 상태(열린 Action·연체·미입금·재고 위험 상품·판매 기록 수)를 이 브라우저에 저장하고, 지금 상태와 비교한다.
   서버에 새로 저장하는 것은 없다 — 기기마다 따로 기억한다. 처음 열면 기준만 저장하고 카드는 보이지 않는다. */

export interface SeenSnapshot {
  v: 1;
  at: string;               // 확인한 시각 (ISO)
  openActions: string[];    // 열린 Action id
  overdue: string[];        // 기한 지난 미입금 정산 id
  unpaid: string[];         // 남은 금액이 있는 정산 id
  risk: string[];           // 품절위험·부족주의 상품 id
  salesRows: number;
  salesAsOf: string | null; // 마지막 판매일
}

export interface SinceInput {
  at: string;
  today: string;
  actions: { id: string; status: string; title: string }[];
  openStatuses: readonly string[];
  settlements: Settlement[];
  risk: { id: string; name: string }[];
  products: { id: string }[];
  salesRows: number;
  salesAsOf: string | null;
}

export type SinceKey = "actions" | "overdue" | "risk" | "paid" | "riskResolved" | "sales";
export interface SinceLine {
  key: SinceKey;
  tone: "attention" | "good" | "info";
  text: string;
  detail?: string;
  href: string;
  /** 매출·받을 돈 — 재무 권한이 있을 때만 보임 */
  fin?: boolean;
}

export function takeSnapshot(i: SinceInput): SeenSnapshot {
  return {
    v: 1,
    at: i.at,
    openActions: i.actions.filter((a) => i.openStatuses.includes(a.status)).map((a) => a.id),
    overdue: i.settlements.filter((s) => overdueDays(s, i.today) > 0).map((s) => s.id),
    unpaid: i.settlements.filter((s) => outstanding(s) > 0).map((s) => s.id),
    risk: i.risk.map((p) => p.id),
    salesRows: i.salesRows,
    salesAsOf: i.salesAsOf,
  };
}

/** 저장된 값이 이 형식인지 (다른 버전·깨진 값이면 null → 기준을 새로 잡음) */
export function parseSnapshot(raw: string | null): SeenSnapshot | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    const arr = (x: unknown) => Array.isArray(x) && x.every((y) => typeof y === "string");
    if (v?.v === 1 && typeof v.at === "string" && arr(v.openActions) && arr(v.overdue) && arr(v.unpaid) && arr(v.risk) && typeof v.salesRows === "number") return v as SeenSnapshot;
  } catch { /* 아래 */ }
  return null;
}

const won = (n: number) => (Math.abs(n) >= 100_000_000 ? `${(n / 100_000_000).toFixed(1)}억 원` : Math.abs(n) >= 10_000 ? `${Math.round(n / 10_000).toLocaleString("ko-KR")}만 원` : `${n.toLocaleString("ko-KR")}원`);
const names = (list: string[], max = 2) => (list.length <= max ? list.join(", ") : `${list.slice(0, max).join(", ")} 외 ${list.length - max}`);
const uniq = (list: string[]) => [...new Set(list.map((x) => x.trim()))];
const dot = (iso: string) => iso.slice(5, 10).replace("-", ".");

/** 지난 확인 이후 바뀐 것 — 살펴볼 것(새 Action·새 연체·새 재고 위험) → 좋아진 것(입금 완료·재고 위험 해소) → 참고(판매 기록) 순 */
export function sinceLines(prev: SeenSnapshot, i: SinceInput): SinceLine[] {
  const out: SinceLine[] = [];
  const was = (list: string[]) => new Set(list);

  const prevOpen = was(prev.openActions);
  const newActions = i.actions.filter((a) => i.openStatuses.includes(a.status) && !prevOpen.has(a.id));
  if (newActions.length) out.push({ key: "actions", tone: "attention", text: `새 Action ${newActions.length}건`, detail: names(newActions.map((a) => a.title)), href: "/ax/growth?status=NEW" });

  const prevOver = was(prev.overdue);
  const newOver = i.settlements.filter((s) => overdueDays(s, i.today) > 0 && !prevOver.has(s.id));
  if (newOver.length) out.push({ key: "overdue", tone: "attention", text: `새로 연체 ${newOver.length}건 · ${won(newOver.reduce((a, s) => a + outstanding(s), 0))}`, detail: names(uniq(newOver.map((s) => s.counterparty))), href: "/ax/channels?tab=settlements&filter=overdue", fin: true });

  const prevRisk = was(prev.risk);
  const curRisk = was(i.risk.map((p) => p.id));
  const newRisk = i.risk.filter((p) => !prevRisk.has(p.id));
  if (newRisk.length) out.push({ key: "risk", tone: "attention", text: `재고 위험 새 상품 ${newRisk.length}개`, detail: names(newRisk.map((p) => p.name)), href: "/ax/products?tab=inventory&status=%EC%9C%84%ED%97%98" });

  const byId = new Map(i.settlements.map((s) => [s.id, s]));
  const paid = prev.unpaid.map((id) => byId.get(id)).filter((s): s is Settlement => !!s && s.status === "PAID");
  if (paid.length) out.push({ key: "paid", tone: "good", text: `입금 완료 ${paid.length}건 · ${won(paid.reduce((a, s) => a + s.amount, 0))}`, detail: names(uniq(paid.map((s) => s.counterparty))), href: "/ax/channels?tab=settlements", fin: true });

  const exists = was(i.products.map((p) => p.id));
  const resolved = prev.risk.filter((id) => !curRisk.has(id) && exists.has(id));
  if (resolved.length) out.push({ key: "riskResolved", tone: "good", text: `재고 위험 해소 ${resolved.length}개`, href: "/ax/products?tab=inventory" });

  const rows = i.salesRows - prev.salesRows;
  if (rows !== 0) {
    const asOf = prev.salesAsOf && i.salesAsOf && prev.salesAsOf !== i.salesAsOf ? `마지막 판매일 ${dot(prev.salesAsOf)} → ${dot(i.salesAsOf)}` : undefined;
    out.push({ key: "sales", tone: "info", text: rows > 0 ? `판매 기록 ${rows.toLocaleString("ko-KR")}행 추가` : `판매 기록 ${(-rows).toLocaleString("ko-KR")}행 줄어듦 (삭제·되돌리기)`, detail: asOf, href: "/ax/data" });
  }
  return out;
}
