// 안정화 검수 (PASS 41·42, D-146 ~ D-151) — 평소 화면 점검으로는 안 보이는 조건에서 화면이 버티는지
//   A 날짜 경계: 빌드한 날과 다른 날(월말·새해·윤일)에 열어도 오류·깨진 글자 없음, 상단 '분석 기준'이 그날 기준
//   B 자정 넘김: 켜 둔 화면이 날짜가 바뀌면 자료를 다시 읽음 · 오래 가려 두었다 돌아와도
//   C 차트 묶음 실패: 화면은 그대로, 차트 자리만 '다시 시도'
//   D 화면 이동 중 묶음 실패(새 버전 배포 뒤 옛 탭): 한 번 자동 새로고침, 되풀이하지 않음
//   E 저장값 손상: 고객·운영 화면이 멈추지 않음
//   F 두 번 누름: 같은 기록이 두 건 생기지 않음 · 겹친 저장은 알림
//   G 새 버전 알림
//   H 이 브라우저의 오류 기록
//   AXE_PATH=…/axe-core/axe.min.js node qa/stability.mjs
import { chromium, check, summary, newCtx, watch, go, overflowX, axe, BASE } from "./lib.mjs";

const AX = ["/ax", "/ax/monthly", "/ax/products", "/ax/products?tab=inventory", "/ax/products?tab=production", "/ax/channels", "/ax/customers",
  "/ax/growth", "/ax/reports", "/ax/reports/weekly", "/ax/business", "/ax/why", "/ax/start", "/ax/data", "/ax/data?tab=products", "/ax/data?tab=channels", "/ax/data?tab=b2b",
  "/ax/data?tab=export", "/ax/system", "/ax/settings", "/ax/present"];
const BEAUTY = ["/beauty", "/beauty/finder", "/beauty/products", "/beauty/passport", "/beauty/me", "/beauty/login"];
// 화면에 나오면 안 되는 글자 — 계산·날짜가 깨졌을 때
const BAD = "NaN|undefined|Infinity|Invalid Date|\\[object Object\\]|(^|[^a-zA-Z])null([^a-zA-Z]|$)";
const DB = "miryeo-demo-db-v2";
const ERROR_SCREENS = '[data-testid="ax-error"],[data-testid="app-error"],[data-testid="beauty-error"],[data-testid="ax-chunk-error"],[data-testid="app-chunk-error"],[data-testid="beauty-chunk-error"]';

const browser = await chromium.launch();
const badText = (p) => p.evaluate((src) => { const re = new RegExp(src); return document.body.innerText.split("\n").filter((l) => re.test(l)).map((l) => l.trim().slice(0, 90)).slice(0, 3); }, BAD);
const errorScreen = (p) => p.locator(ERROR_SCREENS).count();
const db = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), DB);
const kr = (iso) => iso.replaceAll("-", ".");
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ───────── A. 날짜 경계 — 빌드한 날과 다른 날에 열기
for (const t of ["2026-11-30T23:58:00+09:00", "2027-01-01T00:05:00+09:00", "2028-02-29T12:00:00+09:00", "2027-03-31T10:00:00+09:00"]) {
  const day = t.slice(0, 10);
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); const errs = watch(p);
  await p.clock.install({ time: new Date(t) });
  for (const r of [...AX, ...BEAUTY, "/review/ax-sprint2"]) {
    errs.length = 0;
    await go(p, r, 400);
    const bad = await badText(p);
    check(`A ${day} ${r} 오류·깨진 글자 없음`, errs.length === 0 && bad.length === 0 && (await errorScreen(p)) === 0, [...errs.map((e) => e.slice(0, 110)), ...bad].join(" | "));
    if (r === "/ax") {
      const label = (await p.locator('[data-testid="header-period"]').innerText()).trim();
      check(`A ${day} 상단 분석 기준 = 그날 기준 4주`, label === `최근 4주 · ${kr(addDays(day, -27))} ~ ${kr(day)}`, label);
    }
  }
  await ctx.close();
}

