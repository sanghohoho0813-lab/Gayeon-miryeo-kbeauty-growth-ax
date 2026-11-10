// 단위 검사 — PASS 41·42 안정화 (D-146 ~ D-152): 다음 자정까지 · 묶음 오류 판별·한 번만 새로고침 · 고객 저장값 정리 · 새 버전 판별 · 오류 기록
//   node qa/unit41.mjs   (저장소 루트에서 — typescript로 바로 옮겨 실행, 브라우저 불필요)
import { createRequire } from "module";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { check, summary } from "./lib.mjs";

const ts = createRequire(join(process.cwd(), "package.json"))("typescript");
const dir = mkdtempSync(join(tmpdir(), "unit41-"));
async function load(file) {
  const src = readFileSync(join(process.cwd(), "src/lib", file), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/import type [^;]+;\n?/g, "");
  const name = file.replace(/\.ts$/, ".mjs");
  writeFileSync(join(dir, name), out);
  return import(join(dir, name));
}

// ── 다음 한국 자정까지 (date.ts)
{
  const { msToNextDay, todayISO } = await load("date.ts");
  const at = (iso) => Date.parse(iso);
  check("23:59:30 → 30초", msToNextDay(at("2026-12-31T23:59:30+09:00")) === 30_000);
  check("00:00:00 → 24시간", msToNextDay(at("2027-01-01T00:00:00+09:00")) === 86_400_000);
  check("12:00 → 12시간", msToNextDay(at("2026-11-10T12:00:00+09:00")) === 43_200_000);
  check("UTC 15:00(= 한국 자정) 직전 1ms", msToNextDay(at("2026-11-10T14:59:59.999Z")) === 1);
  // 남은 시간 뒤에는 한국 날짜가 바뀐다 (윤일 포함)
  for (const iso of ["2028-02-28T18:00:00+09:00", "2028-02-29T23:00:00+09:00", "2026-12-31T08:59:00+09:00"]) {
    const now = at(iso);
    check(`${iso} + 남은 시간 → 다음 날`, todayISO(new Date(now + msToNextDay(now))) !== todayISO(new Date(now)) && todayISO(new Date(now + msToNextDay(now) - 1)) === todayISO(new Date(now)));
  }
}

