import type { SalesRecord } from "../types";

/**
 * DEMO DATA — 최근 8주 주간 판매수량. index 0 = 8주 전, index 7 = 이번 주.
 * 성장/부진 패턴은 AI 분석 데모 시나리오를 위해 설계된 값이다.
 */
export const demoSales: SalesRecord[] = [
  // 트리트먼트 에센스 — 꾸준한 성장
  { productId: "p-ess-01", channelId: "ch-direct", weeklyUnits: [120, 128, 135, 142, 150, 158, 170, 182] },
  { productId: "p-ess-01", channelId: "ch-online", weeklyUnits: [210, 215, 224, 238, 250, 262, 280, 296] },
  { productId: "p-ess-01", channelId: "ch-hnb", weeklyUnits: [90, 92, 95, 99, 104, 108, 112, 118] },

  // 인텐시브 앰플 — 급성장 (라이브 방송 효과 시나리오)
  { productId: "p-amp-50", channelId: "ch-direct", weeklyUnits: [80, 84, 90, 98, 120, 150, 185, 215] },
  { productId: "p-amp-50", channelId: "ch-online", weeklyUnits: [110, 115, 122, 132, 155, 190, 230, 268] },
  { productId: "p-amp-50", channelId: "ch-live", weeklyUnits: [40, 42, 45, 60, 95, 140, 180, 210] },

  // 수딩 크림 — 안정
  { productId: "p-crm-01", channelId: "ch-online", weeklyUnits: [150, 148, 152, 155, 151, 154, 156, 158] },
  { productId: "p-crm-01", channelId: "ch-hnb", weeklyUnits: [95, 96, 94, 97, 98, 96, 99, 100] },
  { productId: "p-crm-01", channelId: "ch-b2b", weeklyUnits: [60, 0, 0, 80, 0, 0, 70, 0] },

  // 카밍 클렌저 — 안정
  { productId: "p-cln-01", channelId: "ch-online", weeklyUnits: [130, 132, 128, 134, 136, 133, 138, 140] },
  { productId: "p-cln-01", channelId: "ch-hnb", weeklyUnits: [70, 72, 71, 74, 73, 75, 76, 78] },

  // 하이드로 토너 — 완만한 성장
  { productId: "p-ton-01", channelId: "ch-direct", weeklyUnits: [85, 88, 92, 95, 99, 104, 110, 116] },
  { productId: "p-ton-01", channelId: "ch-online", weeklyUnits: [120, 124, 128, 133, 139, 145, 152, 160] },

  // 데일리 선크림 — 하락 (시즌 종료 시나리오)
  { productId: "p-sun-01", channelId: "ch-online", weeklyUnits: [180, 172, 160, 148, 132, 118, 102, 90] },
  { productId: "p-sun-01", channelId: "ch-hnb", weeklyUnits: [90, 86, 80, 73, 66, 58, 52, 46] },

  // 시트 마스크 — 안정 + 수출
  { productId: "p-msk-01", channelId: "ch-online", weeklyUnits: [200, 205, 198, 210, 208, 214, 216, 220] },
  { productId: "p-msk-01", channelId: "ch-live", weeklyUnits: [50, 48, 55, 52, 58, 56, 60, 62] },
  { productId: "p-msk-01", channelId: "ch-export", weeklyUnits: [300, 0, 0, 350, 0, 0, 400, 0] },

  // 브라이트 앰플 — 성장 (신제품 안착)
  { productId: "p-amp-30", channelId: "ch-direct", weeklyUnits: [45, 52, 60, 68, 76, 85, 94, 104] },
  { productId: "p-amp-30", channelId: "ch-online", weeklyUnits: [60, 68, 78, 88, 98, 110, 122, 135] },

  // 탄력 크림 — 신규 런칭 램프업
  { productId: "p-crm-02", channelId: "ch-direct", weeklyUnits: [0, 0, 20, 35, 48, 60, 74, 90] },
  { productId: "p-crm-02", channelId: "ch-b2b", weeklyUnits: [0, 0, 0, 50, 0, 60, 0, 70] },

  // 페이스 미스트 — 느린 판매
  { productId: "p-mst-01", channelId: "ch-online", weeklyUnits: [55, 52, 50, 48, 46, 45, 43, 42] },
];
