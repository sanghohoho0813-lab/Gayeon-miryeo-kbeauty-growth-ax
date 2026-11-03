// PASS 39 검수 — Demo 실데이터 백업 알림(D-142) · 고객 제품 목록 '뒤로' 위치 복원(D-143) · axe
//   AXE_PATH=…/axe-core/axe.min.js node qa/pass39.mjs
import { chromium, check, summary, newCtx, watch, go, overflowX, axe } from "./lib.mjs";

const browser = await chromium.launch();
const errsAll = [];
const nudge = (p) => p.locator('[data-testid="backup-nudge"]');
/** 화면 안에 보이는 제품 카드 링크를 그 자리에서 누름 (locator.first()는 위쪽 같은 링크로 화면을 옮겨 버림) */
const clickVisibleProduct = (p) => p.evaluate(() => {
  const a = [...document.querySelectorAll('a[href^="/beauty/products/"]')].find((x) => { const r = x.getBoundingClientRect(); return r.top > 60 && r.top < innerHeight - 100 && r.width > 0; });
  a?.click(); return a?.getAttribute("href") ?? null;
});

/** 데이터 관리 > 상품에서 실제 상품 하나 등록 (1440: 옆 칸 입력) */
async function addProduct(p, sku, name, price) {
  await go(p, "/ax/data?tab=products", 800);
  await p.locator('[data-testid="master-new"]').click(); await p.waitForTimeout(300);
  await p.locator("#p-sku").fill(sku); await p.locator("#p-name").fill(name); await p.locator("#p-price").fill(String(price));
  await p.getByRole("button", { name: "저장", exact: true }).click(); await p.waitForTimeout(700);
}

/* ── D-142 Demo 실데이터 백업 알림 ── */
{
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax", 1200);
  check("시연 자료만 있으면 알림 없음", await nudge(p).count() === 0);
  await go(p, "/ax/data?tab=export", 800);
  check("백업 카드 — 아직 받은 적 없음 문구", (await p.locator('[data-testid="backup-last"]').innerText()).includes("받은 적이 없습니다"));

  await addProduct(p, "QA-BK-001", "검수용 실제 앰플", 31000);
  await go(p, "/ax", 1200);
  check("실데이터 생기면 대시보드 알림 (아직 백업 안 함)", await nudge(p).count() === 1 && await nudge(p).getAttribute("data-kind") === "never");
  check("알림 — 상품 1 · 이 브라우저에만", (await p.locator('[data-testid="backup-nudge-detail"]').innerText()).includes("상품 1"));
  check("알림 제목은 h2 (대시보드 제목 단계)", await nudge(p).locator("h2").count() === 1);
  await go(p, "/ax/data?tab=products", 600);
  check("데이터 관리 안내도 보임 (아직 백업 안 함)", await p.locator('[data-testid="backup-reminder"]').getAttribute("data-kind") === "never");

  // 대시보드에서 바로 받기 → 파일 이름 · 알림 사라짐 · 안내 사라짐 · 카드 '바뀐 것 없음'
  await go(p, "/ax", 1200);
  const [dl] = await Promise.all([p.waitForEvent("download"), p.locator('[data-testid="backup-nudge-get"]').click()]);
  check("백업 파일 이름 (miryeo_transfer_날짜_DEMO.json)", /^miryeo_transfer_\d{4}-\d{2}-\d{2}_DEMO\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const body = JSON.parse(await (await import("fs")).promises.readFile(await dl.path(), "utf8"));
  check("받은 파일에 등록한 상품", body.kind === "miryeo-transfer" && body.products.some((x) => x.sku === "QA-BK-001"));
  await p.waitForTimeout(300);
  check("받으면 알림 사라짐", await nudge(p).count() === 0);
  await go(p, "/ax/data?tab=products", 600);
  check("받은 뒤 데이터 관리 안내 없음", await p.locator('[data-testid="backup-reminder"]').count() === 0);
  await go(p, "/ax/data?tab=export", 800);
  check("백업 카드 — 마지막 백업 · 바뀐 것 없음", await p.locator('[data-testid="backup-last"]').getAttribute("data-fresh") === "1");

  // 받은 뒤 상품 하나 더 → '바뀐 자료' 알림 · 상품 +1
  await addProduct(p, "QA-BK-002", "검수용 실제 크림", 27000);
  await go(p, "/ax", 1200);
  check("받은 뒤 바뀌면 다시 알림 ('changed')", await nudge(p).getAttribute("data-kind") === "changed");
  check("바뀐 것 — 상품 +1개", (await p.locator('[data-testid="backup-nudge-detail"]').innerText()).includes("상품 +1개"));
  await go(p, "/ax/data?tab=export", 800);
  check("백업 카드 — 그 뒤 상품 +1개", (await p.locator('[data-testid="backup-last"]').innerText()).includes("상품 +1개"));
  // 백업 카드에서 받아도 같은 기록
  const [dl2] = await Promise.all([p.waitForEvent("download"), p.locator('[data-testid="transfer-download"]').click()]);
  check("백업 카드에서 받기", !!dl2.suggestedFilename());
  await p.waitForTimeout(300);
  check("백업 카드에서 받아도 '바뀐 것 없음'", await p.locator('[data-testid="backup-last"]').getAttribute("data-fresh") === "1");
  await go(p, "/ax", 1200);
  check("…대시보드 알림도 사라짐", await nudge(p).count() === 0);

  // '내일 다시 알림' → 오늘은 숨김 (새로고침해도)
  await addProduct(p, "QA-BK-003", "검수용 실제 토너", 19000);
  await go(p, "/ax", 1200);
  await p.locator('[data-testid="backup-nudge-snooze"]').click(); await p.waitForTimeout(200);
  check("'내일 다시 알림' → 숨김", await nudge(p).count() === 0);
  await go(p, "/ax", 1200);
  check("새로고침해도 오늘은 숨김", await nudge(p).count() === 0);
  await go(p, "/ax/data?tab=products", 600);
  check("미뤄도 데이터 관리 안내는 그대로 (바뀐 것 표시)", (await p.locator('[data-testid="backup-reminder"]').innerText()).includes("상품 +1개"));
  // 다음 날이 되면 다시 (미룬 날짜를 어제로)
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("miryeo-backup-snooze:")) localStorage.setItem(k, "2000-01-01"); });
  await go(p, "/ax", 1200);
  check("미룬 날이 지나면 다시 알림", await nudge(p).count() === 1);
  const v = await axe(p); check("axe 대시보드 (알림 있음)", v.length === 0, v.join(" | "));
  await ctx.close();

  // 390 — 알림이 화면 안에 들어오고 넘침 없음 · 직원(STAFF)은 안 보임
  const ctx2 = await newCtx(browser, 390, 844); const p2 = await ctx2.newPage(); errsAll.push(watch(p2));
  await go(p2, "/ax/data?tab=products", 600);
  // 390은 서랍 입력 — 같은 방법으로 등록
  await p2.locator('[data-testid="master-new"]').click(); await p2.waitForTimeout(400);
  await p2.locator("#p-sku").fill("QA-BK-390"); await p2.locator("#p-name").fill("검수용 휴대폰 상품"); await p2.locator("#p-price").fill("15000");
  await p2.getByRole("button", { name: "저장", exact: true }).click(); await p2.waitForTimeout(700);
  await go(p2, "/ax", 1200);
  const box = await nudge(p2).boundingBox();
  check("390 알림 보임 · 넘침 0", !!box && box.width <= 390 && await overflowX(p2) <= 0);
  const btn = await p2.locator('[data-testid="backup-nudge-get"]').boundingBox();
  check("390 받기 버튼 높이 ≥ 40px", !!btn && btn.height >= 40, JSON.stringify(btn));
  await p2.evaluate(() => localStorage.setItem("miryeo-demo-role", "STAFF"));
  await go(p2, "/ax", 1200);
  check("직원(재무 권한 없음)에게는 알림 없음", await nudge(p2).count() === 0);
  await ctx2.close();
}

