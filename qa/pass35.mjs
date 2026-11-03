// PASS 35 검수 — 생산 착수 일정 간단히 보기(D-127) · 협의 요청 글(D-128) · 서랍 입력 초점·저장 안 한 변경(D-129) ·
//   대시보드 분석 탭·제목 줄바꿈(D-130) · 고객 제품 목록 조건 기억·검색 줄(D-131) · axe 7테마
//   node qa/pass35.mjs   (AXE_PATH=…/axe-core/axe.min.js)
import { chromium, check, summary, newCtx, watch, go, overflowX, axe, THEMES } from "./lib.mjs";

const browser = await chromium.launch();
const errsAll = [];

/* ── D-129 서랍: 한 글자씩 쳐도 초점·글자 유지 + 저장 안 한 변경 확인 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  for (const [tab, field, add] of [["channels", "#c-name", "몰"], ["b2b", "#b-note", "12"], ["products", "#p-name", "가나"]]) {
    await go(p, `/ax/data?tab=${tab}`);
    await p.locator("[data-master-item]").first().click(); await p.waitForTimeout(400);
    const before = await p.locator(field).inputValue();
    await p.locator(field).click(); await p.keyboard.press("End");
    await p.keyboard.type(add, { delay: 110 }); await p.waitForTimeout(250);
    const after = await p.locator(field).inputValue();
    const active = await p.evaluate(() => document.activeElement?.id);
    check(`${tab} 서랍 한 글자씩 입력 — 글자 모두 남음`, after === before + add, `${before} → ${after}`);
    check(`${tab} 서랍 입력 중 초점 유지`, active === field.slice(1), `active=${active}`);
    // Esc → 바로 닫히지 않고 확인 줄
    await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    check(`${tab} 변경 후 Esc → 서랍 그대로`, await p.locator('[data-overlay="drawer"]').count() === 1);
    check(`${tab} 확인 줄 표시`, await p.locator('[data-testid="drawer-dirty"]').isVisible());
    check(`${tab} 초점은 '계속 편집'`, await p.evaluate(() => document.activeElement?.getAttribute("data-testid")) === "drawer-stay");
    // Esc 한 번 더 → 계속 편집 (확인 줄만 닫힘)
    await p.keyboard.press("Escape"); await p.waitForTimeout(200);
    check(`${tab} 확인 중 Esc → 계속 편집`, await p.locator('[data-testid="drawer-dirty"]').count() === 0 && await p.locator('[data-overlay="drawer"]').count() === 1);
    check(`${tab} 계속 편집 — 입력 그대로`, await p.locator(field).inputValue() === after);
    // X 버튼 → 확인 줄 → 계속 편집 버튼
    await p.locator('[data-overlay="drawer"] button[aria-label="닫기"]').last().click(); await p.waitForTimeout(200);
    check(`${tab} X → 확인 줄`, await p.locator('[data-testid="drawer-dirty"]').isVisible());
    // 버리고 닫기 (390은 서랍이 화면 전체라 바깥 누름은 아래 768에서 확인)
    await p.locator('[data-testid="drawer-discard"]').click(); await p.waitForTimeout(300);
    check(`${tab} 버리고 닫기 → 서랍 닫힘`, await p.locator('[data-overlay="drawer"]').count() === 0);
    await p.locator("[data-master-item]").first().click(); await p.waitForTimeout(400);
    check(`${tab} 다시 열면 원래 값 (저장 안 됨)`, await p.locator(field).inputValue() === before);
    // 바꾸지 않았으면 Esc로 바로 닫힘
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    check(`${tab} 변경 없으면 Esc로 바로 닫힘`, await p.locator('[data-overlay="drawer"]').count() === 0);
  }
  // 바꾼 뒤 '취소'는 묻지 않고 닫음 · 저장은 그대로 저장
  await go(p, "/ax/data?tab=channels");
  await p.locator("[data-master-item]").first().click(); await p.waitForTimeout(300);
  await p.locator("#c-name").fill("취소 시험"); await p.getByRole("button", { name: "취소" }).last().click(); await p.waitForTimeout(300);
  check("변경 후 '취소' 버튼은 바로 닫힘", await p.locator('[data-overlay="drawer"]').count() === 0);
  await p.locator("[data-master-item]").first().click(); await p.waitForTimeout(300);
  await p.locator("#c-name").fill("Demo 저장 시험 채널"); await p.locator('[data-overlay="drawer"] button.btn-primary', { hasText: "저장" }).click(); await p.waitForTimeout(600);
  check("저장하면 확인 없이 닫히고 목록에 반영", await p.locator('[data-overlay="drawer"]').count() === 0 && await p.locator("[data-master-item]", { hasText: "Demo 저장 시험 채널" }).count() === 1);
  // 새 상품 서랍: 아무것도 안 쓰면 바로 닫힘
  await go(p, "/ax/data?tab=products");
  await p.locator('[data-testid="master-new"]').click(); await p.waitForTimeout(300); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  check("새 상품 서랍 — 비어 있으면 바로 닫힘", await p.locator('[data-overlay="drawer"]').count() === 0);
  await ctx.close();
  // 768: 서랍 바깥(배경) 누름 → 확인 줄 / 변경 없으면 바로 닫힘
  const c3 = await newCtx(browser, 768, 1024); const p3 = await c3.newPage(); errsAll.push(watch(p3));
  await go(p3, "/ax/data?tab=b2b");
  await p3.locator("[data-master-item]").first().click(); await p3.waitForTimeout(300);
  await p3.mouse.click(40, 500); await p3.waitForTimeout(300);
  check("768 변경 없으면 바깥 누름으로 바로 닫힘", await p3.locator('[data-overlay="drawer"]').count() === 0);
  await p3.locator("[data-master-item]").first().click(); await p3.waitForTimeout(300);
  await p3.locator("#b-note").fill("바깥 누름 시험");
  await p3.mouse.click(40, 500); await p3.waitForTimeout(300);
  check("768 변경 후 바깥 누름 → 확인 줄", await p3.locator('[data-testid="drawer-dirty"]').isVisible() && await p3.locator('[data-overlay="drawer"]').count() === 1);
  await p3.locator('[data-testid="drawer-discard"]').click(); await p3.waitForTimeout(300);
  check("768 버리고 닫기", await p3.locator('[data-overlay="drawer"]').count() === 0);
  await c3.close();
  // 1440 두 칸 화면에는 서랍 없음 (그대로)
  const c2 = await newCtx(browser, 1440, 900); const p2 = await c2.newPage(); errsAll.push(watch(p2));
  await go(p2, "/ax/data?tab=channels");
  check("1440 채널 — 두 칸(서랍 아님)", await p2.locator('[data-edit-mode="side"]').count() === 1);
  await p2.locator("[data-master-item]").first().click(); await p2.locator("#c-disc").click(); await p2.keyboard.press("End"); await p2.keyboard.press("Backspace"); await p2.keyboard.type("9", { delay: 80 });
  check("1440 채널 입력 초점 유지", await p2.evaluate(() => document.activeElement?.id) === "c-disc");
  await c2.close();
}

/* ── D-127 생산 착수 일정 — 모바일 간단히 보기 ── */
{
  const ctx = await newCtx(browser, 390, 844, { clipboard: true }); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax/products?tab=production");
  const list = p.locator('ul[data-testid="production-schedule"]');
  check("모바일 기본은 간단히", await list.getAttribute("data-view") === "compact");
  const rows = list.locator(":scope > li");
  const n = await rows.count();
  const allChip = Number((await p.locator('[data-due="all"]').innerText()).replace(/\D/g, ""));
  check("행 수 = '전체' 칩 수", n === allChip && n > 0, `${n} vs ${allChip}`);
  const hs = await rows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check("간단히 — 행 높이 90px 이하", hs.every((h) => h <= 90), hs.map(Math.round).join(","));
  check("간단히 — 펼친 칸 없음", await list.locator('[data-testid="schedule-detail"]').count() === 0);
  const firstName = (await rows.first().locator('[data-testid="schedule-row"] span.font-semibold').innerText()).trim();
  const listH = await list.evaluate((e) => e.getBoundingClientRect().height);
  // 행 누르면 그 행만 펼침
  await rows.nth(0).locator('[data-testid="schedule-row"]').click(); await p.waitForTimeout(200);
  check("누르면 펼침 (aria-expanded)", await rows.nth(0).locator('[data-testid="schedule-row"]').getAttribute("aria-expanded") === "true");
  const det = rows.nth(0).locator('[data-testid="schedule-detail"]');
  check("펼친 칸 — 두 기간 막대·추천 생산량·조건 바꿔 보기", await det.locator("[data-coverbar]").count() === 1 && (await det.innerText()).includes("추천 생산량") && await det.locator("[data-scenario-open]").count() === 1);
  check("펼친 칸 id = aria-controls", await det.getAttribute("id") === await rows.nth(0).locator('[data-testid="schedule-row"]').getAttribute("aria-controls"));
  await rows.nth(1).locator('[data-testid="schedule-row"]').click(); await p.waitForTimeout(200);
  check("다른 행 누르면 먼저 행은 접힘 (하나만)", await list.locator('[data-testid="schedule-detail"]').count() === 1 && await rows.nth(1).locator('[data-testid="schedule-detail"]').count() === 1);
  await rows.nth(1).locator('[data-testid="schedule-row"]').click(); await p.waitForTimeout(200);
  check("다시 누르면 접힘", await list.locator('[data-testid="schedule-detail"]').count() === 0);
  // 조건 바꿔 보기는 펼친 칸에서 그대로 열림
  await rows.nth(0).locator('[data-testid="schedule-row"]').click(); await p.waitForTimeout(150);
  await rows.nth(0).locator("[data-scenario-open]").click(); await p.waitForTimeout(300);
  check("펼친 칸에서 '조건 바꿔 보기' 열림", await p.locator('[data-testid="scenario-modal"]').count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  // 자세히 → 모두 펼침 · 새로고침해도 유지
  await p.locator('[data-testid="schedule-view"] [data-view="full"]').click(); await p.waitForTimeout(200);
  check("자세히 — 모두 펼침", await list.locator('[data-testid="schedule-detail"]').count() === n && await list.getAttribute("data-view") === "full");
  const fullH = await list.evaluate((e) => e.getBoundingClientRect().height);
  check("간단히 목록이 자세히의 1/3 이하 높이", listH * 3 <= fullH, `${Math.round(listH)} vs ${Math.round(fullH)}`);
  await go(p, "/ax/products?tab=production");
  check("보기 방식 기억 (새로고침)", await p.locator('ul[data-testid="production-schedule"]').getAttribute("data-view") === "full");
  await p.locator('[data-testid="schedule-view"] [data-view="compact"]').click(); await p.waitForTimeout(150);
  check("간단히로 되돌림", await p.locator('ul[data-testid="production-schedule"]').getAttribute("data-view") === "compact");
  // 마감 칩 필터는 그대로
  const passed = Number((await p.locator('[data-due="passed"]').innerText()).replace(/\D/g, "")) || 0;
  await p.locator('[data-due="passed"]').click(); await p.waitForTimeout(200);
  check("마감 지남 칩 — 행 수 = 칩 수", await p.locator('ul[data-testid="production-schedule"] > li').count() === passed);
  await p.locator('[data-due="all"]').click(); await p.waitForTimeout(200);
  check("첫 행은 마감이 가장 가까운 상품", (await p.locator('ul[data-testid="production-schedule"] > li').first().innerText()).includes(firstName));
  check("390 넘침 0", await overflowX(p) <= 0);

  /* ── D-128 협의 요청 글 ── */
  const btns = p.locator('[data-testid="request-copy"]');
  const nb = await btns.count();
  const urgentText = await p.locator('[data-testid="schedule-urgent"]').innerText();
  const urgentN = Number(urgentText.match(/상품 (\d+)개/)?.[1] ?? 0);
  check("요청 글 버튼 있음 (14일 안 착수 상품이 있을 때)", urgentN > 0 && nb >= 1, `urgent ${urgentN}, buttons ${nb}`);
  const counts = await btns.evaluateAll((els) => els.map((e) => Number(e.getAttribute("aria-label").match(/\((\d+)개 상품\)/)?.[1] ?? 0)));
  check("업체별 상품 수 합 = 14일 안 착수 상품 수", counts.reduce((a, b) => a + b, 0) === urgentN, `${counts} vs ${urgentN}`);
  const partner = await btns.first().getAttribute("data-partner");
  await btns.first().click(); await p.waitForTimeout(300);
  const text = await p.evaluate(() => navigator.clipboard.readText());
  const lines = text.split("\n");
  check("복사 글 첫 줄 Demo 표시", lines[0].startsWith("※ 시연용"));
  check("복사 글 회사명·오늘 날짜", /^\[.+\] 생산 일정 협의 요청 · \d{4}\.\d{2}\.\d{2}$/.test(lines[1]), lines[1]);
  check("받는 업체 = 버튼 업체", lines[2].startsWith(partner === "OEM 업체 미지정" ? "OEM 담당자님" : `${partner} 담당자님`), lines[2]);
  check("발주서 아님 안내", text.includes("발주 확정이 아닙니다"));
  // 수량 = 화면의 추천 생산량
  const item = lines.find((l) => l.startsWith("· "));
  const sku = item?.match(/\(([^)]+)\) —/)?.[1];
  const qty = item?.match(/희망 수량 약 ([\d,]+)개/)?.[1];
  const row = p.locator(`ul[data-testid="production-schedule"] > li[data-schedule="${sku}"]`);
  check("글의 수량 = 그 상품 행의 추천 생산량", (await row.innerText()).includes(`추천 ${qty}개`), `${sku} ${qty}`);
  check("버튼 '복사됨' → 2.5초 뒤 복귀", (await btns.first().innerText()).includes("복사됨"));
  await p.waitForTimeout(2700);
  check("버튼 복귀", !(await btns.first().innerText()).includes("복사됨"));
  // a11y — 7테마 × (간단히 펼친 상태)
  await rows.nth(0).locator('[data-testid="schedule-row"]').click(); await p.waitForTimeout(150);
  await ctx.close();
  // 1440 — 표 그대로, 보기 전환 없음
  const c2 = await newCtx(browser, 1440, 900); const p2 = await c2.newPage(); errsAll.push(watch(p2));
  await go(p2, "/ax/products?tab=production");
  check("1440 — 표 그대로", await p2.locator('table[data-testid="production-schedule"]').count() === 1);
  check("1440 — 보기 전환 없음", await p2.locator('[data-testid="schedule-view"]').count() === 0);
  check("1440 — 요청 글 버튼", await p2.locator('[data-testid="request-copy"]').count() >= 1);
  await c2.close();
}

