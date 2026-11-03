// 단위 검사 — 생산 일정 협의 요청 글 (src/lib/production-request.ts, PASS 35 · D-128)
//   node qa/unit35.mjs   (저장소 루트에서 — typescript로 바로 옮겨 실행, 브라우저 불필요)
import { createRequire } from "module";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { check, summary } from "./lib.mjs";

const ts = createRequire(join(process.cwd(), "package.json"))("typescript");
const dir = mkdtempSync(join(tmpdir(), "unit35-"));
for (const f of ["date", "production-request"]) {
  const src = readFileSync(join(process.cwd(), "src/lib", `${f}.ts`), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/from "\.\/date"/g, 'from "./date.mjs"').replace(/import type [^;]+;\n?/g, "");
  writeFileSync(join(dir, `${f}.mjs`), js);
}
const { partnerOf, groupByPartner, productionRequestText, UNASSIGNED_PARTNER } = await import(join(dir, "production-request.mjs"));

const prod = (id, name, sku, moq) => ({ id, name, sku, moq, category: "크림", price: 1, status: "판매중", concerns: [], isPublished: false, purchaseLinks: [], mainChannelIds: [] });
const A = prod("a", "앰플 A", "AMP-A", 1000), B = prod("b", "크림 B", "CRM-B", null), C = prod("c", "토너 C", "TON-C", 500);
const plans = [
  { id: "1", productId: "a", partner: "옛 업체", quantity: 1, status: "완료", lastProducedAt: "2026-01-10" },
  { id: "2", productId: "a", partner: " 새 업체 ", quantity: 1, status: "완료", lastProducedAt: "2026-06-01" },
  { id: "3", productId: "b", partner: "새 업체", quantity: 1, status: "입고예정", lastProducedAt: null, expectedArrival: "2026-05-01" },
  { id: "4", productId: "c", partner: "  ", quantity: 1, status: "완료", lastProducedAt: "2026-07-01" },
];
check("가장 최근 생산 업체 (공백 정리)", partnerOf("a", plans) === "새 업체");
check("생산일 없으면 입고 예정일로", partnerOf("b", plans) === "새 업체");
check("이름이 빈 기록만 있으면 미지정", partnerOf("c", plans) === UNASSIGNED_PARTNER);
check("기록 없으면 미지정", partnerOf("zz", plans) === UNASSIGNED_PARTNER);

const items = [
  { product: B, daysToDeadline: 5, orderDeadline: "2026-11-08", recommendedOrder: 2500, leadTimeDays: 30 },
  { product: A, daysToDeadline: -3, orderDeadline: "2026-10-31", recommendedOrder: 10700, leadTimeDays: 45 },
  { product: C, daysToDeadline: -10, orderDeadline: "2026-10-24", recommendedOrder: 600, leadTimeDays: 20 },
];
const g = groupByPartner(items, plans);
check("업체별로 묶임 (2묶음)", g.length === 2, JSON.stringify(g.map((x) => x.partner)));
check("미지정은 맨 뒤 (더 급해도)", g[1].partner === UNASSIGNED_PARTNER && g[0].partner === "새 업체");
check("묶음 안은 착수 마감 순", g[0].items.map((x) => x.product.sku).join() === "AMP-A,CRM-B");
check("모든 상품이 한 번씩", g.reduce((a, x) => a + x.items.length, 0) === items.length);

const today = "2026-11-03";
const t = productionRequestText("새 업체", g[0].items, today, { orgName: "가연인터내셔널", demo: true }).split("\n");
check("Demo 첫 줄 표시", t[0].startsWith("※ 시연용"));
check("회사명·날짜", t[1] === "[가연인터내셔널] 생산 일정 협의 요청 · 2026.11.03");
check("받는 업체", t[2] === "새 업체 담당자님, 안녕하세요.");
check("수량·최소 생산수량", t.some((l) => l.includes("앰플 A (AMP-A) — 희망 수량 약 10,700개 (최소 생산수량 1,000개)")));
check("MOQ 없으면 괄호 없음", t.some((l) => l.endsWith("크림 B (CRM-B) — 희망 수량 약 2,500개")));
check("지난 마감 · 입고 예상(오늘 + 생산기간)", t.some((l) => l.includes("생산기간 45일 기준 착수 마감 2026.10.31 (3일 지남) · 지금 착수하면 입고 예상 2026.12.18")));
check("남은 마감", t.some((l) => l.includes("착수 마감 2026.11.08 (5일 남음)")));
check("발주서 아님 안내", t.some((l) => l.includes("발주 확정이 아닙니다")));
check("급한 상품이 먼저", t.findIndex((l) => l.includes("AMP-A")) < t.findIndex((l) => l.includes("CRM-B")));
const live = productionRequestText(UNASSIGNED_PARTNER, [{ ...items[2], daysToDeadline: 0 }], today, { orgName: "가연인터내셔널", demo: false }).split("\n");
check("Live는 시연 표시 없음", live[0].startsWith("[가연인터내셔널]"));
check("미지정이면 'OEM 담당자님'", live[1] === "OEM 담당자님, 안녕하세요.");
check("마감 당일은 '오늘'", live.some((l) => l.includes("(오늘)")));
check("항목 없으면 null", productionRequestText("x", [], today, { orgName: "o", demo: false }) === null);
summary("unit35 (생산 일정 협의 요청 글)");
