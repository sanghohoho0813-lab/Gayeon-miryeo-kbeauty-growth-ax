// PASS 36 검수 — 재고 간단히 보기(D-132) · 재고 한 번에 입력(D-133) · 좁은 화면 탭 두 줄(D-134) · 터치 대상(D-135) ·
//   생산 착수 일정 간단히 행 둘째 줄(D-127 보완) · axe 7테마
//   AXE_PATH=…/axe-core/axe.min.js node qa/pass36.mjs
import { chromium, check, summary, newCtx, watch, go, overflowX, axe, THEMES } from "./lib.mjs";

const browser = await chromium.launch();
const errsAll = [];
const num = (t) => Number(String(t).replace(/[^\d]/g, ""));

/* ── D-132 재고 현황 — 모바일 간단히 보기 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/products?tab=inventory");
  const list = p.locator('ul[data-testid="inventory-cards"]');
  check("재고 — 모바일 기본은 간단히", await list.getAttribute("data-view") === "compact");
  const rows = list.locator(":scope > li");
  const n = await rows.count();
  const allChip = num(await p.locator('[data-inv-status="전체"]').innerText());
  check("재고 — 행 수 = '전체' 칩 수", n === allChip && n > 0, `${n} vs ${allChip}`);
  const hs = await rows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check("재고 — 행 높이 100px 이하 (요약이 길면 두 줄로 감김, 말줄임 없음)", hs.every((h) => h <= 100), hs.map(Math.round).join(","));
  check("재고 — 화면 높이 2,000px 이하 (예전 약 4,000)", await p.evaluate(() => document.documentElement.scrollHeight) <= 2000);
  check("재고 — 둘째 줄 말줄임 없음", await rows.evaluateAll((els) => els.every((li) => { const s = li.querySelector('[data-testid="inventory-row"] .tabular'); return s && s.scrollWidth <= s.clientWidth + 1; })));
  // 첫 행: 화면의 재고 값 = 저장된 재고 (펼친 칸의 '현재 재고'와 같음)
  const r0 = rows.nth(0).locator('[data-testid="inventory-row"]');
  const line = await r0.innerText();
  await r0.click(); await p.waitForTimeout(200);
  check("누르면 펼침 (aria-expanded)", await r0.getAttribute("aria-expanded") === "true");
  const det = rows.nth(0).locator('[data-testid="inventory-detail"]');
  const detText = await det.innerText();
  check("펼친 칸 — 숫자 6개 · 재고 수정", (await det.locator("dt").count()) === 6 && await det.getByRole("button", { name: /재고 수정/ }).count() === 1);
  const cur = detText.match(/현재 재고\s*([\d,]+)개/)?.[1];
  check("한 줄 요약의 재고 = 펼친 칸의 현재 재고", !!cur && line.includes(`재고 ${cur}개`), `${line} / ${cur}`);
  await rows.nth(1).locator('[data-testid="inventory-row"]').click(); await p.waitForTimeout(200);
  check("다른 행 누르면 하나만 펼침", await list.locator('[data-testid="inventory-detail"]').count() === 1);
  await rows.nth(1).locator('[data-testid="inventory-row"]').click(); await p.waitForTimeout(150);
  check("다시 누르면 접힘", await list.locator('[data-testid="inventory-detail"]').count() === 0);
  // 상품 상세 · 재고 수정
  await r0.click(); await p.waitForTimeout(150);
  await det.getByRole("button", { name: /상품 상세/ }).click(); await p.waitForTimeout(400);
  check("펼친 칸 '상품 상세' → 상품 서랍", await p.locator('[data-overlay="drawer"]').count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await det.getByRole("button", { name: /재고 수정/ }).click(); await p.waitForTimeout(300);
  check("펼친 칸 '재고 수정' → 수정 창", await p.locator('[data-overlay="modal"]').count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  // 상태 칩과 함께
  const riskN = num(await p.locator('[data-inv-status="부족주의"]').innerText()) || 0;
  await p.locator('[data-inv-status="부족주의"]').click(); await p.waitForTimeout(200);
  check("부족주의 칩 — 행 수 = 칩 수", await p.locator('ul[data-testid="inventory-cards"] > li').count() === riskN);
  await p.locator('[data-inv-status="전체"]').click(); await p.waitForTimeout(200);
  // 자세히 · 기억
  await p.locator('[data-testid="inventory-view"] [data-view="full"]').click(); await p.waitForTimeout(200);
  check("자세히 — 모두 펼침", await list.locator('[data-testid="inventory-detail"]').count() === n);
  await go(p, "/ax/products?tab=inventory");
  check("보기 방식 기억 (새로고침)", await p.locator('ul[data-testid="inventory-cards"]').getAttribute("data-view") === "full");
  await p.locator('[data-testid="inventory-view"] [data-view="compact"]').click(); await p.waitForTimeout(150);
  check("390 넘침 0", await overflowX(p) <= 0);
  await ctx.close();
  // PC — 표 그대로
  const c2 = await newCtx(browser, 1440, 900); const p2 = await c2.newPage(); errsAll.push(watch(p2));
  await go(p2, "/ax/products?tab=inventory");
  check("1440 재고 — 표 그대로 · 보기 전환 없음", await p2.locator("table").count() >= 1 && await p2.locator('[data-testid="inventory-view"]').count() === 0);
  check("1440 재고 — '한 번에 입력' 버튼", await p2.locator('[data-testid="stocktake-open"]').isVisible());
  await c2.close();
}

/* ── D-133 재고 한 번에 입력 ── */
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await newCtx(browser, w, h); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/products?tab=inventory");
  await p.locator('[data-testid="stocktake-open"]').click(); await p.waitForTimeout(400);
  const dr = p.locator('[data-overlay="drawer"]');
  check(`${w} 한 번에 입력 — 서랍 열림`, await dr.count() === 1 && (await dr.locator("h2").innerText()).includes("재고 한 번에 입력"));
  const items = dr.locator('[data-stocktake]');
  const n = await items.count();
  const prodN = num(await p.locator('[data-inv-status="전체"]').innerText());
  check(`${w} 상품 수 = 전체 상품`, n === prodN, `${n} vs ${prodN}`);
  check(`${w} 바뀐 것만 저장 — 처음엔 비활성`, await p.locator('[data-testid="stocktake-save-changed"]').isDisabled());
  check(`${w} 모두 확인 저장 — 활성 (상품 수)`, !(await p.locator('[data-testid="stocktake-save-all"]').isDisabled()) && (await p.locator('[data-testid="stocktake-save-all"]').innerText()).includes(`${n}개`));
  // 첫 상품 — 입력칸 값 = 지난 값
  const first = items.nth(0);
  const sku0 = await first.getAttribute("data-stocktake");
  const prev = num((await first.innerText()).match(/지난 값 ([\d,]+)개/)?.[1]);
  const inp = first.locator("input");
  check(`${w} 입력칸 = 지난 값`, num(await inp.inputValue()) === prev);
  // 바꾸기 → 차이 표시 · 요약
  await inp.click(); await p.keyboard.type(String(prev + 37), { delay: 30 }); await p.waitForTimeout(150);
  check(`${w} 차이 +37 표시`, await first.locator("[data-diff]").getAttribute("data-diff") === "37");
  check(`${w} 요약 '바뀐 1개'`, (await p.locator('[data-testid="stocktake-summary"]').innerText()).includes("바뀐 1개"));
  check(`${w} 바뀐 것만 저장 (1개) 활성`, !(await p.locator('[data-testid="stocktake-save-changed"]').isDisabled()) && (await p.locator('[data-testid="stocktake-save-changed"]').innerText()).includes("1개"));
  // Enter → 다음 칸
  await p.keyboard.press("Enter"); await p.waitForTimeout(100);
  check(`${w} Enter → 다음 상품 칸`, await p.evaluate(() => document.activeElement?.closest("[data-stocktake]")?.getAttribute("data-stocktake")) === await items.nth(1).getAttribute("data-stocktake"));
  // 잘못된 값 → 저장 막힘
  await items.nth(1).locator("input").fill("12개요"); await p.waitForTimeout(100);
  check(`${w} 잘못된 값 → 두 저장 버튼 비활성 · 안내`, await p.locator('[data-testid="stocktake-save-all"]').isDisabled() && await p.locator('[data-testid="stocktake-save-changed"]').isDisabled() && await dr.getByRole("alert").count() >= 1);
  check(`${w} 잘못된 칸 aria-invalid`, await items.nth(1).locator("input").getAttribute("aria-invalid") === "true");
  await items.nth(1).locator("input").fill(String(num((await items.nth(1).innerText()).match(/지난 값 ([\d,]+)개/)?.[1]))); await p.waitForTimeout(100);
  // Esc → 저장 안 한 변경 확인 (D-129 공통)
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  check(`${w} 바꾼 뒤 Esc → 확인 줄`, await p.locator('[data-testid="drawer-dirty"]').isVisible());
  await p.locator('[data-testid="drawer-stay"]').click(); await p.waitForTimeout(100);
  // 검색 (10개 이상이면) — 값 유지
  if (await p.locator('[data-testid="stocktake-search"]').count()) {
    await p.locator('[data-testid="stocktake-search"]').fill("ㅇㅍ"); await p.waitForTimeout(150);
    const names = await dr.locator("[data-stocktake] label span.font-semibold").allInnerTexts();
    check(`${w} 검색 'ㅇㅍ' → 줄어듦 · 앰플 포함 (종류 '에센스/앰플'도 맞음)`, names.length > 0 && names.length < n && names.filter((x) => x.includes("앰플")).length >= 2, names.join(","));
    await p.locator('[data-testid="stocktake-search"]').fill(""); await p.waitForTimeout(100);
    check(`${w} 검색 지워도 입력한 값 그대로`, num(await dr.locator(`[data-stocktake="${sku0}"] input`).inputValue()) === prev + 37);
  }
  if (w === 390) {
    // 바뀐 것만 저장 → 그 상품만 '오늘 확인', 재고 반영
    const staleBefore = num((await p.locator('[data-testid="stocktake-summary"]').innerText()).match(/확인 안 함 (\d+)개/)?.[1]);
    await p.locator('[data-testid="stocktake-save-changed"]').click(); await p.waitForTimeout(700);
    check("바뀐 것만 저장 → 서랍 닫힘", await p.locator('[data-overlay="drawer"]').count() === 0);
    const card = p.locator(`[data-inv-card="${sku0}"]`);
    check("저장한 재고가 목록에 반영", (await card.innerText()).includes(`재고 ${(prev + 37).toLocaleString()}개`), await card.innerText());
    await p.locator('[data-testid="stocktake-open"]').click(); await p.waitForTimeout(300);
    check("저장한 상품 '오늘 확인'", (await p.locator(`[data-stocktake="${sku0}"]`).innerText()).includes("오늘 확인"));
    const staleAfter = num((await p.locator('[data-testid="stocktake-summary"]').innerText()).match(/확인 안 함 (\d+)개/)?.[1]);
    check("다른 상품의 확인 날짜는 그대로 (오래된 수 최대 1 감소)", staleBefore - staleAfter <= 1 && staleAfter >= 0, `${staleBefore} → ${staleAfter}`);
    // 모두 확인으로 저장 → 오래된 0
    await p.locator('[data-testid="stocktake-save-all"]').click(); await p.waitForTimeout(900);
    await p.locator('[data-testid="stocktake-open"]').click(); await p.waitForTimeout(300);
    check("모두 확인으로 저장 → 7일 넘은 상품 0", (await p.locator('[data-testid="stocktake-summary"]').innerText()).includes("확인 안 함 0개"));
    check("모두 확인 → 모든 상품 '오늘 확인'", (await p.locator("[data-stocktake]").allInnerTexts()).every((t) => t.includes("오늘 확인")));
    await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    check("바꾼 것 없으면 Esc로 바로 닫힘", await p.locator('[data-overlay="drawer"]').count() === 0);
  }
  await ctx.close();
}
// 바로 열기 주소 · 주간 점검·시작 가이드 연결
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/products?tab=inventory&stocktake=1");
  check("?stocktake=1 → 바로 열림", await p.locator('[data-overlay="drawer"] h2', { hasText: "재고 한 번에 입력" }).count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  check("닫으면 주소에서 stocktake 빠짐", !p.url().includes("stocktake"), p.url());
  await go(p, "/ax/start");
  const links = p.locator('a[aria-label^="처리하기"]');
  const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  const sizes = await links.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  check("주간 점검 '처리하기' 높이 32px 이상", sizes.length > 0 && sizes.every((h) => h >= 32), sizes.join(","));
  const inv = await p.locator('a[aria-label="처리하기: 재고 갱신"]').count();
  if (inv) check("주간 점검 '재고 갱신' → 한 번에 입력", hrefs.some((x) => x?.includes("stocktake=1")));
  const startInv = await p.locator('a[href*="tab=inventory"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  check("시작 가이드 재고 연결은 모두 한 번에 입력으로", startInv.every((x) => x.includes("stocktake=1")), startInv.join(" "));
  await ctx.close();
}

/* ── D-134 좁은 화면 탭 — 옆으로 숨지 않게 두 줄 ── */
for (const [w, h] of [[360, 780], [390, 844]]) {
  const ctx = await newCtx(browser, w, h); const p = await ctx.newPage(); errsAll.push(watch(p));
  for (const r of ["/ax/data", "/ax/settings", "/ax/customers", "/ax/channels", "/ax/products", "/ax/business"]) {
    await go(p, r, 500);
    const tl = p.locator('[role="tablist"]').first();
    if (!(await tl.count())) { check(`${w} ${r} 탭 있음`, false); continue; }
    const res = await tl.evaluate((el) => {
      const r = el.getBoundingClientRect(); const tabs = [...el.querySelectorAll('[role="tab"]')];
      const inside = tabs.every((t) => { const b = t.getBoundingClientRect(); return b.left >= r.left - 0.5 && b.right <= r.right + 0.5; });
      const rows = new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top))).size;
      return { inside, noScroll: el.scrollWidth <= el.clientWidth + 1, rows, minH: Math.min(...tabs.map((t) => t.getBoundingClientRect().height)), n: tabs.length };
    });
    check(`${w} ${r} 탭 ${res.n}개 모두 보임 (옆 넘김 없음)`, res.inside && res.noScroll, JSON.stringify(res));
    check(`${w} ${r} 탭 두 줄 이하 · 높이 42px 이상`, res.rows <= 2 && res.minH >= 42, JSON.stringify(res));
  }
  await go(p, "/ax");
  const dash = await p.getByRole("tablist", { name: "분석 보기" }).evaluate((el) => new Set([...el.querySelectorAll('[role="tab"]')].map((t) => Math.round(t.getBoundingClientRect().top))).size);
  check(`${w} 대시보드 분석 탭은 한 줄 그대로 (D-130)`, dash === 1);
  await ctx.close();
}
{
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/data");
  const tl = p.locator('[role="tablist"]').first();
  const rows = await tl.evaluate((el) => new Set([...el.querySelectorAll('[role="tab"]')].map((t) => Math.round(t.getBoundingClientRect().top))).size);
  const widths = await tl.locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  check("1440 데이터 관리 탭 — 한 줄 · 글자 너비 그대로", rows === 1 && widths.every((x) => x < 200), widths.map(Math.round).join(","));
  // 키보드 이동은 그대로
  await tl.locator('[role="tab"][aria-selected="true"]').focus(); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(300);
  check("탭 ← → 이동 그대로", await p.evaluate(() => document.activeElement?.getAttribute("role") === "tab" && document.activeElement?.getAttribute("aria-selected") === "true"));
  await ctx.close();
}
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/data");
  const tl = p.locator('[role="tablist"]').first();
  const tabs = tl.locator('[role="tab"]');
  const last = await tabs.count() - 1;
  await tabs.nth(last - 1).click(); await p.waitForTimeout(400);
  await tl.locator('[role="tab"][aria-selected="true"]').focus(); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(400);
  check("390 두 줄 탭 — → 로 다음 줄 탭까지 이동", await tabs.nth(last).getAttribute("aria-selected") === "true");
  await ctx.close();
}