/* ── D-130 대시보드 분석 탭 · 제목 줄바꿈 ── */
for (const [w, h] of [[360, 780], [390, 844]]) {
  const ctx = await newCtx(browser, w, h); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax");
  const tl = p.getByRole("tablist", { name: "분석 보기" });
  const fit = await tl.evaluate((el) => { const r = el.getBoundingClientRect(); return [...el.querySelectorAll('[role="tab"]')].every((t) => { const b = t.getBoundingClientRect(); return b.left >= r.left - 0.5 && b.right <= r.right + 0.5; }) && el.scrollWidth <= el.clientWidth + 1; });
  check(`${w} 분석 탭 4개 모두 보임 (넘김 없음)`, fit);
  check(`${w} 분석 탭 개수 4`, await tl.locator('[role="tab"]').count() === 4);
  await ctx.close();
}
{
  const ctx = await newCtx(browser, 1440, 900); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/ax");
  const widths = await p.getByRole("tablist", { name: "분석 보기" }).locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  check("1440 분석 탭은 글자 너비 그대로 (늘리지 않음)", widths.every((x) => x < 160), widths.map(Math.round).join(","));
  check("제목 text-wrap: balance", await p.evaluate(() => getComputedStyle(document.querySelector("h2")).textWrap === "balance" || getComputedStyle(document.querySelector("h2")).textWrapStyle === "balance"));
  await ctx.close();
}

