import type { B2BAccount, Channel, ExportRecord } from "../types";
import { daysAgoISO } from "../date";

/** DEMO DATA — 채널·거래처·권역은 익명 Demo. 실제 명칭은 고객 자료 수령 후 교체. */
export const demoChannels: Channel[] = [
  { id: "ch-direct", name: "직영몰 (Demo)", type: "직영몰", avgDiscountRate: 0.05, active: true },
  { id: "ch-online", name: "온라인 마켓 (Demo)", type: "온라인몰", avgDiscountRate: 0.18, active: true },
  { id: "ch-hnb", name: "오프라인 스토어 (Demo)", type: "오프라인", avgDiscountRate: 0.12, active: true },
  { id: "ch-live", name: "라이브 커머스 (Demo)", type: "라이브/인플루언서", avgDiscountRate: 0.22, active: true },
  { id: "ch-b2b", name: "B2B 납품 (Demo)", type: "B2B", avgDiscountRate: 0.35, active: true },
  { id: "ch-export", name: "수출 (Demo)", type: "수출", avgDiscountRate: 0.4, active: true },
];

export function demoB2B(): B2BAccount[] {
  return [
    { id: "b2b-01", name: "거래처 A (Demo)", status: "거래중", lastOrderAt: daysAgoISO(16), totalRevenue: 184_000_000, mainProductIds: ["p-crm-01", "p-cln-01"], nextDelivery: daysAgoISO(-3), note: "정기 납품 (Demo)" },
    { id: "b2b-02", name: "거래처 B (Demo)", status: "거래중", lastOrderAt: daysAgoISO(10), totalRevenue: 96_000_000, mainProductIds: ["p-crm-02", "p-amp-50"], nextDelivery: daysAgoISO(-11) },
    { id: "b2b-03", name: "거래처 C (Demo)", status: "협의중", lastOrderAt: daysAgoISO(52), totalRevenue: 32_000_000, mainProductIds: ["p-cln-01"], note: "물량 협의 중 (Demo)" },
    { id: "b2b-04", name: "거래처 D (Demo)", status: "휴면", lastOrderAt: daysAgoISO(160), totalRevenue: 21_000_000, mainProductIds: ["p-msk-01"], note: "재거래 제안 검토 대상 (Demo)" },
  ];
}

export function demoExports(): ExportRecord[] {
  return [
    { id: "ex-01", region: "권역 A (Demo)", channel: "현지 온라인몰 (Demo)", totalRevenue: 145_000_000, mainProductIds: ["p-msk-01", "p-ess-01"], lastOrderAt: daysAgoISO(8), growthRate: 0.31 },
    { id: "ex-02", region: "권역 B (Demo)", channel: "글로벌 이커머스 (Demo)", totalRevenue: 88_000_000, mainProductIds: ["p-msk-01", "p-crm-01"], lastOrderAt: daysAgoISO(12), growthRate: 0.42 },
    { id: "ex-03", region: "권역 C (Demo)", channel: "리테일 파트너 (Demo)", totalRevenue: 64_000_000, mainProductIds: ["p-ess-01", "p-ton-01"], lastOrderAt: daysAgoISO(33), growthRate: -0.06 },
  ];
}
