import type { CsvRow } from "./export";
import { addDaysISO } from "./date";

/* 샘플 자료 연습 키트 (계약 별지 제1호: "실제 자료 또는 합리적인 샘플 자료로 실제 업무에 쓸 수 있는지 확인")
   - 가상 자료입니다. 가연인터내셔널의 실제 상품·매출·거래처가 아니며, 이름은 모두 '샘플'·SKU는 'SAMPLE-'로 시작합니다.
   - 날짜는 받는 날 기준으로 만들어 언제 연습해도 '최근 4주/8주' 분석이 동작합니다. 같은 날 받으면 같은 파일입니다(고정 난수).
   - 실제 업무에서 흔한 실수 5가지를 일부러 넣었습니다(천원 단위 판매가, 연도 오타, 이미 올린 날짜 다시 올리기, 같은 청구 두 번, 입금액 0 하나 더) — 품질 점검·중복 제외 연습용. */

export const PRACTICE_SKU_PREFIX = "SAMPLE-";
export const PRACTICE_NAME_PREFIX = "샘플 ";
/** 연습용 샘플 자료 표시 — 백업·이관 제외, Live 품질 점검 오류 */
export const isPracticeSku = (sku: string) => sku.trim().toUpperCase().startsWith(PRACTICE_SKU_PREFIX);
export const isPracticeName = (name: string) => name.trim().startsWith(PRACTICE_NAME_PREFIX);

interface SampleProduct {
  sku: string; name: string; price: number; cost: number; usageDays: number; leadTimeDays: number; moq: number;
  stock: number; safety: number; incoming: number; publish: boolean;
  /** 이전 4주 → 최근 4주 일평균 판매 (전 채널 합) */
  prevDaily: number; recentDaily: number;
  export?: boolean;
}

// 판단 규칙이 골고루 보이도록 설계: 성장+재고 부족(생산 착수), 감소+재고 많음(과잉), 성장(생산 확대), 안정
const PRODUCTS: SampleProduct[] = [
  { sku: "SAMPLE-ESS-01", name: "샘플 수분 에센스", price: 32000, cost: 8500, usageDays: 60, leadTimeDays: 35, moq: 1000, stock: 1400, safety: 400, incoming: 0, publish: true, prevDaily: 30, recentDaily: 46, export: true },
  { sku: "SAMPLE-AMP-01", name: "샘플 진정 앰플", price: 38000, cost: 9800, usageDays: 45, leadTimeDays: 40, moq: 800, stock: 1600, safety: 300, incoming: 0, publish: true, prevDaily: 18, recentDaily: 18, export: true },
  { sku: "SAMPLE-CRM-01", name: "샘플 보습 크림", price: 35000, cost: 9000, usageDays: 60, leadTimeDays: 30, moq: 1000, stock: 4800, safety: 300, incoming: 0, publish: false, prevDaily: 28, recentDaily: 18 },
  { sku: "SAMPLE-CLN-01", name: "샘플 약산성 클렌저", price: 18000, cost: 4200, usageDays: 45, leadTimeDays: 25, moq: 2000, stock: 1500, safety: 300, incoming: 0, publish: false, prevDaily: 22, recentDaily: 22 },
  { sku: "SAMPLE-SUN-01", name: "샘플 데일리 선크림", price: 24000, cost: 6000, usageDays: 40, leadTimeDays: 30, moq: 1500, stock: 900, safety: 200, incoming: 900, publish: false, prevDaily: 15, recentDaily: 20 },
  { sku: "SAMPLE-MSK-01", name: "샘플 시트 마스크 (10매)", price: 15000, cost: 3600, usageDays: 10, leadTimeDays: 20, moq: 3000, stock: 1000, safety: 200, incoming: 0, publish: false, prevDaily: 10, recentDaily: 10 },
];

/** 채널: 이름 키워드로 유형이 자동 추정된다 (직영몰·온라인몰·B2B·수출) */
const CH = { own: "샘플 자사몰", mall: "샘플 온라인몰", b2b: "샘플 도매 거래처", exp: "샘플 해외 판매" } as const;
const PAY = { own: 0.95, mall: 0.88, b2b: 0.6, exp: 0.55 } as const;
const SHARE = { own: 0.38, mall: 0.62 } as const;

