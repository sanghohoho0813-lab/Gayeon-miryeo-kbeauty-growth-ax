// 단위 검사 — 지난 확인 이후 (src/lib/since-last.ts, PASS 37 · D-136)
//   node qa/unit37.mjs   (저장소 루트에서 — typescript로 바로 옮겨 실행, 브라우저 불필요)
import { createRequire } from "module";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { check, summary } from "./lib.mjs";

const ts = createRequire(join(process.cwd(), "package.json"))("typescript");
const dir = mkdtempSync(join(tmpdir(), "unit37-"));
for (const f of ["date", "settlements", "since-last"]) {
  const src = readFileSync(join(process.cwd(), "src/lib", `${f}.ts`), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/from "\.\/(date|settlements)"/g, 'from "./$1.mjs"').replace(/import type [^;]+;\n?/g, "");
  writeFileSync(join(dir, `${f}.mjs`), js);
}
const { takeSnapshot, sinceLines, parseSnapshot } = await import(join(dir, "since-last.mjs"));

const OPEN = ["NEW", "REVIEWED", "IN_PROGRESS"];
const st = (id, counterparty, amount, paid, due, status) => ({ id, kind: "B2B", counterparty, amount, paidAmount: paid, issuedOn: "2026-09-01", dueOn: due, status });
const base = {
  at: "2026-11-01T09:00:00Z", today: "2026-11-01",
  actions: [{ id: "a1", status: "NEW", title: "앰플 B 생산 착수" }, { id: "a2", status: "DONE", title: "끝난 일" }],
  openStatuses: OPEN,
  settlements: [st("s1", "거래처 A", 10_000_000, 0, "2026-10-20", "OPEN"), st("s2", "거래처 B", 5_000_000, 0, "2026-11-20", "OPEN"), st("s3", "수출 C", 3_000_000, 0, "2026-11-05", "OPEN")],
  risk: [{ id: "p1", name: "앰플 B" }, { id: "p2", name: "크림 C" }],
  products: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
  salesRows: 100, salesAsOf: "2026-10-31",
};
const prev = takeSnapshot(base);
check("스냅숏 — 열린 Action만", JSON.stringify(prev.openActions) === '["a1"]');
check("스냅숏 — 연체(기한 지남·남은 금액)", JSON.stringify(prev.overdue) === '["s1"]');
check("스냅숏 — 미입금 3건", prev.unpaid.length === 3);
check("저장값 읽기 — 같은 형식이면 그대로", JSON.stringify(parseSnapshot(JSON.stringify(prev))) === JSON.stringify(prev));
check("저장값 읽기 — 깨진 값·다른 버전은 null", parseSnapshot("{oops") === null && parseSnapshot(JSON.stringify({ ...prev, v: 2 })) === null && parseSnapshot(null) === null);
check("바뀐 것 없으면 빈 목록", sinceLines(prev, base).length === 0);

// 6일 뒤: 새 Action 2 · s3 연체(기한 11.05 지남) · s2 완납 · p3 새 위험 · p2 해소 · 판매 +40행
const now = {
  ...base, at: "2026-11-07T09:00:00Z", today: "2026-11-07",
  actions: [...base.actions, { id: "a3", status: "NEW", title: "토너 E 재고 확인" }, { id: "a4", status: "IN_PROGRESS", title: "거래처 A 회수" }, { id: "a5", status: "DISMISSED", title: "보류한 일" }],
  settlements: [base.settlements[0], { ...base.settlements[1], paidAmount: 5_000_000, status: "PAID" }, base.settlements[2]],
  risk: [{ id: "p1", name: "앰플 B" }, { id: "p3", name: "토너 E" }],
  salesRows: 140, salesAsOf: "2026-11-06",
};
const L = sinceLines(prev, now);
const by = Object.fromEntries(L.map((l) => [l.key, l]));
check("순서: 살펴볼 것 → 좋아진 것 → 참고", L.map((l) => l.key).join() === "actions,overdue,risk,paid,riskResolved,sales", L.map((l) => l.key).join());
check("새 Action 2건 (열린 것만, 이미 있던 a1 제외)", by.actions?.text === "새 Action 2건" && by.actions.detail === "토너 E 재고 확인, 거래처 A 회수");
check("새로 연체 1건 · 300만 원 · 거래처", by.overdue?.text === "새로 연체 1건 · 300만 원" && by.overdue.detail === "수출 C" && by.overdue.fin === true);
check("이미 연체였던 s1은 다시 안 셈", !by.overdue.text.includes("2건"));
check("재고 위험 새 상품 1개 (토너 E)", by.risk?.text === "재고 위험 새 상품 1개" && by.risk.detail === "토너 E");
check("입금 완료 1건 · 500만 원 · 재무", by.paid?.text === "입금 완료 1건 · 500만 원" && by.paid.fin === true);
check("재고 위험 해소 1개", by.riskResolved?.text === "재고 위험 해소 1개");
check("판매 기록 40행 추가 · 마지막 판매일", by.sales?.text === "판매 기록 40행 추가" && by.sales.detail === "마지막 판매일 10.31 → 11.06");
check("링크 — 새 Action·연체·위험은 걸러진 화면", by.actions.href === "/ax/growth?status=NEW" && by.overdue.href.includes("filter=overdue") && by.risk.href.includes("status="));
// 지워진 상품의 위험은 '해소'로 세지 않음 · 판매 줄어듦
const gone = sinceLines(prev, { ...base, risk: [{ id: "p1", name: "앰플 B" }], products: [{ id: "p1" }, { id: "p3" }], salesRows: 90 });
check("지워진 상품은 해소로 안 셈", !gone.some((l) => l.key === "riskResolved"));
check("판매 기록 줄어듦 (삭제·되돌리기)", gone.find((l) => l.key === "sales")?.text === "판매 기록 10행 줄어듦 (삭제·되돌리기)");
// 이름이 많으면 '외 n'
const many = sinceLines({ ...prev, openActions: [] }, { ...now, actions: [1, 2, 3, 4].map((n) => ({ id: `x${n}`, status: "NEW", title: `일${n}` })) });
check("이름 3개 넘으면 '외 n'", many.find((l) => l.key === "actions")?.detail === "일1, 일2 외 2");
// 큰 금액 억 단위
const big = sinceLines(prev, { ...base, today: "2026-11-07", settlements: [st("s9", "수출 D", 250_000_000, 0, "2026-11-02", "OPEN"), ...base.settlements] });
check("억 단위 금액", big.find((l) => l.key === "overdue")?.text.includes("2.5억 원"));
summary("unit37 (지난 확인 이후)");