// ───────── B. 자정 넘김 · 오래 가려 두었다 돌아옴
{
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); const errs = watch(p);
  await p.addInitScript((k) => {
    window.__dbReads = 0;
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) { if (key === k) window.__dbReads++; return get.call(this, key); };
    let vis = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => vis });
    window.__setVisible = (on) => { vis = on ? "visible" : "hidden"; document.dispatchEvent(new Event("visibilitychange")); };
  }, DB);
  await p.clock.install({ time: new Date("2026-12-31T23:59:20+09:00") });
  await go(p, "/ax", 800);
  const period = () => p.locator('[data-testid="header-period"]').innerText();
  const reads = () => p.evaluate(() => window.__dbReads);
  check("B 자정 전 — 분석 기준 끝 2026.12.31", (await period()).endsWith("2026.12.31"), await period());
  const r0 = await reads();
  await p.clock.fastForward("01:00"); await p.waitForTimeout(600);
  check("B 자정 넘김 — 분석 기준 끝 2027.01.01", (await period()).endsWith("2027.01.01"), await period());
  check("B 자정 넘김 — 자료를 다시 읽음", (await reads()) > r0, `${r0} → ${await reads()}`);
  check("B 자정 넘김 — Demo 기준일이 새 날로", (await db(p)).seededOn === "2027-01-01", (await db(p)).seededOn);
  check("B 자정 넘김 — 오류 화면·깨진 글자 없음", (await errorScreen(p)) === 0 && (await badText(p)).length === 0 && errs.length === 0, errs.join(" | ").slice(0, 200));
  // 잠깐(2분) 가렸다 오면 그대로, 오래(6분) 가렸다 오면 다시 읽음
  const r1 = await reads();
  await p.evaluate(() => window.__setVisible(false)); await p.clock.fastForward("02:00"); await p.evaluate(() => window.__setVisible(true)); await p.waitForTimeout(400);
  check("B 2분 가렸다 옴 — 다시 읽지 않음", (await reads()) === r1, `${r1} → ${await reads()}`);
  await p.evaluate(() => window.__setVisible(false)); await p.clock.fastForward("06:00"); await p.evaluate(() => window.__setVisible(true)); await p.waitForTimeout(600);
  check("B 6분 가렸다 옴 — 자료를 다시 읽음", (await reads()) > r1, `${r1} → ${await reads()}`);
  check("B 돌아온 뒤 오류 없음", errs.length === 0 && (await errorScreen(p)) === 0, errs.join(" | ").slice(0, 200));
  await ctx.close();
}

