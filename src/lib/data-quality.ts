import type { DataSnapshot } from "./data/source";

/* 데이터 품질 점검 (계약 3단계 "실제 자료 적용") — 실제 엑셀을 옮기다 생기는 흔한 실수를 자동으로 찾는다.
   '오류'는 계산이 틀어지는 값, '확인'은 맞을 수도 있지만 사람이 한 번 봐야 하는 값. 값을 자동으로 바꾸지 않고 고칠 화면을 알려준다 — 미래 날짜·중복 판매만 대표·관리자가 확인 후 삭제(D-051). */
export interface QualityIssue {
  id: string;
  level: "오류" | "확인";
  title: string;
  why: string;
  count: number;
  samples: string[];
  href: string;
  /** 바로 정리할 수 있는 판매 행 (대표·관리자, 확인 후 삭제) */
  fix?: { label: string; rowIds: string[] };
}

const UNIT_LOW = 0.3; // 판매 단가가 판매가의 30% 미만 → 단위·합계 혼동 의심
const UNIT_HIGH = 1.5; // 판매가의 150% 초과

export function checkDataQuality(s: DataSnapshot, today: string): QualityIssue[] {
  const name = new Map(s.products.map((p) => [p.id, p.name]));
  const price = new Map(s.products.map((p) => [p.id, p.price]));
  const out: QualityIssue[] = [];
  const add = (i: Omit<QualityIssue, "count" | "samples">, list: string[]) => { if (list.length) out.push({ ...i, count: list.length, samples: list.slice(0, 5) }); };
  const future = s.sales.filter((x) => x.saleDate > today);

  add({ id: "price-missing", level: "오류", title: "판매가가 0원인 상품", why: "추천 생산량·매출 자동 계산·고객 화면 가격이 틀립니다.", href: "/ax/data?tab=products" }, s.products.filter((p) => !(p.price > 0)).map((p) => p.name));
  add({ id: "cost-over-price", level: "오류", title: "원가가 판매가 이상인 상품", why: "마진이 0% 이하로 계산됩니다. 원가·판매가 단위(원/천원)를 확인하세요.", href: "/ax/data?tab=products" }, s.products.filter((p) => p.cost != null && p.price > 0 && p.cost >= p.price).map((p) => `${p.name} (원가 ${p.cost!.toLocaleString()} ≥ 판매가 ${p.price.toLocaleString()})`));
  add({ id: "future-sale", level: "오류", title: "오늘 이후 날짜의 판매", why: "최근 4주 판매·성장률 계산이 틀어집니다. 날짜 열(주문일·배송일)을 확인한 뒤 다시 올리세요.", href: "/ax/data", fix: { label: `미래 날짜 판매 ${future.length}건 삭제`, rowIds: future.map((x) => x.id) } }, future.map((x) => `${x.saleDate} ${name.get(x.productId) ?? ""} ${x.units}개`));

  const odd = s.sales.filter((x) => {
    const pr = price.get(x.productId);
    if (!pr || x.units <= 0 || x.revenue <= 0) return false;
    const unit = x.revenue / x.units;
    return unit < pr * UNIT_LOW || unit > pr * UNIT_HIGH;
  });
  add({ id: "odd-unit-price", level: "확인", title: "판매 단가가 판매가와 크게 다른 판매", why: `매출 ÷ 수량이 판매가의 ${UNIT_LOW * 100}% 미만이거나 ${UNIT_HIGH * 100}% 초과입니다. 천원 단위·주문 합계·묶음 수량이 섞였는지 확인하세요 (대량 할인·묶음 판매면 정상).`, href: "/ax/data" }, odd.map((x) => `${x.saleDate} ${name.get(x.productId) ?? ""} ${x.units}개 ${x.revenue.toLocaleString()}원 (판매가 ${price.get(x.productId)!.toLocaleString()})`));
  add({ id: "zero-revenue", level: "확인", title: "수량은 있는데 매출이 0원인 판매", why: "증정·샘플이면 정상이고, 매출 열이 비어 들어왔다면 매출이 빠집니다.", href: "/ax/data" }, s.sales.filter((x) => x.units > 0 && x.revenue === 0).map((x) => `${x.saleDate} ${name.get(x.productId) ?? ""} ${x.units}개`));

  const seen = new Map<string, number>();
  const extra: string[] = [];
  for (const x of s.sales) { if (x.source === "seed") continue; const k = `${x.saleDate}|${x.productId}|${x.channelId}|${x.units}|${Math.round(x.revenue)}`; const n = (seen.get(k) ?? 0) + 1; seen.set(k, n); if (n > 1) extra.push(x.id); }
  add({ id: "dup-sales", level: "확인", title: "같은 날·상품·채널·수량·매출의 판매가 여러 건", why: "같은 파일을 두 번 올렸을 수 있습니다. 실제로 같은 주문이 여러 번이면 정상이니 지우지 마세요.", href: "/ax/data", fix: { label: `중복분 ${extra.length}건 삭제 (각 1건 남김)`, rowIds: extra } }, [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => { const [d, pid, , u] = k.split("|"); return `${d} ${name.get(pid) ?? ""} ${u}개 × ${n}건`; }));

  const sold = new Set(s.sales.filter((x) => x.saleDate > `${today.slice(0, 4)}-00`).map((x) => x.productId));
  add({ id: "no-inventory", level: "확인", title: "재고가 입력되지 않은 상품", why: "재고일수·품절 위험·생산 착수 마감을 계산할 수 없습니다.", href: "/ax/products?tab=inventory" }, s.products.filter((p) => !s.inventory.some((i) => i.productId === p.id)).map((p) => p.name));
  add({ id: "no-cost", level: "확인", title: "원가가 없는 상품", why: "월별 이익·매출총이익률 계산에서 빠집니다.", href: "/ax/data?tab=products" }, s.products.filter((p) => p.cost == null).map((p) => p.name));
  add({ id: "no-leadtime", level: "확인", title: "판매 중인데 OEM 생산기간이 없는 상품", why: "생산 착수 마감일을 계산하지 못하고 6주 예측으로만 추천합니다.", href: "/ax/data?tab=products" }, s.products.filter((p) => p.leadTimeDays == null && sold.has(p.id)).map((p) => p.name));
  add({ id: "no-link", level: "확인", title: "고객 화면에 공개했지만 구매 링크가 없는 상품", why: "고객이 구매처로 이동하지 못하고 '연결 예정' 안내를 봅니다.", href: "/ax/data?tab=products" }, s.products.filter((p) => p.isPublished && !p.purchaseLinks.some((l) => l.url)).map((p) => p.name));
  add({ id: "due-before-issue", level: "확인", title: "입금 기한이 청구일보다 빠른 정산", why: "연체 일수가 실제보다 길게 계산됩니다.", href: "/ax/channels?tab=settlements" }, s.settlements.filter((x) => x.dueOn && x.dueOn < x.issuedOn).map((x) => `${x.counterparty} (청구 ${x.issuedOn} · 기한 ${x.dueOn})`));

  return out.sort((a, b) => (a.level === b.level ? b.count - a.count : a.level === "오류" ? -1 : 1));
}
