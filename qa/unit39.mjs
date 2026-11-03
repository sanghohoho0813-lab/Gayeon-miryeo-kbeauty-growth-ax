// 단위 검사 — Demo 실데이터 백업 상태 (src/lib/backup-status.ts, PASS 39 · D-142)
//   node qa/unit39.mjs   (저장소 루트에서 — typescript로 바로 옮겨 실행, 브라우저 불필요)
import { createRequire } from "module";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { check, summary } from "./lib.mjs";

const ts = createRequire(join(process.cwd(), "package.json"))("typescript");
const dir = mkdtempSync(join(tmpdir(), "unit39-"));
const src = readFileSync(join(process.cwd(), "src/lib/backup-status.ts"), "utf8");
writeFileSync(join(dir, "backup-status.mjs"), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/import type [^;]+;\n?/g, ""));
const { backupSignature, markBackup, parseBackupMark, backupNeed, deltaText } = await import(join(dir, "backup-status.mjs"));

const file = (over = {}) => ({
  kind: "miryeo-transfer", version: 1, exportedAt: "2026-11-01T00:00:00Z", fromMode: "demo", orgName: "테스트",
  org: { pilotStartedOn: null, axOwnerName: null },
  channels: [{ id: "c1" }],
  products: [{ id: "p1", price: 30000, cost: 9000 }],
  inventory: [{ productId: "p1", currentStock: 100, incomingStock: 0 }],
  sales: [{ id: "s1", units: 2, revenue: 60000 }],
  settlements: [{ id: "t1", amount: 1_000_000, paidAmount: 0 }],
  monthlyTargets: [],
  ...over,
});
const empty = file({ channels: [], products: [], inventory: [], sales: [], settlements: [] });
const NOW = "2026-11-04T09:00:00Z";

check("실데이터 없으면 알리지 않음", backupNeed(empty, null, NOW) === null);
const never = backupNeed(file(), null, NOW);
check("한 번도 받지 않았으면 'never' · 개수", never?.kind === "never" && never.counts.products === 1 && never.counts.sales === 1 && never.counts.settlements === 1);
const mark = markBackup(file(), "2026-11-01T09:00:00Z");
check("받은 뒤 그대로면 알리지 않음", backupNeed(file(), mark, NOW) === null);
const more = backupNeed(file({ sales: [...file().sales, { id: "s2", units: 1, revenue: 30000 }, { id: "s3", units: 1, revenue: 30000 }] }), mark, NOW);
check("판매 2행 추가 → 'changed' · 3일 전 · +2", more?.kind === "changed" && more.days === 3 && more.delta.sales === 2 && deltaText(more.delta) === "판매 +2행");
const edited = backupNeed(file({ inventory: [{ productId: "p1", currentStock: 80, incomingStock: 0 }] }), mark, NOW);
check("행 수 그대로 값만 고침(재고) → '값 수정'", edited?.kind === "changed" && deltaText(edited.delta) === "값 수정");
const paid = backupNeed(file({ settlements: [{ id: "t1", amount: 1_000_000, paidAmount: 1_000_000 }] }), mark, NOW);
check("입금 처리도 바뀜으로 셈", paid?.kind === "changed");
const price = backupNeed(file({ products: [{ id: "p1", price: 32000, cost: 9000 }] }), mark, NOW);
check("가격 수정도 바뀜으로 셈", price?.kind === "changed");
const removed = backupNeed(file({ products: [], inventory: [], sales: [] , settlements: [{ id: "t1", amount: 1_000_000, paidAmount: 0 }] }), mark, NOW);
check("지우면 −로 표시", removed?.kind === "changed" && deltaText(removed.delta) === "판매 −1행 · 상품 −1개");
check("같은 날이면 0일", backupNeed(file({ sales: [] }), mark, "2026-11-01T20:00:00Z")?.days === 0);
check("지문은 같은 자료면 같음", backupSignature(file()) === backupSignature(file()));
check("저장값 읽기 — 같은 형식이면 그대로", JSON.stringify(parseBackupMark(JSON.stringify(mark))) === JSON.stringify(mark));
check("저장값 읽기 — 깨진 값·다른 버전·빈 값은 null", parseBackupMark("{x") === null && parseBackupMark(JSON.stringify({ ...mark, v: 2 })) === null && parseBackupMark(null) === null);
check("큰 수는 천 단위 쉼표", deltaText({ products: 0, sales: 1200, settlements: 0 }) === "판매 +1,200행");
summary("unit39 (백업 상태)");