// ── 화면 코드 묶음 오류 (chunk-error.ts)
{
  const store = new Map(); let reloads = 0;
  globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  globalThis.window = { location: { reload: () => { reloads++; } } };
  const { isChunkLoadError, reloadOnceForChunk } = await load("chunk-error.ts");
  check("Turbopack 'Failed to load chunk'", isChunkLoadError(new Error("Failed to load chunk /_next/static/chunks/0io5e.js from module 123")));
  check("webpack ChunkLoadError", isChunkLoadError(Object.assign(new Error("Loading chunk 12 failed."), { name: "ChunkLoadError" })));
  check("브라우저 dynamic import 실패", isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/y.js")));
  check("Safari 문구", isChunkLoadError(new TypeError("Importing a module script failed.")));
  check("보통 오류는 아님", !isChunkLoadError(new TypeError("Cannot read properties of null (reading 'map')")));
  check("값 없음·글자는 아님", !isChunkLoadError(null) && !isChunkLoadError("Failed to load chunk"));
  const t0 = 1_800_000_000_000;
  check("처음 → 새로고침", reloadOnceForChunk(t0) === true && reloads === 1);
  check("30초 뒤 또 실패 → 새로고침 안 함(안내 화면)", reloadOnceForChunk(t0 + 30_000) === false && reloads === 1);
  check("2분 뒤 → 다시 새로고침", reloadOnceForChunk(t0 + 120_000) === true && reloads === 2);
  store.set("miryeo-chunk-reload", "깨진 값");
  check("깨진 기록 → 새로고침(기록 다시)", reloadOnceForChunk(t0 + 300_000) === true && reloads === 3 && store.get("miryeo-chunk-reload") === String(t0 + 300_000));
  globalThis.sessionStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  check("저장소를 못 쓰면 자동 새로고침 안 함(되풀이 방지 불가)", reloadOnceForChunk(t0 + 900_000) === false && reloads === 3);
  delete globalThis.window; delete globalThis.sessionStorage;
}

// ── 고객 화면 저장값 정리 (beauty-store.ts)
{
  const { cleanIds, cleanConcerns, cleanResult } = await load("beauty-store.ts");
  check("목록이 아니면 빈 목록", [null, 123, "x", { a: 1 }, undefined].every((v) => cleanIds(v).length === 0));
  check("글자만 · 빈 글자·중복 버림", JSON.stringify(cleanIds(["p-1", 5, null, "", "p-1", { id: "p-2" }, "p-3"])) === '["p-1","p-3"]');
  check("최대 개수", cleanIds(Array.from({ length: 30 }, (_, i) => `p-${i}`), 8).length === 8);
  check("너무 긴 값 버림", cleanIds(["a".repeat(201), "ok"]).join() === "ok");
  check("고민은 정해진 값만", JSON.stringify(cleanConcerns(["수분", "없는 고민", 3, "탄력", "수분"])) === '["수분","탄력"]');
  const good = { createdAt: "2026-11-01T03:00:00.000Z", profile: { concerns: ["진정"], careGoal: "g", texture: "t", routineLevel: "r", budget: "b" }, productIds: ["p-1", "p-2"], reasons: { "p-1": "이유" } };
  check("정상 결과는 그대로", JSON.stringify(cleanResult(good)) === JSON.stringify(good));
  check("객체가 아니면 없음", [null, 5, "x", [], [good]].every((v) => cleanResult(v) === null));
  check("시각이 없거나 날짜가 아니면 없음", cleanResult({ ...good, createdAt: undefined }) === null && cleanResult({ ...good, createdAt: "어제" }) === null);
  check("제품 목록이 목록이 아니면 없음 · 0개는 결과로 둠", cleanResult({ ...good, productIds: "p-1" }) === null && cleanResult({ ...good, productIds: undefined }) === null && cleanResult({ ...good, productIds: [] })?.productIds.length === 0);
  const partial = cleanResult({ createdAt: good.createdAt, productIds: ["p-1", 7], profile: null, reasons: ["x"] });
  check("일부만 깨졌으면 그 부분만 비움", partial && partial.productIds.join() === "p-1" && partial.profile.concerns.length === 0 && partial.profile.careGoal === "" && Object.keys(partial.reasons).length === 0);
  const mixed = cleanResult({ ...good, profile: { concerns: "수분", careGoal: 5 }, reasons: { "p-1": "이유", "p-2": 3 } });
  check("고민이 글자 하나·이유가 숫자여도 멈추지 않음", mixed && mixed.profile.concerns.length === 0 && mixed.profile.careGoal === "" && mixed.reasons["p-1"] === "이유" && !("p-2" in mixed.reasons));
}

// ── 새 버전 판별 (build-version.ts)
{
  const { isNewerBuild } = await load("build-version.ts");
  check("번호가 다르면 새 버전", isNewerBuild("abc1234", { id: "def5678" }));
  check("같으면 아님", !isNewerBuild("abc1234", { id: "abc1234" }));
  check("내 번호를 모르면 알리지 않음", !isNewerBuild("", { id: "def5678" }));
  check("답이 이상하면 알리지 않음", [null, "def", {}, { id: "" }, { id: 5 }, []].every((a) => !isNewerBuild("abc1234", a)));
}

// ── 이 브라우저의 오류 기록 (error-log.ts)
{
  const { addError, cleanErrorLog, errorLogText, errorMessage } = await load("error-log.ts");
  const e = (over = {}) => ({ at: "2026-11-10T01:00:00.000Z", kind: "error", message: "Minified React error #418", path: "/ax", build: "abc", ...over });
  let list = addError([], e());
  check("첫 오류 1줄 · 1번", list.length === 1 && list[0].count === 1);
  list = addError(list, e({ at: "2026-11-10T02:00:00.000Z" }));
  check("같은 화면의 같은 오류 → 줄은 그대로, 2번, 마지막 시각", list.length === 1 && list[0].count === 2 && list[0].at === "2026-11-10T02:00:00.000Z");
  list = addError(list, e({ path: "/ax/monthly" }));
  check("다른 화면이면 새 줄 · 최근 것이 위", list.length === 2 && list[0].path === "/ax/monthly");
  list = addError(list, e({ path: "/ax?tab=x#y", at: "2026-11-10T03:00:00.000Z" }));
  check("주소의 ? · # 뒤는 적지 않음 (같은 화면으로 합침)", list.length === 2 && list[0].path === "/ax" && list[0].count === 3);
  check("무해한 알림은 적지 않음", addError(list, e({ message: "ResizeObserver loop completed with undelivered notifications." })) === list && addError(list, e({ message: "" })) === list);
  let many = [];
  for (let i = 0; i < 40; i++) many = addError(many, e({ message: `오류 ${i}` }));
  check("최근 30종만", many.length === 30 && many[0].message === "오류 39" && many[29].message === "오류 10");
  check("긴 글은 300자까지", addError([], e({ message: "가".repeat(500) }))[0].message.length === 300);
  check("오류 글 — 이름 붙임 · 줄바꿈 정리", errorMessage(Object.assign(new Error("Failed to load\n chunk"), { name: "ChunkLoadError" })) === "ChunkLoadError: Failed to load chunk" && errorMessage(new Error("x")) === "x" && errorMessage("글자") === "글자" && errorMessage({ a: 1 }) === '{"a":1}');
  check("저장값이 목록이 아니면 빈 기록", [null, 5, "x", {}].every((v) => cleanErrorLog(v).length === 0));
  check("맞는 줄만 남김", cleanErrorLog([e({ count: 2 }), null, { at: "어제", kind: "error", message: "m", path: "/" }, e({ kind: "모름" }), e({ message: 5 }), e({ count: "많이" })]).map((x) => x.count).join() === "2,1");
  const text = errorLogText(list, { build: "abc", mode: "DEMO", now: "2026-11-10T04:00:00.000Z", userAgent: "UA" });
  check("복사 글 — 버전·모드·건수·줄마다 화면·횟수·오류 글", /버전 abc · DEMO/.test(text) && /기록 2건/.test(text) && /1\. 2026-11-10T03:00:00.000Z · 화면 오류 · \/ax · 3번/.test(text) && /Minified React error #418/.test(text));
  check("복사 글 — 다른 버전에서 난 오류는 버전 표시", /버전 old/.test(errorLogText([e({ build: "old", count: 1 })], { build: "abc", mode: "DEMO", now: "n", userAgent: "UA" })));
}

summary("unit41 (안정화: 날짜 넘김·묶음 오류·저장값 정리·새 버전·오류 기록)");
