import type { Product } from "../types";

/**
 * DEMO DATA — 실제 가연인터내셔널 제품 자료 수령 전 표시용.
 * 제품명은 제품 유형 기반 Placeholder이며 효능·성분·평점·리뷰 수를 만들지 않는다.
 * 피부 고민 태그(concerns)는 Finder 동작 시연을 위한 Demo 분류값이다.
 */
const base = { isPublished: true, isDemo: true, purchaseLinks: [] as Product["purchaseLinks"] };

export const demoProducts: Product[] = [
  { ...base, id: "p-ess-01", sku: "DEMO-ESS-01", name: "Demo 에센스 A", nameEn: "MIRYEO Demo Essence A", category: "에센스/앰플", line: "Demo 라인 1", price: 52000, cost: 14500, status: "성장", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["수분", "피부결"], texture: "가벼움", routineStep: 2, isBest: true, mainChannelIds: ["ch-direct", "ch-online", "ch-hnb"], purchaseLinks: [{ label: "직영몰", url: "" }, { label: "온라인 마켓", url: "" }] },
  { ...base, id: "p-amp-50", sku: "DEMO-AMP-50", name: "Demo 앰플 B", nameEn: "MIRYEO Demo Ampoule B", category: "에센스/앰플", line: "Demo 라인 2", price: 68000, cost: 19000, status: "성장", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["탄력", "광채"], texture: "중간", routineStep: 2, isBest: true, mainChannelIds: ["ch-direct", "ch-online", "ch-live"], purchaseLinks: [{ label: "직영몰", url: "" }, { label: "라이브 커머스", url: "" }] },
  { ...base, id: "p-crm-01", sku: "DEMO-CRM-01", name: "Demo 크림 C", nameEn: "MIRYEO Demo Cream C", category: "크림", line: "Demo 라인 3", price: 38000, cost: 10500, status: "안정", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["진정", "수분"], texture: "중간", routineStep: 3, mainChannelIds: ["ch-online", "ch-hnb", "ch-b2b"], purchaseLinks: [{ label: "온라인 마켓", url: "" }] },
  { ...base, id: "p-cln-01", sku: "DEMO-CLN-01", name: "Demo 클렌저 D", nameEn: "MIRYEO Demo Cleanser D", category: "클렌저", line: "Demo 라인 3", price: 28000, cost: 7200, status: "안정", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["데일리 케어", "진정"], texture: "가벼움", routineStep: 1, mainChannelIds: ["ch-online", "ch-hnb"] },
  { ...base, id: "p-ton-01", sku: "DEMO-TON-01", name: "Demo 토너 E", nameEn: "MIRYEO Demo Toner E", category: "토너/미스트", line: "Demo 라인 1", price: 32000, cost: 8800, status: "성장", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["수분", "피부결"], texture: "가벼움", routineStep: 1, mainChannelIds: ["ch-direct", "ch-online"], purchaseLinks: [{ label: "직영몰", url: "" }] },
  { ...base, id: "p-sun-01", sku: "DEMO-SUN-01", name: "Demo 선케어 F", nameEn: "MIRYEO Demo Sun Care F", category: "선케어", line: "Demo 라인 4", price: 26000, cost: 7500, status: "부진", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["데일리 케어"], texture: "가벼움", routineStep: 4, mainChannelIds: ["ch-online", "ch-hnb"] },
  { ...base, id: "p-msk-01", sku: "DEMO-MSK-01", name: "Demo 마스크 G", nameEn: "MIRYEO Demo Mask G", category: "마스크", line: "Demo 라인 1", price: 24000, cost: 6000, status: "안정", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["수분", "진정"], texture: "가벼움", routineStep: 2, mainChannelIds: ["ch-online", "ch-live", "ch-export"] },
  { ...base, id: "p-amp-30", sku: "DEMO-AMP-30", name: "Demo 앰플 H", nameEn: "MIRYEO Demo Ampoule H", category: "에센스/앰플", line: "Demo 라인 2", price: 45000, cost: 12800, status: "성장", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["광채", "피부결"], texture: "가벼움", routineStep: 2, isNew: true, mainChannelIds: ["ch-direct", "ch-online"] },
  { ...base, id: "p-crm-02", sku: "DEMO-CRM-02", name: "Demo 크림 I", nameEn: "MIRYEO Demo Cream I", category: "크림", line: "Demo 라인 2", price: 58000, cost: 16500, status: "신규", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["탄력"], texture: "리치", routineStep: 3, isNew: true, mainChannelIds: ["ch-direct", "ch-b2b"] },
  { ...base, id: "p-mst-01", sku: "DEMO-MST-01", name: "Demo 미스트 J", nameEn: "MIRYEO Demo Mist J", category: "토너/미스트", line: "Demo 라인 4", price: 22000, cost: 5800, status: "부진", description: "실제 제품 정보 수령 전 표시용 Demo 설명입니다.", concerns: ["수분", "데일리 케어"], texture: "가벼움", routineStep: 1, mainChannelIds: ["ch-online"] },
];