// ───────── C. 차트 묶음 실패
async function chartChunks(route) {
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); const res = [];
  p.on("response", (r) => { if (/\/_next\/static\/.*\.js/.test(r.url())) res.push(r); }); // 배포본은 /_next/static/immutable/chunks/ 아래
  await go(p, route, 900);
  const urls = [];
  for (const r of res) { try { if (/recharts|ResponsiveContainer|CartesianGrid/.test(await r.text())) urls.push(r.url()); } catch { /* 본문 없음 */ } }
  await ctx.close();
  return urls;
}
for (const [route, w] of [["/ax", 1440], ["/ax/monthly", 390]]) {
  const urls = await chartChunks(route);
  check(`C ${route} 차트 묶음을 찾음`, urls.length > 0, String(urls.length));
  // (1) 한 번 실패 뒤 성공 → 저절로 그려짐
  {
    const ctx = await newCtx(browser, w, 900); const p = await ctx.newPage(); const tried = new Set();
    await p.route((u) => urls.includes(u.toString()), (route_) => { const u = route_.request().url(); if (tried.has(u)) return route_.continue(); tried.add(u); return route_.abort(); });
    await go(p, route, 500);
    const drawn = await p.waitForSelector(".recharts-wrapper", { timeout: 8000 }).then(() => true).catch(() => false);
    check(`C ${w} ${route} 첫 시도 실패 → 다시 받아 차트가 그려짐`, drawn && (await p.locator('[data-testid="chart-failed"]').count()) === 0 && (await errorScreen(p)) === 0);
    await ctx.close();
  }
  // (2) 계속 실패 → 화면은 그대로, 차트 자리만 안내 → 다시 시도
  {
    const ctx = await newCtx(browser, w, 900); const p = await ctx.newPage(); let block = true;
    await p.route((u) => urls.includes(u.toString()), (route_) => (block ? route_.abort() : route_.continue()));
    await go(p, route, 500);
    const failed = await p.waitForSelector('[data-testid="chart-failed"]', { timeout: 8000 }).then(() => true).catch(() => false);
    check(`C ${w} ${route} 계속 실패 → 차트 자리에 안내`, failed);
    const st = await p.evaluate(() => ({ h1: document.querySelector("main h1")?.textContent ?? "", len: document.querySelector("main")?.innerText.length ?? 0, btn: Math.min(...[...document.querySelectorAll('[data-testid="chart-retry"]')].map((b) => b.getBoundingClientRect().height)) }));
    check(`C ${w} ${route} 화면은 그대로 (오류 화면 아님 · 제목·숫자 있음)`, (await errorScreen(p)) === 0 && st.h1.length > 0 && !/표시하지 못했습니다/.test(st.h1) && st.len > 500, JSON.stringify(st));
    check(`C ${w} ${route} 다시 시도 버튼 ≥ 40px · 가로 넘침 0`, st.btn >= 40 && (await overflowX(p)) <= 0, `${st.btn}px · ${await overflowX(p)}px`);
    if (w === 1440 && failed) check(`C ${route} 안내 영역 axe`, (await axe(p, '[data-testid="chart-failed"]')).length === 0, (await axe(p, '[data-testid="chart-failed"]')).join(" | "));
    block = false;
    for (let i = 0; i < 6 && (await p.locator('[data-testid="chart-retry"]').count()) > 0; i++) { await p.locator('[data-testid="chart-retry"]').first().click(); await p.waitForTimeout(700); }
    check(`C ${w} ${route} 다시 시도 → 차트가 그려지고 안내 사라짐`, (await p.locator(".recharts-wrapper").count()) > 0 && (await p.locator('[data-testid="chart-failed"]').count()) === 0);
    await ctx.close();
  }
}

