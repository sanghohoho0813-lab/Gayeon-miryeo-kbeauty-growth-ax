import type { Channel, Product, ProductCategory, SalesRecord, SkinConcern, Texture } from "./types";
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
export interface FieldDef<K extends string> { key: K; label: string; required: boolean; hint: string; aliases: string[] }

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").replace(/[\s_\-./]/g, "");
}

export function autoMap(headers: string[]): ColumnMap;
export function autoMap<K extends string>(headers: string[], fields: FieldDef<K>[]): Record<K, number>;
export function autoMap(headers: string[], fields: FieldDef<string>[] = SALES_FIELDS): Record<string, number> {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const map: Record<string, number> = {};
  for (const f of fields) {
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

/* ---------- 상품 일괄 등록 (SKU 기준: 없으면 신규, 있으면 파일에 값이 있는 항목만 갱신) ---------- */
export type ProductField = "sku" | "name" | "category" | "price" | "cost" | "line" | "concerns" | "texture" | "routineStep" | "usageDays" | "purchaseUrl" | "isPublished";

export const PRODUCT_FIELDS: FieldDef<ProductField>[] = [
  { key: "sku", label: "SKU / 상품코드", required: true, hint: "상품을 구분하는 고유 코드", aliases: ["sku", "상품코드", "제품코드", "품번", "자체상품코드", "관리코드", "itemcode"] },
  { key: "name", label: "제품명", required: true, hint: "고객 화면에 보이는 실제 명칭", aliases: ["name", "상품명", "제품명", "품명", "productname"] },
  { key: "category", label: "카테고리", required: true, hint: "에센스/앰플·크림·토너/미스트·클렌저·선케어·마스크", aliases: ["category", "카테고리", "분류", "유형", "품목"] },
  { key: "price", label: "판매가", required: true, hint: "원, 쉼표 허용", aliases: ["price", "판매가", "소비자가", "정가", "가격", "판매가격"] },
  { key: "cost", label: "원가 (선택·민감)", required: false, hint: "대표·관리자만 열람", aliases: ["cost", "원가", "매입가", "제조원가"] },
  { key: "line", label: "라인 (선택)", required: false, hint: "", aliases: ["line", "라인", "브랜드라인", "시리즈"] },
  { key: "concerns", label: "피부 고민 분류 (선택)", required: false, hint: "수분·진정·탄력·피부결·광채·데일리 케어 (구분: , ; ·)", aliases: ["concerns", "고민", "피부고민", "추천분류", "고민분류"] },
  { key: "texture", label: "사용감 (선택)", required: false, hint: "가벼움·중간·리치", aliases: ["texture", "사용감", "제형", "텍스처"] },
  { key: "routineStep", label: "루틴 단계 (선택)", required: false, hint: "1~4", aliases: ["routinestep", "routine_step", "루틴", "루틴단계", "단계", "step"] },
  { key: "usageDays", label: "사용기간 일수 (선택)", required: false, hint: "1개 사용 기간, 재구매 예상 계산", aliases: ["usagedays", "usage_days", "사용기간", "사용일수", "사용주기", "소진기간"] },
  { key: "purchaseUrl", label: "구매 링크 (선택)", required: false, hint: "https://…", aliases: ["url", "link", "구매링크", "구매url", "상품url", "상품링크", "링크"] },
  { key: "isPublished", label: "고객 화면 공개 (선택)", required: false, hint: "Y/N, 공개/비공개. 비우면 신규는 비공개", aliases: ["ispublished", "is_published", "공개", "공개여부", "노출", "노출여부", "published"] },
];

const CATEGORY_ALIASES: [RegExp, ProductCategory][] = [
  [/^(에센스\/앰플|크림|토너\/미스트|클렌저|선케어|마스크)$/, "__exact__" as ProductCategory],
  [/선크림|선케어|선블록|선스틱|선쿠션|썬|sun|spf/i, "선케어"],
  [/에센스|앰플|세럼|serum|essence|ampoule/i, "에센스/앰플"],
  [/크림|cream/i, "크림"],
  [/토너|미스트|스킨|toner|mist/i, "토너/미스트"],
  [/클렌|폼|오일|cleans/i, "클렌저"],
  [/마스크|팩|mask/i, "마스크"],
];
export function normalizeCategory(raw: string): ProductCategory | null {
  const v = raw.trim();
  if (!v) return null;
  const hit = CATEGORY_ALIASES.find(([re]) => re.test(v))?.[1] ?? null;
  return hit === ("__exact__" as ProductCategory) ? (v as ProductCategory) : hit;
}
const CONCERN_LIST: SkinConcern[] = ["수분", "진정", "탄력", "피부결", "광채", "데일리 케어"];
function normalizeConcerns(raw: string): { list: SkinConcern[]; unknown: string[] } {
  const parts = raw.split(/[,;·|/]/).map((x) => x.trim()).filter(Boolean);
  const list: SkinConcern[] = [];
  const unknown: string[] = [];
  for (const p of parts) {
    const hit = CONCERN_LIST.find((c) => c.replace(/\s/g, "") === p.replace(/\s/g, ""));
    if (hit) { if (!list.includes(hit)) list.push(hit); } else unknown.push(p);
  }
  return { list, unknown };
}
function normalizeTexture(raw: string): Texture | null {
  if (/가벼|라이트|light/i.test(raw)) return "가벼움";
  if (/리치|진한|꾸덕|rich/i.test(raw)) return "리치";
  if (/중간|보통|normal/i.test(raw)) return "중간";
  return null;
}
function normalizeBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["y", "yes", "true", "1", "공개", "노출", "o"].includes(v)) return true;
  if (["n", "no", "false", "0", "비공개", "미노출", "x"].includes(v)) return false;
  return null;
}

