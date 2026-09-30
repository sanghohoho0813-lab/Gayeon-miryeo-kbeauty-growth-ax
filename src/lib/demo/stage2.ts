import type { CustomerAccount, CustomerPurchase, Settlement } from "../types";
import { daysAgoISO } from "../date";

/* DEMO DATA — 회원·구매기록·정산. 모든 값은 시연용이며 실제 고객·거래 정보가 아니다. */

export function demoCustomerAccounts(): CustomerAccount[] {
  const t = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  const rows: [string, string, CustomerAccount["skinConcerns"], boolean, number][] = [
    ["01", "회원 A (Demo)", ["수분", "피부결"], true, 120],
    ["02", "회원 B (Demo)", ["탄력"], true, 95],
    ["03", "회원 C (Demo)", ["진정", "수분"], false, 80],
    ["04", "회원 D (Demo)", ["광채"], true, 64],
    ["05", "회원 E (Demo)", ["데일리 케어"], false, 40],
    ["06", "회원 F (Demo)", ["수분"], true, 21],
    ["07", "회원 G (Demo)", ["진정"], true, 9],
    ["08", "회원 H (Demo)", ["피부결", "광채"], false, 3],
  ];
  return rows.map(([n, name, concerns, mkt, days]) => ({
    userId: `demo-cust-${n}`, email: `member${n}@demo.local`, displayName: name, skinConcerns: concerns,
    marketingConsent: mkt, privacyAgreedAt: t(days), privacyVersion: "demo-draft", createdAt: t(days),
  }));
}

export function demoCustomerPurchases(): CustomerPurchase[] {
  const rows: [string, string, number, number, "SELF" | "STAFF", string][] = [
    ["01", "p-ess-01", 1, 40, "SELF", "직영몰"],
    ["01", "p-ton-01", 1, 55, "SELF", "직영몰"],
    ["02", "p-amp-50", 1, 42, "STAFF", "라이브 커머스"],
    ["03", "p-crm-01", 1, 58, "SELF", "온라인 마켓"],
    ["04", "p-amp-30", 1, 20, "SELF", "직영몰"],
    ["05", "p-cln-01", 2, 70, "STAFF", "오프라인 스토어"],
    ["06", "p-msk-01", 1, 26, "SELF", "온라인 마켓"],
    ["07", "p-ess-01", 1, 7, "SELF", "직영몰"],
  ];
  return rows.map(([n, productId, quantity, days, source, channelLabel], i) => ({
    id: `demo-pur-${i + 1}`, customerUserId: `demo-cust-${n}`, productId, quantity, purchasedOn: daysAgoISO(days),
    channelLabel: `${channelLabel} (Demo)`, source, createdAt: new Date(Date.now() - days * 86_400_000).toISOString(),
  }));
}

export function demoSettlements(): Settlement[] {
  const s = (id: string, kind: Settlement["kind"], counterparty: string, refId: string | null, description: string, amount: number, paid: number, issued: number, due: number, status: Settlement["status"], paidOn: number | null = null): Settlement => ({
    id, kind, counterparty, refId, description, amount, paidAmount: paid, issuedOn: daysAgoISO(issued), dueOn: daysAgoISO(due), paidOn: paidOn == null ? null : daysAgoISO(paidOn), status,
  });
  return [
    s("demo-st-1", "B2B", "거래처 A (Demo)", "b2b-01", "정기 납품 대금 (Demo)", 18_400_000, 18_400_000, 75, 45, "PAID", 44),
    s("demo-st-2", "B2B", "거래처 A (Demo)", "b2b-01", "정기 납품 대금 (Demo)", 21_600_000, 8_000_000, 45, 15, "PARTIAL"),
    s("demo-st-3", "B2B", "거래처 B (Demo)", "b2b-02", "신규 납품 (Demo)", 9_600_000, 0, 20, -10, "OPEN"),
    s("demo-st-4", "EXPORT", "수출 권역 A (Demo)", null, "선적분 대금 (Demo)", 32_000_000, 0, 50, 20, "OPEN"),
    s("demo-st-5", "CHANNEL", "온라인 마켓 (Demo)", "ch-online", "월 정산 (Demo)", 14_200_000, 0, 12, -18, "OPEN"),
  ];
}
