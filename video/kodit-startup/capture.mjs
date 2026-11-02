// KODIT 영상 앱 화면 캡처 — Demo 빌드(예시 데이터) · Business AX 기본 테마(오닉스 골드) · 고객 앱 실사 제품 사진, @2x
import pw from "/opt/node-tools/node_modules/playwright/index.js";
const { chromium } = pw;
const OUT = process.argv[2]; const B = "http://localhost:3100";
const b = await chromium.launch();
const init = () => { localStorage.setItem("miryeo-ax-tutorial-v2", "1"); localStorage.setItem("miryeo-demo-role", "OWNER"); };
const MOB = { viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PC = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const settle = async (p) => { await p.locator('[aria-busy="true"][aria-label="불러오는 중"]').waitFor({ state: "detached", timeout: 10000 }).catch(() => {}); await p.waitForTimeout(900); };
async function prep(p, keepFixed) {
  await p.evaluate(async () => { for (const im of document.querySelectorAll("img")) im.loading = "eager";
    await Promise.all([...document.images].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))); });
  if (keepFixed) return;
  await p.evaluate(() => { const n = document.querySelector("[data-testid=beauty-mobile-nav]"); if (n) n.style.display = "none"; });
  await p.evaluate(() => { for (const el of document.querySelectorAll("*")) { const ps = getComputedStyle(el).position; if (ps === "sticky" || ps === "fixed") el.style.position = "static"; } });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
}
const meta = {};
async function shot(name, path, opt, full = true, keepFixed = false, before) {
  const ctx = await b.newContext(opt); await ctx.addInitScript(init);
  const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  if (before) await before(p);
  await p.goto(B + path, { waitUntil: "networkidle" }); await settle(p);
  await prep(p, keepFixed); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  meta[name] = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, theme: document.documentElement.dataset.axTheme }));
  console.log(name, JSON.stringify(meta[name]));
  await ctx.close();
}
await shot("pc_ax", "/ax", PC, true, true);
await shot("pc_data", "/ax/data?tab=products", PC, false, true);
await shot("pc_prod", "/ax/products?tab=production", PC, true, true);
await shot("pc_cust", "/ax/customers", PC, true, true);
await shot("pc_export", "/ax/channels?tab=export", PC, true, true);
await shot("pc_channels", "/ax/channels", PC, true, true);
await shot("pc_growth", "/ax/growth", PC, true, true);
if (process.argv[3] === "pc") { const fs = await import("node:fs"); const old = JSON.parse(fs.readFileSync(`${OUT}/meta.json`)); fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ ...old, ...meta }, null, 1)); await b.close(); process.exit(0); }
await shot("mob_ax", "/ax", MOB);
// 고객 앱 — 제품을 둘러본 뒤의 홈(최근 본 제품) · 상품 상세 · Passport
await shot("mob_beauty", "/beauty", MOB, true, false, async (p) => {
  for (const id of ["p-ess-01", "p-amp-30", "p-amp-50"]) { await p.goto(B + `/beauty/products/${id}`, { waitUntil: "networkidle" }); await p.waitForTimeout(400); }
});
await shot("mob_product", "/beauty/products/p-amp-50", MOB);
await shot("mob_products", "/beauty/products", MOB);
{
  const ctx = await b.newContext(MOB); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  try {
    await p.goto(B + "/beauty/finder", { waitUntil: "networkidle" }); await p.waitForTimeout(600);
    await p.getByRole("button", { name: /진정 케어/ }).click(); await p.getByRole("button", { name: /결 & 모공/ }).click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/mob_finder1.png` });
    for (const o of ["예민한 피부를 진정시키고 싶어요", "가벼운 사용감", "가볍게 3단계면 충분해요", "합리적인 가격 위주"]) {
      await p.getByRole("button", { name: "다음" }).click(); await p.waitForTimeout(450);
      await p.getByRole("button", { name: o, exact: true }).click(); await p.waitForTimeout(250);
    }
    await p.getByRole("button", { name: /결과 보기/ }).click(); await p.waitForTimeout(1500);
    await prep(p); await p.screenshot({ path: `${OUT}/mob_finder_result.png`, fullPage: true }); console.log("mob_finder_result");
    const save = p.getByRole("button", { name: /Beauty Passport에 저장/ }); if (await save.count()) { await save.click(); await p.waitForTimeout(500); }
    for (const id of ["p-amp-50", "p-ess-01"]) { await p.goto(B + `/beauty/products/${id}`, { waitUntil: "networkidle" }); await p.waitForTimeout(300); }
    await p.goto(B + "/beauty/passport", { waitUntil: "networkidle" }); await p.waitForTimeout(900); await prep(p);
    await p.screenshot({ path: `${OUT}/mob_passport.png`, fullPage: true }); console.log("mob_passport");
  } catch (e) { console.log("finder flow error", e.message.slice(0, 200)); }
  await ctx.close();
}
{
  const ctx = await b.newContext(MOB); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  for (const [n, path] of [["mob_tab_home", "/beauty"], ["mob_tab_products", "/beauty/products"], ["mob_tab_finder", "/beauty/finder"], ["mob_tab_passport", "/beauty/passport"]]) {
    await p.goto(B + path, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
    const nav = p.locator("[data-testid=beauty-mobile-nav]"); if (await nav.count()) { await nav.screenshot({ path: `${OUT}/${n}.png` }); console.log(n); }
  }
  await ctx.close();
}
{
  const ctx = await b.newContext(PC); await ctx.addInitScript(init); const p = await ctx.newPage(); await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + "/ax/growth", { waitUntil: "networkidle" }); await settle(p);
  await p.getByText("처리하기").first().click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/pc_drawer.png` }); console.log("pc_drawer");
  await ctx.close();
}
const fs = await import("node:fs"); fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta, null, 1));
await b.close();