export interface ProductImportRow extends RowResult<Product> { mode?: "new" | "update"; changes?: string[] }

export function validateProductRows(input: { body: string[][]; map: Record<ProductField, number>; existing: Product[] }): ProductImportRow[] {
  const { body, map, existing } = input;
  const bySku = new Map(existing.map((p) => [p.sku.trim().toLowerCase(), p]));
  const seen = new Set<string>();
  const cell = (raw: string[], f: ProductField) => (map[f] >= 0 ? (raw[map[f]] ?? "").trim() : "");
  return body.map((raw, n) => {
    const errors: string[] = [];
    const sku = cell(raw, "sku");
    if (!sku) errors.push("SKU 비어 있음");
    else if (seen.has(sku.toLowerCase())) errors.push(`파일 안에서 SKU 중복: ${sku}`);
    seen.add(sku.toLowerCase());
    const prev = bySku.get(sku.toLowerCase());
    const next: Product = prev
      ? structuredClone(prev)
      : { id: `new-prod-${n}-${Date.now()}`, sku, name: "", category: "에센스/앰플", price: 0, status: "신규", concerns: [], isPublished: false, purchaseLinks: [], mainChannelIds: [] };
    const changes: string[] = [];
    const set = <K extends keyof Product>(k: K, v: Product[K], label: string) => {
      if (JSON.stringify(next[k]) !== JSON.stringify(v)) changes.push(label);
      next[k] = v;
    };

    const name = cell(raw, "name");
    if (name) set("name", name, "제품명"); else if (!prev) errors.push("제품명 비어 있음");
    const catRaw = cell(raw, "category");
    if (catRaw) { const c = normalizeCategory(catRaw); if (c) set("category", c, "카테고리"); else errors.push(`카테고리 인식 불가: ${catRaw}`); }
    else if (!prev) errors.push("카테고리 비어 있음");
    const priceRaw = cell(raw, "price");
    if (priceRaw) { const v = normalizeNumber(priceRaw); if (Number.isInteger(v) && v > 0) set("price", v, "판매가"); else errors.push(`판매가 오류: ${priceRaw}`); }
    else if (!prev) errors.push("판매가 비어 있음");
    const costRaw = cell(raw, "cost");
    if (costRaw) { const v = normalizeNumber(costRaw); if (Number.isFinite(v) && v >= 0) set("cost", v, "원가"); else errors.push(`원가 오류: ${costRaw}`); }
    const line = cell(raw, "line");
    if (line) set("line", line, "라인");
    const conRaw = cell(raw, "concerns");
    if (conRaw) { const { list, unknown } = normalizeConcerns(conRaw); if (unknown.length) errors.push(`알 수 없는 고민 분류: ${unknown.join(", ")}`); else set("concerns", list, "고민 분류"); }
    const texRaw = cell(raw, "texture");
    if (texRaw) { const t = normalizeTexture(texRaw); if (t) set("texture", t, "사용감"); else errors.push(`사용감 인식 불가: ${texRaw}`); }
    const stepRaw = cell(raw, "routineStep");
    if (stepRaw) { const v = Number(stepRaw.replace(/[^0-9]/g, "")); if (v >= 1 && v <= 4) set("routineStep", v, "루틴 단계"); else errors.push(`루틴 단계 1~4: ${stepRaw}`); }
    const useRaw = cell(raw, "usageDays");
    if (useRaw) { const v = Number(useRaw.replace(/[^0-9]/g, "")); if (v >= 1 && v <= 365) set("usageDays", v, "사용기간"); else errors.push(`사용기간 1~365일: ${useRaw}`); }
    const url = cell(raw, "purchaseUrl");
    if (url) {
      if (!/^https?:\/\/\S+$/i.test(url)) errors.push(`구매 링크 형식 오류: ${url}`);
      else { const links = [...next.purchaseLinks]; links[0] = { label: links[0]?.label || "구매처", url }; set("purchaseLinks", links, "구매 링크"); }
    }
    const pubRaw = cell(raw, "isPublished");
    if (pubRaw) { const b = normalizeBool(pubRaw); if (b == null) errors.push(`공개 여부 인식 불가: ${pubRaw}`); else set("isPublished", b, "공개 여부"); }
    next.isDemo = false;
    if (errors.length) return { line: n + 2, raw, errors };
    return { line: n + 2, raw, errors, value: next, mode: prev ? "update" : "new", changes };
  });
}