// ───────── D. 화면 이동 중 묶음 실패 (새 버전 배포 뒤 옛 탭 · 잠깐 끊긴 연결)
{
  // (1) 한 번 자동 새로고침 → 이어서 씀
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage();
  const seen = new Set(); let blocking = false, blocked = 0, loads = 0, prefetch = false;
  // 새로고침(문서 요청)이 시작되면 그때부터는 새 묶음을 받을 수 있다 — 실제로는 새 버전의 화면이 새 묶음을 가리킨다
  p.on("request", (r) => { if (r.isNavigationRequest() && r.frame() === p.mainFrame()) { loads++; blocking = false; } if (!blocking) seen.add(r.url()); });
  // 다른 화면을 미리 받아 두지 못하게 해서(메뉴를 누르기 전까지) '그 화면 묶음을 아직 안 받은 옛 탭'을 만든다
  await p.route((u) => u.searchParams.has("_rsc"), (route) => (prefetch ? route.continue() : route.abort()));
  await p.route(/\/_next\/static\/.*\.js/, (route) => { if (blocking && !seen.has(route.request().url())) { blocked++; return route.fulfill({ status: 404, body: "not found" }); } return route.continue(); });
  await go(p, "/ax", 800);
  const l0 = loads; blocking = true; prefetch = true;
  await p.locator('a[href="/ax/monthly"]').first().click();
  await p.waitForFunction(() => location.pathname === "/ax/monthly" && document.querySelector("main h1")?.textContent?.includes("월별 실적"), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  check("D 옛 묶음을 못 받음(404) → 한 번 새로고침", blocked > 0 && loads === l0 + 1, `막은 묶음 ${blocked} · 새로고침 ${loads - l0}`);
  check("D 새로고침 뒤 가려던 화면이 열림", (await p.locator("main h1").innerText()).includes("월별 실적") && (await errorScreen(p)) === 0, await p.locator("main h1").innerText());
  check("D 새로고침한 때를 적어 둠 (되풀이 방지)", Number(await p.evaluate(() => sessionStorage.getItem("miryeo-chunk-reload"))) > 0);
  await ctx.close();
}
{
  // (2) 방금 새로고침했는데 또 실패 → 되풀이하지 않고 안내
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage();
  const seen = new Set(); let blocking = false, loads = 0, prefetch = false;
  p.on("request", (r) => { if (r.isNavigationRequest() && r.frame() === p.mainFrame()) loads++; if (!blocking) seen.add(r.url()); });
  await p.route((u) => u.searchParams.has("_rsc"), (route) => (prefetch ? route.continue() : route.abort()));
  await p.route(/\/_next\/static\/.*\.js/, (route) => (blocking && !seen.has(route.request().url()) ? route.abort() : route.continue()));
  await go(p, "/ax", 800);
  await p.evaluate(() => sessionStorage.setItem("miryeo-chunk-reload", String(Date.now())));
  const l0 = loads; blocking = true; prefetch = true;
  await p.locator('a[href="/ax/monthly"]').first().click();
  const shown = await p.waitForSelector('[data-testid="ax-chunk-error"]', { timeout: 10000 }).then(() => true).catch(() => false);
  check("D 1분 안에 또 실패 → 새로고침을 되풀이하지 않고 안내", shown && loads === l0, `안내 ${shown} · 새로고침 ${loads - l0}`);
  if (shown) {
    const t = await p.locator('[data-testid="ax-chunk-error"]').innerText();
    check("D 안내에 새로고침 버튼 · 내부 오류 글자 없음", /새로고침/.test(t) && !/Failed to load chunk|_next/.test(t), t.slice(0, 120));
    check("D 안내 화면에서도 메뉴는 그대로", (await p.locator('a[href="/ax"]').count()) > 0);
    blocking = false;
    await p.locator('[data-testid="ax-chunk-error"] button').click();
    await p.waitForFunction(() => document.querySelector("main h1")?.textContent?.includes("월별 실적"), null, { timeout: 15000 }).catch(() => {});
    check("D 새로고침 버튼 → 화면이 열림", (await p.locator("main h1").innerText()).includes("월별 실적"));
  }
  await ctx.close();
}

// ───────── E. 저장값 손상 — 이 브라우저에 남은 값이 어떤 모양이어도 화면이 멈추지 않음
{
  const KEYS = ["miryeo-ax-fontscale", "miryeo-ax-motion", "miryeo-ax-theme", "miryeo-backup-mark", "miryeo-beauty-concerns", "miryeo-beauty-last-result", "miryeo-beauty-recent-search",
    "miryeo-beauty-recently-viewed", "miryeo-beauty-wishlist", "miryeo-dash-analysis", "miryeo-demo-customer", "miryeo-demo-members", "miryeo-demo-role", "miryeo-device-view", "miryeo-funnel-mode",
    "miryeo-inventory-sort", "miryeo-inventory-view", "miryeo-list-scroll", "miryeo-operator", "miryeo-pending-consent", "miryeo-products-sort", "miryeo-readiness-anon", "miryeo-schedule-view",
    "miryeo-session-id", "miryeo-snack", "miryeo-toast", "miryeo-transfer", "miryeo-chunk-reload", "miryeo-error-log"];
  const GARBAGE = { "null": "null", "숫자": "123", "글자": '"x"', "객체": '{"v":999,"items":"no","at":12}', "섞인 목록": '[{"id":null},null,5,"a"]', "깨진 JSON": "{" };
  const routes = [...BEAUTY, "/ax", "/ax/products", "/ax/customers", "/ax/data", "/ax/settings", "/ax/system"];
  for (const [name, val] of Object.entries(GARBAGE)) {
    const ctx = await newCtx(browser, 390, 844);
    await ctx.addInitScript(([keys, v]) => { for (const k of keys) { try { localStorage.setItem(k, v); sessionStorage.setItem(k, v); } catch { /* noop */ } } }, [KEYS, val]);
    const p = await ctx.newPage(); const errs = watch(p); const bad = [];
    for (const r of routes) {
      errs.length = 0;
      await go(p, r, 350);
      if (errs.length || (await errorScreen(p))) bad.push(`${r}: ${errs[0]?.slice(0, 90) ?? "오류 화면"}`);
    }
    check(`E 저장값이 모두 '${name}' — ${routes.length}개 화면 오류 없음`, bad.length === 0, bad.join(" | "));
    await ctx.close();
  }
  // 일부만 깨진 찜 목록 — 쓸 수 있는 것만 남김
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); const errs = watch(p);
  await go(p, "/beauty/products", 500);
  const id = (await p.locator('a[href^="/beauty/products/"]').first().getAttribute("href")).split("/").pop();
  await p.evaluate((pid) => localStorage.setItem("miryeo-beauty-wishlist", JSON.stringify([pid, 5, null, pid, { id: "x" }])), id);
  await go(p, "/beauty/passport", 600);
  const wish = await p.evaluate(() => JSON.parse(localStorage.getItem("miryeo-beauty-wishlist")));
  check("E 일부만 깨진 찜 목록 — 화면이 열리고 오류 없음", errs.length === 0 && (await errorScreen(p)) === 0, errs.join(" | ").slice(0, 160));
  check("E 찜한 제품 하나가 보임", (await p.locator(`a[href="/beauty/products/${id}"]`).count()) > 0, JSON.stringify(wish));
  await ctx.close();
}