/* ── D-135 터치 대상 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/reports");
  const set = p.getByRole("link", { name: /지정하기/ });
  if (await set.count()) check("실증 '지정하기' 높이 32px 이상", (await set.first().boundingBox()).height >= 32);
  await go(p, "/ax");
  const tip = p.locator(".infotip-btn").first();
  const bb = await tip.boundingBox();
  const hit = await p.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".infotip-btn") != null, { x: bb.x + bb.width + 2.5, y: bb.y + bb.height / 2 });
  check("ⓘ 누르는 자리는 원보다 넓음 (가장자리 밖 2.5px도 버튼)", hit);
  await ctx.close();
}

/* ── D-127 보완 — 생산 착수 일정 간단히 행 둘째 줄 ── */
for (const [w, h] of [[360, 780], [390, 844]]) {
  const ctx = await newCtx(browser, w, h); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/products?tab=production");
  const ok = await p.locator('ul[data-testid="production-schedule"] [data-testid="schedule-row"]').evaluateAll((els) => els.every((b) => { const s = b.querySelector(".tabular"); return s && s.scrollWidth <= s.clientWidth + 1 && !getComputedStyle(s).textOverflow.includes("ellipsis"); }));
  check(`${w} 생산 착수 간단히 — 둘째 줄 잘림 없음`, ok);
  const txt = await p.locator('ul[data-testid="production-schedule"] [data-testid="schedule-row"]').allInnerTexts();
  check(`${w} 진행 중 생산이 한 줄 요약에 보임`, txt.some((t) => /생산중 [\d,]+개|입고예정 [\d,]+개/.test(t)));
  await ctx.close();
}

