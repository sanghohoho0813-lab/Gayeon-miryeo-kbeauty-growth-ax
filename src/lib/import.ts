import type { Channel, Product, SalesRecord } from "./types";
import { parseCSV, type RowResult } from "./csv";

/* 판매 데이터 가져오기 — 실제 현업 파일(쇼핑몰 주문 엑셀, 자체 집계표)의 열 이름이 제각각이므로
   ① 한글/영문 별칭 자동 인식 → ② 사용자가 열 매핑 확인·수정 → ③ 행 검증 → ④ 저장. */

export type SalesField = "saleDate" | "sku" | "productName" | "channel" | "units" | "revenue";

export const SALES_FIELDS: { key: SalesField; label: string; required: boolean; hint: string; aliases: string[] }[] = [
  { key: "saleDate", label: "판매일", required: true, hint: "YYYY-MM-DD, YYYY.MM.DD, YYYYMMDD, 엑셀 날짜", aliases: ["sale_date", "date", "saledate", "판매일", "판매일자", "주문일", "주문일자", "주문일시", "결제일", "결제일시", "일자", "날짜", "집계일", "출고일"] },
  { key: "sku", label: "SKU / 상품코드", required: false, hint: "SKU 또는 상품명 중 하나 필수", aliases: ["sku", "상품코드", "제품코드", "품번", "자체상품코드", "판매자상품코드", "관리코드", "productcode", "itemcode"] },
  { key: "productName", label: "상품명", required: false, hint: "등록된 제품명과 정확히 일치", aliases: ["상품명", "제품명", "품명", "product", "productname", "item", "itemname"] },
  { key: "channel", label: "채널", required: false, hint: "등록된 채널명. 열이 없으면 기본 채널 선택", aliases: ["channel", "채널", "판매처", "판매채널", "쇼핑몰", "몰", "몰명", "마켓", "거래처"] },
  { key: "units", label: "수량", required: true, hint: "0 이상 정수", aliases: ["units", "qty", "quantity", "수량", "판매수량", "주문수량", "출고수량", "개수"] },
  { key: "revenue", label: "매출 (선택)", required: false, hint: "비우면 판매가 × 수량 × (1 − 채널 할인율)", aliases: ["revenue", "sales", "amount", "매출", "매출액", "판매금액", "결제금액", "주문금액", "금액", "판매액", "실결제금액"] },
];

export type ColumnMap = Record<SalesField, number>; // -1 = 없음

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").replace(/[\s_\-./]/g, "");
}

export function autoMap(headers: string[]): ColumnMap {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const map = {} as ColumnMap;
  for (const f of SALES_FIELDS) {
    const aliases = f.aliases.map(normalizeHeader);
    let idx = norm.findIndex((h, i) => !used.has(i) && aliases.includes(h));
    if (idx === -1) idx = norm.findIndex((h, i) => !used.has(i) && h.length > 1 && aliases.some((a) => a.length > 1 && h.startsWith(a)));
    if (idx >= 0) used.add(idx);
    map[f.key] = idx;
  }
  return map;
}

/** 다양한 날짜 표기 → YYYY-MM-DD. 실패 시 null */
export function normalizeDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
  if (!m) m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt.toISOString().slice(0, 10);
  }
  // 엑셀 날짜 일련번호 (CSV로 저장 시 숫자로 남는 경우)
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const serial = Math.floor(Number(v));
    if (serial > 30000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
  }
  return null;
}

/** "1,234원", " 1 234 " → 1234. 실패 시 NaN */
export function normalizeNumber(raw: string): number {
  const v = raw.replace(/[,\s원₩]/g, "");
  if (v === "") return NaN;
  return Number(v);
}

export interface SalesImportRow extends RowResult<Omit<SalesRecord, "id">> {
  duplicate: boolean;
}

export function validateSalesRows(input: {
  body: string[][];
  map: ColumnMap;
  products: Product[];
  channels: Channel[];
  defaultChannelId: string | null;
  existing: SalesRecord[];
}): SalesImportRow[] {
  const { body, map, products, channels, defaultChannelId, existing } = input;
  const bySku = new Map(products.map((p) => [p.sku.trim().toLowerCase(), p]));
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));
  const chByName = new Map(channels.map((c) => [c.name.trim().toLowerCase(), c]));
  const existingKeys = new Set(existing.map((s) => `${s.saleDate}|${s.productId}|${s.channelId}|${s.units}|${Math.round(s.revenue)}`));
  const seenInFile = new Set<string>();
  const cell = (raw: string[], f: SalesField) => (map[f] >= 0 ? (raw[map[f]] ?? "").trim() : "");

  return body.map((raw, n) => {
    const errors: string[] = [];
    const date = normalizeDate(cell(raw, "saleDate"));
    if (!date) errors.push(`날짜 인식 불가: "${cell(raw, "saleDate")}"`);
    const sku = cell(raw, "sku");
    const name = cell(raw, "productName");
    const product = (sku && bySku.get(sku.toLowerCase())) || (name && byName.get(name.toLowerCase())) || undefined;
    if (!product) errors.push(sku || name ? `등록되지 않은 상품: ${sku || name}` : "상품(SKU/상품명) 비어 있음");
    const chRaw = cell(raw, "channel");
    const channel = chRaw ? chByName.get(chRaw.toLowerCase()) ?? channels.find((c) => c.id === chRaw) : channels.find((c) => c.id === defaultChannelId);
    if (!channel) errors.push(chRaw ? `등록되지 않은 채널: ${chRaw}` : "채널 없음 (기본 채널 선택 필요)");
    const units = normalizeNumber(cell(raw, "units"));
    if (!Number.isInteger(units) || units < 0) errors.push(`수량 오류: "${cell(raw, "units")}"`);
    const revRaw = cell(raw, "revenue");
    let revenue = 0;
    if (revRaw) {
      revenue = normalizeNumber(revRaw);
      if (!Number.isFinite(revenue) || revenue < 0) errors.push(`매출 오류: "${revRaw}"`);
    } else if (product && channel && Number.isInteger(units)) {
      revenue = Math.round(units * product.price * (1 - channel.avgDiscountRate));
    }
    if (errors.length) return { line: n + 2, raw, errors, duplicate: false };
    const key = `${date}|${product!.id}|${channel!.id}|${units}|${Math.round(revenue)}`;
    const duplicate = existingKeys.has(key) || seenInFile.has(key);
    seenInFile.add(key);
    return { line: n + 2, raw, errors, duplicate, value: { productId: product!.id, channelId: channel!.id, saleDate: date!, units, revenue, source: "csv" as const } };
  });
}

/** 파일 → 2차원 문자열 표. CSV(UTF-8/EUC-KR) 또는 XLSX(첫 시트) */
export async function readTable(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const rows = await readSheet(file);
    return rows
      .map((r) => r.map((c) => cellToString(c as unknown)))
      .filter((r) => r.some((c) => c !== ""));
  }
  if (name.endsWith(".xls")) throw new Error("구형 .xls는 지원하지 않습니다. 엑셀에서 .xlsx 또는 CSV로 저장해 주세요.");
  const buf = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buf);
  // 한국 엑셀 기본 CSV(EUC-KR/CP949)는 UTF-8로 읽으면 깨짐(�) → 재해석
  if (text.includes("�")) {
    try { text = new TextDecoder("euc-kr").decode(buf); } catch { /* 브라우저 미지원 시 원본 유지 */ }
  }
  return parseCSV(text);
}

function cellToString(c: unknown): string {
  if (c == null) return "";
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  return String(c).trim();
}