// ───────── F. 두 번 누름 — 같은 기록이 두 건 생기지 않음
{
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); const errs = watch(p);
  // (1) 청구·정산 추가 — 같은 순간 두 번
  await go(p, "/ax/channels?tab=settlements", 700);
  await p.getByRole("button", { name: "청구·정산 추가" }).click();
  await p.fill("#st-cp", "두번누름 상사"); await p.fill("#st-amount", "1230000");
  await p.evaluate(() => { const b = document.querySelector('[data-testid="settlement-save"]'); b.click(); b.click(); });
  await p.waitForTimeout(700);
  const n1 = (await db(p)).settlements.filter((s) => s.counterparty === "두번누름 상사").length;
  check("F 청구 저장을 같은 순간 두 번 → 1건만", n1 === 1, `${n1}건`);
  check("F 저장 뒤 창이 닫힘 · 오류 없음", (await p.locator('[data-testid="settlement-save"]').count()) === 0 && errs.length === 0, errs.join(" | ").slice(0, 160));
  // (2) 판매 1건 입력 — Enter 두 번
  await go(p, "/ax/data", 700);
  const before = (await db(p)).sales.filter((s) => s.source === "manual").length;
  await p.fill("#s-units", "3");
  await p.evaluate(() => { const f = document.querySelector('[data-testid="manual-sale-form"]'); f.requestSubmit(); f.requestSubmit(); });
  await p.waitForTimeout(700);
  const after = (await db(p)).sales.filter((s) => s.source === "manual").length;
  check("F 판매 저장을 같은 순간 두 번 → 1건만", after === before + 1, `${before} → ${after}`);
  // (3) 서로 다른 저장이 겹침 — 앞선 것만 저장하고 뒤의 것은 알림 (조용히 버리지 않음)
  await go(p, "/ax/settings#pilot", 800);
  await p.fill("#pilot-date", "2026-10-01"); await p.fill("#ax-owner", "겹친저장 확인");
  await p.evaluate(() => { const b = (id) => document.getElementById(id).parentElement.querySelector("button"); b("pilot-date").click(); b("ax-owner").click(); });
  await p.waitForTimeout(700);
  const org = (await db(p)).org;
  check("F 겹친 저장 — 앞선 저장은 됨", org.pilotStartedOn === "2026-10-01", JSON.stringify(org).slice(0, 120));
  check("F 겹친 저장 — 뒤의 저장은 안 됨 + 알림", !org.axOwnerName && (await p.getByText("앞선 저장을 처리하는 중입니다").count()) > 0, String(org.axOwnerName));
  await p.evaluate(() => document.getElementById("ax-owner").parentElement.querySelector("button").click());
  await p.waitForTimeout(600);
  check("F 다시 누르면 저장됨 (잠금이 풀림)", (await db(p)).org.axOwnerName === "겹친저장 확인", String((await db(p)).org.axOwnerName));
  check("F 오류 없음", errs.length === 0, errs.join(" | ").slice(0, 160));
  await ctx.close();
}

