import type { B2BAccount, Channel, Settlement, SettlementKind } from "./types";
import type { RowResult } from "./csv";
import { normalizeDate, normalizeNumber, type FieldDef } from "./import";
import { statusFor } from "./settlements";
import { uuidv4 } from "./data/source";

/* 정산(청구·입금) 파일 가져오기 (PASS 27, D-087) — 거래처별 청구·입금 현황(USER ACTION 8-4)을 한 건씩 입력하지 않고
   엑셀·CSV 그대로 올린다. 판매·상품 가져오기와 같은 순서: ① 열 자동 인식 → ② 열 확인 → ③ 행 검증 → ④ 저장.
   이미 올린 청구(구분·거래처·청구일·청구액이 같음)는 '중복 의심'으로 저장하지 않는다 (같은 파일을 다시 올려도 두 번 잡히지 않게). */

export type SettlementField = "kind" | "counterparty" | "description" | "issuedOn" | "amount" | "dueOn" | "paidAmount" | "paidOn" | "note";

export const SETTLEMENT_FIELDS: FieldDef<SettlementField>[] = [
  { key: "kind", label: "구분 (선택)", required: false, hint: "B2B·도매 / 수출 / 채널 정산 / 기타 — 열이 없거나 비면 B2B", aliases: ["구분", "유형", "종류", "거래구분", "정산구분", "kind", "type"] },
  { key: "counterparty", label: "거래처", required: true, hint: "거래처·채널·권역 이름", aliases: ["거래처", "거래처명", "업체", "업체명", "상호", "고객사", "바이어", "counterparty", "client", "customer", "buyer", "account"] },
  { key: "description", label: "내용 (선택)", required: false, hint: "예: 9월 납품분", aliases: ["내용", "적요", "품목", "거래내용", "description", "item"] },
  { key: "issuedOn", label: "청구일", required: true, hint: "YYYY-MM-DD 등 — 세금계산서·청구서 날짜", aliases: ["청구일", "청구일자", "발행일", "발행일자", "계산서일자", "세금계산서일", "작성일자", "거래일", "거래일자", "납품일", "issued", "issuedon", "invoicedate"] },
  { key: "amount", label: "청구액", required: true, hint: "원 단위 (1,234원 표기 가능)", aliases: ["청구액", "청구금액", "합계금액", "공급대가", "총액", "청구합계", "amount", "invoiceamount", "total"] },
  { key: "dueOn", label: "입금 기한 (선택)", required: false, hint: "비우면 기한 없음 (연체 계산 안 함)", aliases: ["입금기한", "입금예정일", "결제기한", "결제예정일", "수금예정일", "지급기일", "만기일", "due", "dueon", "duedate"] },
  { key: "paidAmount", label: "입금액 (선택)", required: false, hint: "지금까지 받은 금액 — 비우면 0", aliases: ["입금액", "입금금액", "수금액", "받은금액", "입금합계", "paid", "paidamount"] },
  { key: "paidOn", label: "입금일 (선택)", required: false, hint: "마지막 입금일", aliases: ["입금일", "입금일자", "수금일", "수금일자", "paidon", "paiddate"] },
  { key: "note", label: "메모 (선택)", required: false, hint: "", aliases: ["메모", "비고", "note", "remark", "memo"] },
];

/** 구분 칸 글자 → 구분 (없으면 B2B) */
export function parseSettlementKind(raw: string): SettlementKind | null {
  const v = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!v) return "B2B";
  if (/^(b2b|도매|거래처|납품|b2b거래처)/.test(v)) return "B2B";
  if (/^(수출|해외|export)/.test(v)) return "EXPORT";
  if (/^(채널|판매채널|쇼핑몰|몰|channel|판매채널정산|채널정산)/.test(v)) return "CHANNEL";
  if (/^(기타|other|etc)/.test(v)) return "OTHER";
  return null;
}

export interface SettlementImportRow extends RowResult<Settlement> {
  duplicate: boolean;
}

