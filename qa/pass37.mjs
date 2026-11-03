// PASS 37 검수 — 지난 확인 이후(D-136) · 사업화 실적 자료 목차(D-137) · 고객 제품 검색 제안·결과 없음(D-138) · axe 7테마
//   AXE_PATH=…/axe-core/axe.min.js node qa/pass37.mjs
import { chromium, check, summary, newCtx, watch, go, overflowX, axe, THEMES } from "./lib.mjs";

const browser = await chromium.launch();
const errsAll = [];
const num = (t) => Number(String(t).replace(/[^\d]/g, ""));
const SEEN = async (p) => p.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith("miryeo-seen:")));
/** 저장된 기준을 '어제'처럼 고침 — Action 2건·연체 1건이 새로 생기고, 재고 위험은 모두 새로, 판매 64행 추가 */
const ageBaseline = (p, key) => p.evaluate((k) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.at = new Date(Date.now() - 20 * 3600e3).toISOString();
  s.openActions = s.openActions.slice(2); s.overdue = s.overdue.slice(1); s.risk = []; s.salesRows -= 64; s.salesAsOf = "2026-01-01";
  localStorage.setItem(k, JSON.stringify(s));
}, key);

/* ── D-136 지난 확인 이후 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax", 1500);
  check("첫 방문 — 카드 없음", await p.locator('[data-testid="since-last"]').count() === 0);
  const key = await SEEN(p);
  check("첫 방문 — 기준 저장", !!key, key);
  const openN = num((await p.getByText(/열린 Action \d+건/).first().innerText()).match(/\d+/)[0]);
  const base = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  check("기준의 열린 Action 수 = 화면의 열린 Action (RULE Action이 만들어진 뒤 상태)", base.openActions.length === openN, `${base.openActions.length} vs ${openN}`);
  await go(p, "/ax", 800);
  check("다시 열어도 바뀐 것 없으면 카드 없음", await p.locator('[data-testid="since-last"]').count() === 0);
  await ageBaseline(p, key);
  await go(p, "/ax", 1000);
  const card = p.locator('[data-testid="since-last"]');
  check("바뀐 것이 있으면 카드", await card.isVisible());
  const t = (k) => card.locator(`[data-since="${k}"]`).innerText().catch(() => "");
  check("새 Action 2건", (await t("actions")).includes("새 Action 2건"), await t("actions"));
  check("새로 연체 1건 · 금액 · 거래처", /새로 연체 1건 · [\d,.]+(만|억) 원/.test(await t("overdue")), await t("overdue"));
  const riskKpi = num((await p.locator('a[href*="status=%EC%9C%84%ED%97%98"], a[href*="status=위험"]').first().innerText()).match(/(\d+)개/)?.[1]);
  check("재고 위험 새 상품 수 = 대시보드 재고 위험 SKU", (await t("risk")).includes(`재고 위험 새 상품 ${riskKpi}개`), `${await t("risk")} / ${riskKpi}`);
  check("판매 기록 64행 추가 · 마지막 판매일", (await t("sales")).includes("판매 기록 64행 추가") && (await t("sales")).includes("01.01 →"));
  check("확인 시각 표시", (await card.locator("h2").innerText()).includes("확인"));
  const hs = await card.locator("[data-since]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check("줄마다 누르는 높이 44px 이상", hs.every((h) => h >= 44), hs.join(","));
  check("390 넘침 0", await overflowX(p) <= 0);
  await card.locator('[data-since="actions"]').click(); await p.waitForURL(/\/ax\/growth/); await p.waitForTimeout(500);
  check("새 Action 줄 → Growth Center '새 추천'", p.url().includes("status=NEW"));
  await go(p, "/ax", 900);
  check("다른 화면 다녀와도 카드 그대로 (확인 전)", await p.locator('[data-testid="since-last"]').isVisible());
  await p.locator('[data-testid="since-confirm"]').click(); await p.waitForTimeout(300);
  check("확인했어요 → 카드 사라짐", await p.locator('[data-testid="since-last"]').count() === 0);
  await go(p, "/ax", 900);
  check("확인 뒤 다시 열어도 없음", await p.locator('[data-testid="since-last"]').count() === 0);
  // 깨진 저장값 → 기준 새로 잡고 카드 없음
  await p.evaluate((k) => localStorage.setItem(k, "{broken"), key); await go(p, "/ax", 1200);
  check("깨진 저장값 → 카드 없음 · 기준 새로 저장", await p.locator('[data-testid="since-last"]').count() === 0 && await p.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)).v === 1; } catch { return false; } }, key));
  await ctx.close();
}
// 직원(STAFF) — 받을 돈 줄은 안 보임
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await ctx.addInitScript(() => { try { localStorage.setItem("miryeo-demo-role", "STAFF"); } catch { /* noop */ } });
  await go(p, "/ax", 1500);
  const key = await SEEN(p); await ageBaseline(p, key); await go(p, "/ax", 1000);
  const card = p.locator('[data-testid="since-last"]');
  check("직원 — 카드 보임", await card.isVisible());
  check("직원 — 연체·입금 줄 없음 (재무 권한)", await card.locator('[data-since="overdue"], [data-since="paid"]').count() === 0);
  check("직원 — Action·재고 줄은 보임", await card.locator('[data-since="actions"]').count() === 1 && await card.locator('[data-since="risk"]').count() === 1);
  await ctx.close();
}