// ───────── G. 새 버전 알림
{
  const api = await (await fetch(`${BASE}/api/version`, { cache: "no-store" }));
  const mine = await api.json();
  check("G /api/version — 번호·빌드 시각 · 저장해 두지 않음(no-store)", api.status === 200 && typeof mine.id === "string" && mine.id.length >= 7 && !Number.isNaN(Date.parse(mine.builtAt)) && /no-store/.test(api.headers.get("cache-control") ?? ""), JSON.stringify(mine));
  for (const [w, theme] of [[1440, "deep-navy"], [390, "pure-white"]]) {
    const ctx = await newCtx(browser, w, 900, { theme }); const p = await ctx.newPage(); const errs = watch(p);
    let answer = { id: "zzz9999", builtAt: new Date().toISOString() }, asked = 0, loads = 0;
    p.on("load", () => { loads++; });
    await p.route("**/api/version", (route) => { asked++; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer) }); });
    await p.clock.install({ time: new Date() });
    await go(p, "/ax", 700);
    const banner = p.locator('[data-testid="new-version"]');
    await p.clock.fastForward("02:00"); await p.evaluate(() => window.dispatchEvent(new Event("focus"))); await p.waitForTimeout(300);
    check(`G ${w} 처음 5분은 묻지 않음 · 알림 없음`, asked === 0 && (await banner.count()) === 0, `물음 ${asked}`);
    await p.clock.fastForward("04:00"); await p.waitForTimeout(500);
    check(`G ${w} 5분 뒤 서버 버전이 다르면 알림`, asked >= 1 && (await banner.count()) === 1, `물음 ${asked}`);
    if (await banner.count()) {
      const t = await banner.innerText();
      check(`G ${w} 알림 글 — 새 버전 · 저장한 자료는 그대로`, /새 버전이 나왔습니다/.test(t) && /저장한 자료는 그대로/.test(t), t.slice(0, 100));
      const hs = await banner.locator("button").evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
      check(`G ${w} 버튼 ≥ 40px · 가로 넘침 0`, hs.length === 2 && hs.every((h) => h >= 40) && (await overflowX(p)) <= 0, `${hs.join("·")}px · ${await overflowX(p)}px`);
      const v = await axe(p, '[data-testid="new-version"]');
      check(`G ${w} (${theme}) 알림 axe`, v.length === 0, v.join(" | "));
      await p.locator('[data-testid="new-version-later"]').click();
      check(`G ${w} 나중에 → 사라짐`, (await banner.count()) === 0);
      await p.locator('a[href="/ax/products"]:visible').first().click(); await p.waitForTimeout(700); // 넓은 화면은 옆 메뉴, 휴대폰은 아래 메뉴
      check(`G ${w} 다른 화면으로 가도 다시 뜨지 않음`, (await banner.count()) === 0 && !(await p.url()).endsWith("/ax"), p.url());
      // 새로고침하면(아직 옛 버전) 다시 알림 → 새로고침 버튼
      await p.reload({ waitUntil: "networkidle" }); await p.clock.fastForward("06:00"); await p.waitForTimeout(500);
      const l0 = loads;
      check(`G ${w} 새로 연 화면에서 다시 알림`, (await banner.count()) === 1);
      await p.locator('[data-testid="new-version-reload"]').click(); await p.waitForLoadState("networkidle");
      check(`G ${w} 새로고침 버튼 → 화면을 새로 받음`, loads === l0 + 1, `${loads - l0}`);
    }
    // 같은 버전·이상한 답 → 알림 없음
    answer = mine; await p.clock.fastForward("06:00"); await p.waitForTimeout(400);
    check(`G ${w} 서버 버전이 같으면 알림 없음`, (await banner.count()) === 0);
    answer = { nope: true }; await p.clock.fastForward("06:00"); await p.waitForTimeout(400);
    check(`G ${w} 답이 이상하면 알림 없음 · 오류 없음`, (await banner.count()) === 0 && errs.length === 0, errs.join(" | ").slice(0, 160));
    await ctx.close();
  }
  // 공개 전 점검 화면에 이 화면의 버전
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage();
  await go(p, "/ax/system", 900);
  const line = await p.locator('[data-testid="build-version"]').innerText().catch(() => "");
  check("G 공개 전 점검에 이 화면의 버전 (= 서버 버전)", line.includes(mine.id) && /빌드/.test(line), line);
  await ctx.close();
}