export const settlementKey = (s: Pick<Settlement, "kind" | "counterparty" | "issuedOn" | "amount">) => `${s.kind}|${s.counterparty.trim().toLowerCase()}|${s.issuedOn}|${Math.round(s.amount)}`;

export function validateSettlementRows(input: {
  body: string[][];
  map: Record<SettlementField, number>;
  existing: Settlement[];
  b2b: B2BAccount[];
  channels: Channel[];
  today: string;
}): SettlementImportRow[] {
  const { body, map, existing, b2b, channels, today } = input;
  const existingKeys = new Set(existing.map(settlementKey));
  const seen = new Set<string>();
  const b2bByName = new Map(b2b.map((b) => [b.name.trim().toLowerCase(), b.id]));
  const chByName = new Map(channels.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const cell = (raw: string[], f: SettlementField) => (map[f] >= 0 ? (raw[map[f]] ?? "").trim() : "");
  const money = (raw: string) => { const n = normalizeNumber(raw); return Number.isFinite(n) ? Math.round(n) : NaN; };

  return body.map((raw, n) => {
    const errors: string[] = [];
    const kind = parseSettlementKind(cell(raw, "kind"));
    if (!kind) errors.push(`구분 인식 불가: "${cell(raw, "kind")}" (B2B·수출·채널·기타)`);
    const counterparty = cell(raw, "counterparty").slice(0, 100);
    if (!counterparty) errors.push("거래처 비어 있음");
    const issuedOn = normalizeDate(cell(raw, "issuedOn"));
    if (!issuedOn) errors.push(`청구일 인식 불가: "${cell(raw, "issuedOn")}"`);
    else if (issuedOn > today) errors.push(`청구일이 오늘 이후: ${issuedOn}`);
    const amount = money(cell(raw, "amount"));
    if (!(amount > 0)) errors.push(`청구액은 0보다 큰 금액: "${cell(raw, "amount")}"`);
    const paidRaw = cell(raw, "paidAmount");
    const paidAmount = paidRaw ? money(paidRaw) : 0;
    if (!(paidAmount >= 0)) errors.push(`입금액 인식 불가: "${paidRaw}"`);
    else if (amount > 0 && paidAmount > amount) errors.push("입금액이 청구액보다 큼");
    const dueRaw = cell(raw, "dueOn");
    const dueOn = dueRaw ? normalizeDate(dueRaw) : null;
    if (dueRaw && !dueOn) errors.push(`입금 기한 인식 불가: "${dueRaw}"`);
    else if (dueOn && issuedOn && dueOn < issuedOn) errors.push("입금 기한이 청구일보다 빠름");
    const paidOnRaw = cell(raw, "paidOn");
    const paidOn = paidOnRaw ? normalizeDate(paidOnRaw) : null;
    if (paidOnRaw && !paidOn) errors.push(`입금일 인식 불가: "${paidOnRaw}"`);
    else if (paidOn && paidOn > today) errors.push(`입금일이 오늘 이후: ${paidOn}`);

    if (errors.length) return { line: n + 2, raw, errors, duplicate: false };
    const refId = kind === "B2B" ? b2bByName.get(counterparty.toLowerCase()) ?? null : kind === "CHANNEL" ? chByName.get(counterparty.toLowerCase()) ?? null : null;
    const value: Settlement = {
      id: uuidv4(), kind: kind!, counterparty, refId,
      description: cell(raw, "description").slice(0, 200) || null,
      amount, paidAmount, issuedOn: issuedOn!, dueOn, paidOn: paidAmount > 0 ? paidOn : null,
      status: "OPEN", note: cell(raw, "note").slice(0, 500) || null,
    };
    value.status = statusFor(value);
    const key = settlementKey(value);
    const duplicate = existingKeys.has(key) || seen.has(key);
    seen.add(key);
    return { line: n + 2, raw, value, errors, duplicate };
  });
}
