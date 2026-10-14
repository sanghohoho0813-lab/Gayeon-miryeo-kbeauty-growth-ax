// V3 캡처 — 오닉스 골드(기본 테마) Business AX + 실사 제품 사진 고객 앱 (Demo 빌드 · 예시 데이터)
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
const OUT = process.argv[2]; const B = "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const init = () => { localStorage.setItem("miryeo-ax-tutorial-v2", "1"); localStorage.setItem("miryeo-demo-role", "OWNER"); };
const MOB = { viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PC = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
async function prep(p) {
  // 지연 로딩 사진을 모두 불러오고, 고정 요소는 긴 캡처에서 한 번만 보이게
  await p.evaluate(async () => { for (const im of document.querySelectorAll("img")) im.loading = "eager";
    await Promise.all([...document.images].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))); });
  // 고객 앱 하단 탭은 긴 캡처에서 빼고 따로 찍어 영상의 휴대폰 화면 아래에 겹친다
  await p.evaluate(() => { const n = document.querySelector("[data-testid=beauty-mobile-nav]"); if (n) n.style.display = "none"; });
  await p.evaluate(() => { for (const el of document.querySelectorAll("*")) { const ps = getComputedStyle(el).position; if (ps === "sticky" || ps === "fixed") el.style.position = "static"; } });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
}
async function shot(name, path, opt, full = true, keepFixed = false) {
  const ctx = await b.newContext(opt); await ctx.addInitScript(init);
  const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + path, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  if (!keepFixed) await prep(p); else await p.evaluate(async () => { for (const im of document.querySelectorAll("img")) im.loading = "eager"; });
  await p.waitForTimeout(500);
  const theme = await p.evaluate(() => document.documentElement.dataset.axTheme);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log(name, theme, await p.evaluate(() => document.documentElement.scrollHeight));
  await ctx.close();
}
await shot("pc_ax", "/ax", PC, false, true);
await shot("mob_ax", "/ax", MOB);
await shot("mob_axprod", "/ax/products", MOB);
await shot("pc_axprod", "/ax/products", PC, false, true);
await shot("mob_beauty", "/beauty", MOB);
// 고객 Finder 흐름
{
  const ctx = await b.newContext(MOB); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + "/beauty/finder", { waitUntil: "networkidle" }); await p.waitForTimeout(600);
  await p.getByRole("button", { name: /진정 케어/ }).click(); await p.getByRole("button", { name: /결 & 모공/ }).click(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/mob_finder1.png` });
  for (const o of ["예민한 피부를 진정시키고 싶어요", "가벼운 사용감", "가볍게 3단계면 충분해요", "합리적인 가격 위주"]) {
    await p.getByRole("button", { name: "다음" }).click(); await p.waitForTimeout(450);
    await p.getByRole("button", { name: o, exact: true }).click(); await p.waitForTimeout(250);
  }
  await p.getByRole("button", { name: /결과 보기/ }).click(); await p.waitForTimeout(1200);
  await prep(p); await p.screenshot({ path: `${OUT}/mob_finder_result.png`, fullPage: true });
  const save = p.getByRole("button", { name: /Beauty Passport에 저장/ }); if (await save.count()) { await save.click(); await p.waitForTimeout(500); }
  for (const [n, path] of [["mob_passport", "/beauty/passport"], ["mob_product", "/beauty/products/p-amp-50"]]) {
    await p.goto(B + path, { waitUntil: "networkidle" }); await p.waitForTimeout(800); await prep(p);
    await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); console.log(n);
  }
  await ctx.close();
}
// 고객 앱 하단 탭 (화면별 현재 표시)
{
  const ctx = await b.newContext(MOB); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  for (const [n, path] of [["mob_tab_finder", "/beauty/finder"], ["mob_tab_passport", "/beauty/passport"], ["mob_tab_home", "/beauty"]]) {
    await p.goto(B + path, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
    await p.locator("[data-testid=beauty-mobile-nav]").screenshot({ path: `${OUT}/${n}.png` }); console.log(n);
  }
  await ctx.close();
}
// Action 처리 창
{
  const ctx = await b.newContext(PC); await ctx.addInitScript(init); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + "/ax/growth", { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  await p.getByText("처리하기").first().click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/pc_drawer.png` }); console.log("pc_drawer");
  await ctx.close();
}
await b.close();