/* ---------- 실제 자료 적용 (계약 3단계): 판매 파일 하나로 시작 ----------
   실제 판매 엑셀에는 아직 등록하지 않은 상품·채널이 섞여 있는 것이 보통이다.
   → 파일에서 미등록 상품·채널을 모아 보여주고, 대표·관리자가 카테고리·판매가·채널 유형만 확인하면 바로 등록한다.
   추정값(카테고리=상품명 키워드, 판매가=파일 매출÷수량, 채널 유형=이름 키워드)은 화면에 '추정'으로 표시하고 저장 전 확인받는다. */

export interface UnknownProduct {
  key: string;
  sku: string;
  name: string;
  rows: number;
  units: number;
  revenue: number;
  /** 파일의 매출 ÷ 수량 (할인 반영된 평균 단가 — 정가와 다를 수 있음) */
  avgUnitPrice: number | null;
  categoryGuess: ProductCategory | null;
}
export interface UnknownChannel { key: string; name: string; rows: number; typeGuess: Channel["type"] | null }

const CHANNEL_TYPE_GUESS: [RegExp, Channel["type"]][] = [
  [/수출|해외|export|global|amazon|아마존|shopee|쇼피|qoo10|큐텐|lazada|tiktok\s*shop/i, "수출"],
  [/b2b|도매|납품|거래처|벤더|vendor/i, "B2B"],
  [/라이브|live|인플루언서|공구|공동구매|방송/i, "라이브/인플루언서"],
  [/백화점|매장|오프라인|면세|팝업|플래그십|store/i, "오프라인"],
  [/자사몰|공식몰|직영|홈페이지|카페24|cafe24|브랜드몰/i, "직영몰"],
  [/스마트스토어|네이버|쿠팡|11번가|지마켓|g마켓|옥션|무신사|29cm|w컨셉|올리브영|위메프|티몬|카카오|ssg|롯데온|컬리|마켓|몰|online/i, "온라인몰"],
];
export function guessChannelType(name: string): Channel["type"] | null {
  return CHANNEL_TYPE_GUESS.find(([re]) => re.test(name))?.[1] ?? null;
}