/* ── axe 7테마 ── */
for (const theme of THEMES) {
  const ctx = await newCtx(browser, 390, 844, { theme }); const p = await ctx.newPage();
  await go(p, "/ax/products?tab=inventory");
  await p.locator('[data-testid="inventory-row"]').first().click(); await p.waitForTimeout(200);
  let v = await axe(p); check(`axe ${theme} 재고 간단히(펼침)`, v.length === 0, v.join(" | "));
  await p.locator('[data-testid="stocktake-open"]').click(); await p.waitForTimeout(300);
  const i0 = p.locator("[data-stocktake] input").first(); await i0.fill(String(num(await i0.inputValue()) + 5));
  await p.locator("[data-stocktake] input").nth(1).fill("abc"); await p.waitForTimeout(150);
  v = await axe(p); check(`axe ${theme} 한 번에 입력(차이·오류 표시)`, v.length === 0, v.join(" | "));
  await go(p, "/ax/data");
  v = await axe(p); check(`axe ${theme} 데이터 관리(두 줄 탭)`, v.length === 0, v.join(" | "));
  await ctx.close();
}

const errs = errsAll.flat();
check("페이지 오류·콘솔 오류 0", errs.length === 0, errs.slice(0, 5).join(" | "));
await browser.close();
summary("qa/pass36");