// ───────── H. 이 브라우저의 오류 기록
{
  const ctx = await newCtx(browser, 1440, 900, { clipboard: true }); const p = await ctx.newPage();
  await go(p, "/ax/system", 900);
  check("H 처음에는 기록 없음", (await p.locator('[data-testid="error-log-empty"]').count()) === 1);
  // 화면 밖으로 새어 나온 오류 · 처리되지 않은 약속 오류
  await go(p, "/ax/monthly?x=1", 600);
  await p.evaluate(() => { setTimeout(() => { throw new Error("검수용 화면 오류"); }, 0); setTimeout(() => { throw new Error("검수용 화면 오류"); }, 20); Promise.reject(new Error("검수용 처리 오류")); });
  await p.waitForTimeout(400);
  await go(p, "/ax/system", 900);
  const rows = await p.locator('[data-testid="error-log-list"] li').allInnerTexts();
  check("H 오류 2종이 기록됨 (같은 오류 두 번 = 한 줄 2번)", rows.length === 2 && rows.some((r) => /검수용 화면 오류/.test(r) && /2번/.test(r) && /화면 오류/.test(r)) && rows.some((r) => /검수용 처리 오류/.test(r) && /1번/.test(r) && /처리 오류/.test(r)), rows.join(" ¦ ").slice(0, 300));
  check("H 화면 경로만 적음 (? 뒤 없음)", rows.every((r) => r.includes("/ax/monthly") && !r.includes("x=1")), rows.join(" ¦ ").slice(0, 200));
  await p.locator('[data-testid="error-log-copy"]').click(); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  const mine = await (await fetch(`${BASE}/api/version`)).json();
  check("H 복사 글 — 버전·DEMO·2건·오류 글", clip.includes(`버전 ${mine.id} · DEMO`) && /기록 2건/.test(clip) && /검수용 화면 오류/.test(clip) && /검수용 처리 오류/.test(clip), clip.slice(0, 200));
  check("H 카드 axe · 가로 넘침 0", (await axe(p, '[data-testid="error-log"]')).length === 0 && (await overflowX(p)) <= 0, (await axe(p, '[data-testid="error-log"]')).join(" | "));
  await p.locator('[data-testid="error-log-clear"]').click(); await p.waitForTimeout(300);
  check("H 지우기 → 기록 없음", (await p.locator('[data-testid="error-log-empty"]').count()) === 1 && (await p.evaluate(() => localStorage.getItem("miryeo-error-log"))) === null);
  // 오류 화면으로 바뀐 오류도 기록 (화면 묶음 실패)
  await p.evaluate(() => localStorage.setItem("miryeo-error-log", "{깨진 값"));
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(600);
  check("H 깨진 기록 값 → 빈 기록으로 열림", (await p.locator('[data-testid="error-log-empty"]').count()) === 1);
  // 고객 화면·심사 화면은 기록하지 않음
  await go(p, "/beauty", 500);
  await p.evaluate(() => { setTimeout(() => { throw new Error("고객 화면 오류"); }, 0); }); await p.waitForTimeout(300);
  const log = await p.evaluate(() => localStorage.getItem("miryeo-error-log"));
  check("H 고객 화면의 오류는 적지 않음", log === "{깨진 값" || log === null, String(log).slice(0, 80));
  await ctx.close();
  // 휴대폰 폭
  const c2 = await newCtx(browser, 390, 844); const q = await c2.newPage();
  await go(q, "/ax", 500);
  await q.evaluate(() => { setTimeout(() => { throw new Error("아주 긴 오류 글 ".repeat(30)); }, 0); }); await q.waitForTimeout(300);
  await go(q, "/ax/system", 900);
  const hs = await q.locator('[data-testid="error-log"] button').evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().height)));
  check("H 390 긴 오류 글 — 가로 넘침 0 · 버튼 ≥ 40px", (await overflowX(q)) <= 0 && hs.length === 2 && hs.every((h) => h >= 40), `${await overflowX(q)}px · ${hs.join("·")}`);
  await c2.close();
}

await browser.close();
summary("qa/stability");
