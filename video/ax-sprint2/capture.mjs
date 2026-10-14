// 앱 화면 캡처 (Demo 빌드 · 예시 데이터) — PC 1440@2x / 모바일 412×892@2x
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
const OUT = process.argv[2];
const B = "http://localhost:3100";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const init = () => { localStorage.setItem("miryeo-ax-tutorial-v2", "1"); localStorage.setItem("miryeo-demo-role", "OWNER"); };
async function shot(name, path, { mobile = false, full = true, before } = {}) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(init);
  const p = await ctx.newPage();
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto(B + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  if (before) await before(p);
  await p.waitForTimeout(500);
  // 고정 상단바는 긴 캡처에서 한 번만 보이게 일반 흐름으로
  const meta = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: innerWidth }));
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log(name, meta.w, meta.h);
  await ctx.close();
}
await shot("pc_review", "/review/ax-sprint2");
await shot("mob_review", "/review/ax-sprint2", { mobile: true });
await shot("pc_ax", "/ax", { full: false });
await shot("pc_ax_full", "/ax");
await shot("pc_production", "/ax/products?tab=production");
await shot("pc_growth", "/ax/growth");
await shot("pc_customers", "/ax/customers");
await shot("mob_ax", "/ax", { mobile: true });
await shot("mob_beauty", "/beauty", { mobile: true });
await shot("mob_finder", "/beauty/finder", { mobile: true, full: false });
await shot("pc_present", "/ax/present", { full: false });
await b.close();