function rng(seed: number) {
  // mulberry32 — 같은 입력이면 같은 숫자
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SALES_HEADERS = ["주문일자", "상품코드", "상품명", "판매처", "수량", "결제금액"];
type SaleLine = { date: string; p: SampleProduct; ch: keyof typeof CH; units: number };
const line = (x: SaleLine, revenue?: number): CsvRow => ({ 주문일자: x.date, 상품코드: x.p.sku, 상품명: x.p.name, 판매처: CH[x.ch], 수량: x.units, 결제금액: revenue ?? Math.round((x.p.price * PAY[x.ch] * x.units) / 10) * 10 });

/** offset일 전(1 = 어제)의 판매 — 직영·온라인은 매일, 도매는 매주 월요일 묶음, 해외는 2주마다 */
function dayLines(today: string, offset: number): SaleLine[] {
  const date = addDaysISO(today, -offset);
  const out: SaleLine[] = [];
  PRODUCTS.forEach((p, i) => {
    const r = rng(i * 10007 + offset * 131 + 7);
    // 63~36일 전 = 이전 4주, 35~1일 전 = 최근 (선형 전환 대신 4주 경계에서 바뀌되 약간의 흔들림)
    const base = offset > 35 ? p.prevDaily : p.recentDaily;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.85 : 1.05;
    for (const ch of ["own", "mall"] as const) {
      const units = Math.round(base * SHARE[ch] * weekend * (0.8 + r() * 0.4));
      if (units > 0) out.push({ date, p, ch, units });
    }
    if (weekday === 1) out.push({ date, p, ch: "b2b", units: Math.round(base * 0.7 * (0.8 + r() * 0.4)) }); // 1주치의 약 10%를 묶음 납품
    if (p.export && weekday === 3 && Math.floor(offset / 7) % 2 === 0) out.push({ date, p, ch: "exp", units: Math.round(base * 1.5) });
  });
  return out;
}

/** name: 영문 파일명 — 한글 파일명은 일부 브라우저에서 download.csv로 바뀜 (2단계 보완 결함과 같은 원인) */
export interface PracticeFile { name: string; title: string; headers: string[]; rows: CsvRow[]; note: string }

/** ① 지난 8주 판매 (63~8일 전) — 상품·채널이 아직 등록되지 않은 상태에서 올린다 */
export function practiceSalesFile(today: string): PracticeFile {
  const rows: CsvRow[] = [];
  for (let off = 63; off >= 8; off--) for (const x of dayLines(today, off)) rows.push(line(x));
  return { name: "miryeo_practice1_sales_8weeks.csv", title: "① 판매 8주 (쇼핑몰 주문 내보내기 형태)", headers: SALES_HEADERS, rows, note: "등록 안 된 상품 6개·채널 4개가 들어 있습니다 → 가져오기 화면에서 바로 등록" };
}

/** ② 상품 정보·재고 — 정가·원가·사용기간·생산기간·MOQ·재고 (실수: 클렌저 판매가를 천원 단위로 입력) */
export function practiceProductFile(): PracticeFile {
  const rows = PRODUCTS.map((p) => ({
    SKU: p.sku,
    판매가: p.sku === "SAMPLE-CLN-01" ? 18 : p.price, // 실수 1: 천원 단위
    원가: p.cost,
    사용기간: p.usageDays,
    생산기간: p.leadTimeDays,
    최소생산수량: p.moq,
    현재재고: p.stock,
    안전재고: p.safety,
    입고예정수량: p.incoming,
    공개여부: p.publish ? "Y" : "N",
    구매링크: p.publish ? `https://example.com/sample/${p.sku.toLowerCase()}` : "",
  }));
  return { name: "miryeo_practice2_products_stock.csv", title: "② 상품 정보·재고 (기존 SKU 수정)", headers: Object.keys(rows[0]), rows, note: "추정 판매가를 정가로 바로잡고 원가·생산기간·재고를 채웁니다" };
}

/** ③ 최근 1주 추가 판매 (7~1일 전) — 실수: 이미 올린 날(8일 전) 다시 포함, 연도 오타 1행, 증정(매출 0) 1행 */
export function practiceWeekFile(today: string): PracticeFile {
  const rows: CsvRow[] = [];
  for (const x of dayLines(today, 8)) rows.push(line(x)); // 실수 2: 지난 파일과 겹치는 날 → 가져오기에서 '중복 의심'으로 자동 제외
  for (let off = 7; off >= 1; off--) for (const x of dayLines(today, off)) rows.push(line(x));
  const typo = dayLines(today, 2)[0];
  const y = Number(typo.date.slice(0, 4));
  rows.push(line({ ...typo, date: `${y + 1}${typo.date.slice(4)}`, units: 3 })); // 실수 3: 연도 오타 → 품질 점검 '미래 날짜'
  const mask = PRODUCTS[5];
  rows.push(line({ date: addDaysISO(today, -3), p: mask, ch: "own", units: 2 }, 0)); // 증정 — 매출 0 (정상일 수 있음, '확인')
  return { name: "miryeo_practice3_sales_1week.csv", title: "③ 최근 1주 추가 판매 (매주 올리는 파일)", headers: SALES_HEADERS, rows, note: "지난 파일과 겹친 날은 자동 제외, 연도 오타는 품질 점검에서 발견" };
}

/** ④ 청구·입금 현황 (PASS 27, R-25) — 정산 파일 가져오기 연습. 실수: 같은 청구를 두 번 적음, 입금액에 0을 하나 더 */
export function practiceSettlementFile(today: string): PracticeFile {
  const d = (n: number) => addDaysISO(today, -n);
  const row = (구분: string, 거래처: string, 내용: string, 청구일: string, 청구액: number, 입금기한: string, 입금액: number | "", 입금일: string): CsvRow => ({ 구분, 거래처, 내용, 청구일, 청구액, "입금 기한": 입금기한, 입금액, 입금일 });
  const rows: CsvRow[] = [
    row("B2B", CH.b2b, "두 달 전 납품분", d(75), 4620000, d(45), 4620000, d(48)),
    row("B2B", CH.b2b, "지난달 납품분", d(45), 5180000, d(15), 2000000, d(20)), // 부분 입금 + 기한 지남 → 연체
    row("B2B", CH.b2b, "이번 달 납품분", d(10), 3960000, addDaysISO(today, 20), "", ""),
    row("수출", CH.exp, "2차 선적", d(40), 7150000, d(10), 7150000, d(12)),
    row("수출", CH.exp, "3차 선적", d(12), 6600000, addDaysISO(today, 18), "", ""),
    row("채널", CH.mall, "지난달 판매 정산", d(8), 2480000, addDaysISO(today, 7), "", ""),
  ];
  rows.push({ ...rows[2] }); // 실수 4: 같은 청구를 두 번 → '중복 의심'으로 자동 제외
  rows.push(row("수출", CH.exp, "샘플 발송분", d(25), 1980000, addDaysISO(today, 5), 19800000, d(3))); // 실수 5: 입금액에 0 하나 더 → 오류
  return { name: "miryeo_practice4_settlements.csv", title: "④ 청구·입금 현황 (거래처 정산)", headers: ["구분", "거래처", "내용", "청구일", "청구액", "입금 기한", "입금액", "입금일"], rows, note: "같은 청구 두 번은 자동 제외, 입금액 오타는 오류로 표시" };
}

export const PRACTICE_MISTAKES = [
  "② 상품 정보: 클렌저 판매가를 천원 단위(18)로 입력 → 품질 점검 '원가가 판매가 이상' 오류 → 상품 폼에서 18,000으로 수정",
  "③ 추가 판매: 이미 올린 날짜(8일 전)를 다시 포함 → 가져오기에서 '중복 의심'으로 기본 제외",
  "③ 추가 판매: 연도 오타 1행(내년 날짜) → 품질 점검 '오늘 이후 날짜의 판매' → 정리 버튼으로 삭제",
  "④ 정산: 같은 청구(이번 달 납품분)를 두 번 적음 → 가져오기에서 '중복 의심'으로 기본 제외",
  "④ 정산: 샘플 발송분 입금액에 0을 하나 더 입력 → '입금액이 청구액보다 큼' 오류로 저장 안 됨 → 정산 내역에서 직접 추가",
];

/** 연습 순서 — 실제 첫 주(Week 0)와 같은 순서. href는 해당 화면 */
export const PRACTICE_STEPS: { title: string; detail: string; href: string }[] = [
  { title: "판매 파일 ① 올리기", detail: "데이터 관리 > 판매 입력·파일. 미등록 상품 6개·채널 4개를 그 자리에서 등록(추정 카테고리·판매가·채널 유형 확인) → 판매 저장", href: "/ax/data" },
  { title: "상품 정보 파일 ② 올리기", detail: "데이터 관리 > 상품 > 상품 일괄 등록. 정가·원가·사용기간·생산기간·MOQ·재고가 한 번에 들어갑니다", href: "/ax/data?tab=products" },
  { title: "품질 점검", detail: "데이터 관리 > 품질 점검. 천원 단위 판매가를 찾아 상품 폼에서 고칩니다", href: "/ax/data?tab=quality" },
  { title: "Pilot 시작일·AX OWNER·월 목표", detail: "설정에서 시작일·책임자, 월별 실적에서 이번 달 목표(연습값)", href: "/ax/settings#pilot" },
  { title: "판단 확인 → 승인 → 실행 → 완료", detail: "AI Growth Center에서 생산 착수·과잉재고·생산 확대 판단의 근거를 읽고 처리", href: "/ax/growth" },
  { title: "추가 판매 파일 ③ 올리기", detail: "매주 하는 일. 겹친 날짜는 자동 제외, 남은 실수는 품질 점검에서 정리", href: "/ax/data" },
  { title: "정산 파일 ④ 올리기", detail: "채널·B2B·수출 > 정산 > 파일로 가져오기. 같은 청구 두 번은 자동 제외, 입금액 오타는 오류 → 받을 돈·연체 확인, 연체는 AI Growth Center '연체 미수금 회수'로", href: "/ax/channels?tab=settlements" },
  { title: "주간 리포트·사업화 실적 자료 인쇄", detail: "결과가 어떻게 문서로 나오는지 확인 (DEMO 표시 — 제출용 아님)", href: "/ax/reports/weekly" },
];
