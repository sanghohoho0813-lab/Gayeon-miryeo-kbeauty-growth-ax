// 접근성 회귀 — axe(WCAG 2.1 A·AA): AX 전 화면 × 7테마(1440) + AX 전 화면 390(기본 테마) + 고객·심사 화면 390
//   AXE_PATH=…/axe-core/axe.min.js node qa/a11y.mjs
import { chromium, check, summary, newCtx, go, axe, THEMES } from "./lib.mjs";

const AX = ["/ax", "/ax/monthly", "/ax/products", "/ax/products?tab=inventory", "/ax/products?tab=production", "/ax/channels", "/ax/customers",
  "/ax/growth", "/ax/reports", "/ax/business", "/ax/why", "/ax/start", "/ax/data", "/ax/data?tab=products", "/ax/system", "/ax/settings"];
const PUBLIC = ["/beauty", "/beauty/finder", "/beauty/products", "/beauty/passport", "/beauty/me", "/beauty/login", "/login", "/review/ax-sprint2"];

const browser = await chromium.launch();
for (const theme of THEMES) {
  const ctx = await newCtx(browser, 1440, 900, { theme }); const p = await ctx.newPage();
  for (const r of AX) { await go(p, r, 500); const v = await axe(p); check(`1440 ${theme} ${r}`, v.length === 0, v.join(" | ")); }
  await ctx.close();
}
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage();
  for (const r of [...AX, ...PUBLIC]) { await go(p, r, 500); const v = await axe(p); check(`390 ${r}`, v.length === 0, v.join(" | ")); }
  await ctx.close();
}
await browser.close();
summary("qa/a11y");