/* ── D-137 사업화 실적 자료 목차 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/business");
  const toc = p.locator('[data-testid="business-toc"]');
  check("목차 보임 · 6개", await toc.isVisible() && await toc.locator("[data-toc]").count() === 6);
  check("인쇄에서 숨김 (data-print=hide)", await toc.getAttribute("data-print") === "hide");
  check("처음엔 1 표시", await toc.locator('[data-toc="1"]').getAttribute("aria-current") === "true");
  await p.evaluate(() => window.scrollTo(0, 1600)); await p.waitForTimeout(500);
  const bb = await toc.boundingBox();
  check("내려도 목차가 위에 붙음 (헤더 아래)", bb && bb.y >= 60 && bb.y <= 70, JSON.stringify(bb));
  for (const n of [5, 3, 6]) {
    await toc.locator(`[data-toc="${n}"]`).click(); await p.waitForTimeout(900);
    const h = await p.locator(`#biz-${n} h3`).boundingBox();
    // 마지막 절(6)은 짧아서 맨 위까지 못 올라옴 → 화면 안에 보이면 됨
    check(`${n}번 누르면 그 절 제목이 ${n === 6 ? "화면 안에" : "목차 바로 아래"}`, h && h.y >= 100 && h.y <= (n === 6 ? 800 : 220), JSON.stringify(h));
    check(`${n}번 표시 (aria-current)`, await toc.locator(`[data-toc="${n}"]`).getAttribute("aria-current") === "true");
    check(`${n}번 칩이 목차 줄 안에 보임`, await toc.locator(`[data-toc="${n}"]`).evaluate((el) => { const r = el.getBoundingClientRect(), b = el.parentElement.getBoundingClientRect(); return r.left >= b.left - 1 && r.right <= b.right + 1; }));
  }
  check("눌러서 간 절 제목에 초점", await p.evaluate(() => document.activeElement?.closest("[data-biz-section]")?.getAttribute("data-biz-section")) === "6");
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, document.getElementById("biz-4").getBoundingClientRect().top + window.scrollY - 130)); await p.waitForTimeout(500);
  check("손으로 내려도 지금 절 표시 (4 — 위가 목차 아래를 지남)", await toc.locator('[data-toc="4"]').getAttribute("aria-current") === "true");
  await p.evaluate(() => window.scrollBy(0, -60)); await p.waitForTimeout(400);
  check("조금 올리면 앞 절 (3)", await toc.locator('[data-toc="3"]').getAttribute("aria-current") === "true");
  check("390 넘침 0", await overflowX(p) <= 0);
  await ctx.close();
  const c2 = await newCtx(browser, 1440, 900); const p2 = await c2.newPage(); errsAll.push(watch(p2));
  await go(p2, "/ax/business");
  check("1440 — 목차 숨김 (넓은 화면)", !(await p2.locator('[data-testid="business-toc"]').isVisible()));
  await c2.close();
}

/* ── D-138 고객 제품 검색 제안 · 결과 없음 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/beauty/products");
  const total = num((await p.getByText(/^총 \d+개/).innerText()).match(/\d+/)[0]);
  const s = p.getByLabel("제품 검색");
  await s.click(); await p.waitForTimeout(200);
  const panel = p.locator('[data-testid="search-suggest"]');
  check("빈 검색칸 누르면 제안 열림 (이름 '검색 제안')", await panel.isVisible() && await panel.getAttribute("aria-label") === "검색 제안");
  check("처음엔 최근 검색어 없음 · 자주 찾는 고민 6개", await p.locator('[data-testid="recent-searches"]').count() === 0 && await p.locator('[data-testid="suggest-concerns"] button').count() === 6);
  await s.fill("앰플"); check("글자 넣으면 제안 닫힘", !(await panel.isVisible()));
  await s.press("Enter"); await p.waitForTimeout(200);
  await s.fill(""); await s.click(); await p.waitForTimeout(150);
  check("Enter한 검색어가 최근 검색어에", (await p.locator('[data-testid="recent-searches"]').innerText()).includes("앰플"));
  await p.locator('[data-recent="앰플"]').click(); await p.waitForTimeout(300);
  const cntA = num((await p.getByText(/^총 \d+개/).innerText()).match(/\d+/)[0]);
  check("최근 검색어 누르면 검색 · 주소에 기록", await s.inputValue() === "앰플" && cntA < total && decodeURIComponent(p.url()).includes("q=앰플"), `${cntA}/${total}`);
  // 7개 넣으면 6개만, 최근 것이 앞
  for (const w of ["토너", "크림", "선케어", "마스크", "미스트", "클렌저"]) { await s.fill(w); await s.press("Enter"); }
  await s.fill(""); await s.click(); await p.waitForTimeout(150);
  const rec = await p.locator("[data-recent]").evaluateAll((els) => els.map((e) => e.getAttribute("data-recent")));
  check("최근 검색어 최대 6개 · 최근 것이 앞", rec.length === 6 && rec[0] === "클렌저" && !rec.includes("앰플"), rec.join(","));
  await p.getByRole("button", { name: "최근 검색어 '토너' 지우기" }).click(); await p.waitForTimeout(150);
  check("하나 지우기", !(await p.locator("[data-recent]").evaluateAll((els) => els.map((e) => e.getAttribute("data-recent")))).includes("토너"));
  check("검색칸 초점 유지 (지우기 눌러도)", await p.evaluate(() => document.activeElement?.getAttribute("aria-label")) === "제품 검색");
  await p.locator('[data-testid="recent-clear"]').click(); await p.waitForTimeout(150);
  check("모두 지우기", await p.locator('[data-testid="recent-searches"]').count() === 0);
  await go(p, "/beauty/products"); await s.click(); await p.waitForTimeout(150);
  check("새로고침 뒤에도 지운 상태", await p.locator('[data-testid="recent-searches"]').count() === 0);
  // 키보드: Tab으로 제안 안 → Esc → 검색칸 · ↓로 다시 열기 · Enter로 고민 고르기
  const inSuggest = () => p.evaluate(() => !!document.activeElement?.closest('[data-testid="search-suggest"]'));
  const onSearch = () => p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "제품 검색");
  await p.keyboard.press("Tab"); await p.waitForTimeout(120);
  check("키보드 Tab → 제안 칩으로 (제안 그대로)", await panel.isVisible() && await inSuggest());
  await p.keyboard.press("Escape"); await p.waitForTimeout(120);
  check("제안 안에서 Esc → 닫힘 · 초점은 검색칸", !(await panel.isVisible()) && await onSearch());
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(120);
  check("↓ → 제안 다시 열림", await panel.isVisible());
  await p.keyboard.press("Tab"); await p.keyboard.press("Enter"); await p.waitForTimeout(250);
  check("키보드로 고민 고르기 → 필터 · 닫힘 · 초점 검색칸", !(await panel.isVisible()) && await onSearch() && await p.locator('[aria-label="피부 고민 필터"] button', { hasText: "수분 부족" }).getAttribute("aria-pressed") === "true");
  await p.keyboard.press("Tab"); await p.waitForTimeout(120);
  check("제안 닫힌 채 Tab → 검색 줄 밖으로", !(await inSuggest()) && !(await onSearch()));
  await s.click(); await p.waitForTimeout(150);
  // 고민 칩 → 필터 적용 · 제안 닫힘
  await p.locator('[data-testid="suggest-concerns"] button', { hasText: "진정 케어" }).click(); await p.waitForTimeout(300);
  check("제안의 고민 → 필터 적용 · 닫힘", !(await panel.isVisible()) && await p.locator('[aria-label="피부 고민 필터"] button', { hasText: "진정 케어" }).getAttribute("aria-pressed") === "true");
  await s.click(); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
  check("Esc → 제안 닫힘", !(await panel.isVisible()));
  // 결과 없음
  await s.fill("레티놀"); await s.press("Enter"); await p.waitForTimeout(300);
  const empty = p.locator('[data-testid="products-empty"]');
  check("결과 없음 — 검색어 표시", (await empty.innerText()).includes("'레티놀'에 맞는 제품이 없습니다") || (await empty.innerText()).includes("‘레티놀’에 맞는 제품이 없습니다"));
  check("결과 없음 — 검색어 지우기·필터 해제·1분 상담", await p.locator('[data-testid="empty-clear-q"]').isVisible() && await p.locator('[data-testid="empty-clear-filters"]').isVisible() && await empty.getByRole("link", { name: /1분 상담/ }).count() === 1);
  await p.locator('[data-testid="empty-clear-q"]').click(); await p.waitForTimeout(200);
  check("검색어 지우기 → 고민 필터만 남은 결과", await s.inputValue() === "" && await p.locator('[data-testid="products-empty"]').count() === 0);
  await s.fill("레티놀"); await p.waitForTimeout(150); await p.locator('[data-testid="empty-clear-filters"]').click(); await p.waitForTimeout(200);
  check("필터 해제 → 검색어는 그대로", await s.inputValue() === "레티놀" && await p.locator('[aria-label="피부 고민 필터"] button', { hasText: "전체 고민" }).getAttribute("aria-pressed") === "true");
  check("390 넘침 0", await overflowX(p) <= 0);
  await ctx.close();
}

/* ── axe ── */
for (const theme of THEMES) {
  const ctx = await newCtx(browser, 390, 844, { theme }); const p = await ctx.newPage();
  await go(p, "/ax", 1500);
  const key = await SEEN(p); await ageBaseline(p, key); await go(p, "/ax", 1000);
  let v = await axe(p); check(`axe ${theme} 대시보드 '지난 확인 이후'`, v.length === 0, v.join(" | "));
  await go(p, "/ax/business"); await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(400);
  v = await axe(p); check(`axe ${theme} 사업화 자료 목차`, v.length === 0, v.join(" | "));
  await ctx.close();
}
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage();
  await go(p, "/beauty/products"); const s = p.getByLabel("제품 검색");
  await s.fill("앰플"); await s.press("Enter"); await s.fill(""); await s.click(); await p.waitForTimeout(200);
  let v = await axe(p); check("axe 고객 검색 제안", v.length === 0, v.join(" | "));
  await s.fill("레티놀"); await s.press("Enter"); await p.waitForTimeout(200);
  v = await axe(p); check("axe 고객 결과 없음", v.length === 0, v.join(" | "));
  await ctx.close();
}

const errs = errsAll.flat();
check("페이지 오류·콘솔 오류 0", errs.length === 0, errs.slice(0, 5).join(" | "));
await browser.close();
summary("qa/pass37");