/* ── D-143 고객 제품 목록 '뒤로' 위치 복원 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/beauty/products", 800);
  const target = await p.evaluate(() => Math.min(1800, document.documentElement.scrollHeight - innerHeight - 200));
  await p.evaluate((y) => window.scrollTo(0, y), target); await p.waitForTimeout(400);
  const y0 = await p.evaluate(() => window.scrollY);
  const href = await clickVisibleProduct(p); await p.waitForURL(/\/beauty\/products\/.+/); await p.waitForTimeout(800);
  check("제품 상세로 이동", p.url().includes(href));
  await p.goBack(); await p.waitForTimeout(1200);
  const y1 = await p.evaluate(() => window.scrollY);
  check("'뒤로' → 보던 위치 (±4px)", Math.abs(y1 - y0) <= 4, `${y0} → ${y1}`);
  check("보던 제품이 화면 안", await p.evaluate((h) => [...document.querySelectorAll(`a[href="${h}"]`)].some((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.top > 0 && r.top < innerHeight; }), href));

  // 조건(고민 필터)이 있는 주소도
  await go(p, "/beauty/products?concern=%EC%88%98%EB%B6%84", 800);
  const t2 = await p.evaluate(() => Math.max(0, Math.min(900, document.documentElement.scrollHeight - innerHeight - 50)));
  await p.evaluate((y) => window.scrollTo(0, y), t2); await p.waitForTimeout(300);
  const y2 = await p.evaluate(() => window.scrollY);
  const href2 = await clickVisibleProduct(p);
  if (href2) {
    await p.waitForURL(/\/beauty\/products\/.+/); await p.waitForTimeout(700);
    await p.goBack(); await p.waitForTimeout(1200);
    check("조건 있는 목록도 위치 · 조건 유지", Math.abs((await p.evaluate(() => window.scrollY)) - y2) <= 4 && decodeURIComponent(p.url()).includes("concern=수분"));
  } else check("조건 있는 목록 — 화면 안 제품 찾기", false, "제품 링크 없음");

  // 다른 길(메뉴 '제품')로 오면 맨 위부터
  await go(p, "/beauty/products", 800);
  await p.evaluate(() => window.scrollTo(0, 1200)); await p.waitForTimeout(300);
  await clickVisibleProduct(p); await p.waitForURL(/\/beauty\/products\/.+/); await p.waitForTimeout(700);
  await p.locator('a[href="/beauty/products"]:visible').first().click(); await p.waitForURL(/\/beauty\/products$/); await p.waitForTimeout(1000);
  check("메뉴로 다시 오면 맨 위부터", (await p.evaluate(() => window.scrollY)) < 50, String(await p.evaluate(() => window.scrollY)));
  await ctx.close();
}

check("페이지 오류·콘솔 오류 0", errsAll.flat().length === 0, errsAll.flat().slice(0, 3).join(" | "));
await browser.close();
summary("qa/pass39");