/* ── D-131 고객 제품 목록 — 조건 기억 · 검색 줄 · 필터 버튼 ── */
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/beauty/products");
  const total = Number((await p.getByText(/^총 \d+개/).innerText()).replace(/\D/g, ""));
  await p.getByRole("button", { name: /수분 부족/ }).first().click(); await p.waitForTimeout(250);
  const cnt1 = Number((await p.getByText(/^총 \d+개/).innerText()).match(/\d+/)[0]);
  check("고민 고르면 주소에 기록", decodeURIComponent(p.url()).includes("concern=수분"), p.url());
  await p.locator("select").first().selectOption("낮은 가격순"); await p.waitForTimeout(250);
  check("정렬 주소에 기록", p.url().includes("sort=price_asc"));
  // 제품 열고 뒤로
  await p.locator('a[href^="/beauty/products/"]').first().click(); await p.waitForURL(/\/beauty\/products\/[^?]+$/); await p.waitForTimeout(600);
  await p.goBack(); await p.waitForTimeout(1000);
  check("뒤로 오면 고민 그대로 (눌림)", await p.getByRole("button", { name: /수분 부족/ }).first().getAttribute("aria-pressed") === "true");
  check("뒤로 오면 개수 그대로", Number((await p.getByText(/^총 \d+개/).innerText()).match(/\d+/)[0]) === cnt1);
  check("뒤로 오면 정렬 그대로", await p.locator("select").first().inputValue() === "낮은 가격순");
  // 가격 오름차순 확인
  const prices = await p.locator("a[href^='/beauty/products/']").evaluateAll((els) => els.map((e) => Number((e.innerText.match(/([\d,]+)\s*원/)?.[1] ?? "0").replace(/,/g, ""))).filter((x) => x > 0));
  check("낮은 가격순 정렬", prices.every((x, i) => i === 0 || prices[i - 1] <= x), prices.join(","));
  // 검색어도 주소에
  await p.getByLabel("제품 검색").fill("앰플"); await p.waitForTimeout(250);
  check("검색어 주소에 기록", decodeURIComponent(p.url()).includes("q=앰플"));
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(600);
  check("새로고침해도 검색어·고민 유지", await p.getByLabel("제품 검색").inputValue() === "앰플" && await p.getByRole("button", { name: /수분 부족/ }).first().getAttribute("aria-pressed") === "true");
  await p.getByRole("button", { name: /필터 해제/ }).click(); await p.waitForTimeout(250);
  check("필터 해제 → 주소 깨끗 · 전체 개수", new URL(p.url()).search === "" || new URL(p.url()).search === "?sort=price_asc", p.url());
  check("필터 해제 → 개수 = 전체", Number((await p.getByText(/^총 \d+개/).innerText()).match(/\d+/)[0]) === total);
  // 검색 줄만 위에 붙음 · 필터 줄이 지나가면 '필터' 버튼
  await go(p, "/beauty/products?concern=수분&category=에센스/앰플");
  check("주소로 열면 조건 적용 (고민·종류 눌림)", await p.getByRole("button", { name: /수분 부족/ }).first().getAttribute("aria-pressed") === "true" && await p.getByRole("button", { name: "에센스/앰플" }).getAttribute("aria-pressed") === "true");
  check("처음엔 필터 버튼 없음 (필터 줄이 보임)", await p.locator('[data-testid="filter-jump"]').count() === 0);
  await go(p, "/beauty/products");
  await p.getByRole("button", { name: /수분 부족/ }).first().click(); await p.getByRole("button", { name: "BEST만" }).click(); await p.waitForTimeout(200);
  await p.getByRole("button", { name: /필터 해제/ }).click(); await p.getByRole("button", { name: /진정 케어/ }).first().click(); await p.waitForTimeout(200);
  await p.evaluate(() => window.scrollTo(0, 260)); await p.waitForTimeout(500);
  const bar = await p.locator('[data-testid="product-search-bar"]').boundingBox();
  check("내려 보면 검색 줄 위에 붙음", bar && bar.y >= 50 && bar.y <= 80, JSON.stringify(bar));
  check("검색 줄 높이 80px 이하 (예전 필터 포함 약 170px)", bar && bar.height <= 80, `${bar?.height}`);
  check("필터 줄이 지나가면 '필터' 버튼", await p.locator('[data-testid="filter-jump"]').isVisible());
  check("필터 버튼에 적용 개수", (await p.locator('[data-testid="filter-jump"]').getAttribute("aria-label")).includes("1개 적용"));
  await p.locator('[data-testid="filter-jump"]').click(); await p.waitForTimeout(900);
  const rails = await p.locator('[data-testid="product-filters"]').boundingBox();
  check("필터 버튼 → 필터 줄이 화면에", rails && rails.y >= 100 && rails.y < 420, JSON.stringify(rails));
  check("필터 버튼 → 눌린 칩에 초점", await p.evaluate(() => document.activeElement?.getAttribute("aria-pressed")) === "true");
  check("390 넘침 0", await overflowX(p) <= 0);
  await ctx.close();
}