export function findUnknownMasters(input: { body: string[][]; map: ColumnMap; products: Product[]; channels: Channel[] }): { products: UnknownProduct[]; channels: UnknownChannel[] } {
  const { body, map, products, channels } = input;
  const bySku = new Set(products.map((p) => p.sku.trim().toLowerCase()));
  const byName = new Set(products.map((p) => p.name.trim().toLowerCase()));
  const chNames = new Set(channels.map((c) => c.name.trim().toLowerCase()));
  const chIds = new Set(channels.map((c) => c.id));
  const cell = (raw: string[], f: SalesField) => (map[f] >= 0 ? (raw[map[f]] ?? "").trim() : "");
  const prods = new Map<string, UnknownProduct>();
  const chans = new Map<string, UnknownChannel>();
  for (const raw of body) {
    const sku = cell(raw, "sku");
    const name = cell(raw, "productName");
    const known = (sku && bySku.has(sku.toLowerCase())) || (name && byName.has(name.toLowerCase()));
    if (!known && (sku || name)) {
      const key = (sku || name).toLowerCase();
      const u = prods.get(key) ?? { key, sku, name: name || sku, rows: 0, units: 0, revenue: 0, avgUnitPrice: null, categoryGuess: normalizeCategory(name || sku) };
      if (!u.sku && sku) u.sku = sku;
      if (u.name === u.sku && name) u.name = name;
      u.rows++;
      const units = normalizeNumber(cell(raw, "units"));
      const rev = normalizeNumber(cell(raw, "revenue"));
      if (Number.isInteger(units) && units > 0 && Number.isFinite(rev) && rev >= 0) { u.units += units; u.revenue += rev; }
      prods.set(key, u);
    }
    const ch = cell(raw, "channel");
    if (ch && !chNames.has(ch.toLowerCase()) && !chIds.has(ch)) {
      const key = ch.toLowerCase();
      const c = chans.get(key) ?? { key, name: ch, rows: 0, typeGuess: guessChannelType(ch) };
      c.rows++;
      chans.set(key, c);
    }
  }
  for (const u of prods.values()) u.avgUnitPrice = u.units > 0 && u.revenue > 0 ? Math.round(u.revenue / u.units) : null;
  return { products: [...prods.values()].sort((a, b) => b.rows - a.rows), channels: [...chans.values()].sort((a, b) => b.rows - a.rows) };
}

/** 파일에서 등록할 새 상품 — 비공개·실데이터·신규 상태. SKU가 없으면 겹치지 않는 임시 코드(AUTO-…)를 붙이고 화면에 '실제 코드로 교체' 안내 */
export function newProductFromFile(input: { name: string; sku: string; category: ProductCategory; price: number }, takenSkus: Set<string>, id: string, today: string): Product {
  let sku = input.sku.trim();
  if (!sku) {
    const base = `AUTO-${today.replace(/-/g, "").slice(2)}`;
    let n = 1;
    while (takenSkus.has(`${base}-${String(n).padStart(2, "0")}`.toLowerCase())) n++;
    sku = `${base}-${String(n).padStart(2, "0")}`;
  }
  takenSkus.add(sku.toLowerCase());
  return { id, sku, name: input.name.trim(), category: input.category, price: input.price, status: "신규", concerns: [], isPublished: false, purchaseLinks: [], mainChannelIds: [], isDemo: false };
}

/** 자료 진단 — 등록 여부와 무관하게 파일 자체를 요약 (기간·규모·합계·해석 실패) */
export interface SalesDiagnosis {
  rows: number;
  dateOk: number;
  from: string | null;
  to: string | null;
  days: number;
  months: number;
  products: number;
  channels: number;
  units: number;
  revenue: number | null;
  badDates: number;
  badUnits: number;
}
export function diagnoseSales(body: string[][], map: ColumnMap): SalesDiagnosis {
  const cell = (raw: string[], f: SalesField) => (map[f] >= 0 ? (raw[map[f]] ?? "").trim() : "");
  const dates: string[] = [];
  const prods = new Set<string>();
  const chans = new Set<string>();
  let units = 0, revenue = 0, badDates = 0, badUnits = 0;
  for (const raw of body) {
    const d = normalizeDate(cell(raw, "saleDate"));
    if (d) dates.push(d); else badDates++;
    const p = (cell(raw, "sku") || cell(raw, "productName")).toLowerCase();
    if (p) prods.add(p);
    const c = cell(raw, "channel").toLowerCase();
    if (c) chans.add(c);
    const u = normalizeNumber(cell(raw, "units"));
    if (Number.isInteger(u) && u >= 0) units += u; else badUnits++;
    const r = normalizeNumber(cell(raw, "revenue"));
    if (Number.isFinite(r) && r >= 0) revenue += r;
  }
  dates.sort();
  const from = dates[0] ?? null, to = dates[dates.length - 1] ?? null;
  const days = from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1 : 0;
  return { rows: body.length, dateOk: dates.length, from, to, days, months: new Set(dates.map((d) => d.slice(0, 7))).size, products: prods.size, channels: chans.size, units, revenue: map.revenue >= 0 ? revenue : null, badDates, badUnits };
}