/* ── a11y — axe: AX 바뀐 화면 × 7테마, 고객 화면 ── */
for (const theme of THEMES) {
  const ctx = await newCtx(browser, 390, 844, { theme }); const p = await ctx.newPage();
  await go(p, "/ax/products?tab=production");
  await p.locator('ul[data-testid="production-schedule"] [data-testid="schedule-row"]').first().click(); await p.waitForTimeout(200);
  let v = await axe(p); check(`axe ${theme} 생산 착수 일정(간단히·펼침)`, v.length === 0, v.join(" | "));
  await go(p, "/ax/data?tab=channels");
  await p.locator("[data-master-item]").first().click(); await p.waitForTimeout(300);
  await p.locator("#c-name").fill("axe 시험"); await p.keyboard.press("Escape"); await p.waitForTimeout(250);
  v = await axe(p); check(`axe ${theme} 서랍 확인 줄`, v.length === 0, v.join(" | "));
  await go(p, "/ax");
  v = await axe(p); check(`axe ${theme} 대시보드`, v.length === 0, v.join(" | "));
  await ctx.close();
}
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage();
  await go(p, "/beauty/products?concern=수분"); await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(500);
  const v = await axe(p); check("axe 고객 제품 목록(필터 버튼)", v.length === 0, v.join(" | "));
  await ctx.close();
}

const errs = errsAll.flat();
check("페이지 오류·콘솔 오류 0", errs.length === 0, errs.slice(0, 5).join(" | "));
await browser.close();
summary("qa/pass35");
