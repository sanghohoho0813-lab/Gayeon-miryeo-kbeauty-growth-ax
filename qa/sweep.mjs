// 전 화면 회귀 — 모든 주소 × 360·390·768·1440: 응답 200 · 페이지 오류 0 · 콘솔 오류 0 · 가로 넘침 0
//   node qa/sweep.mjs            (빌드한 앱을 BASE에 띄운 뒤)
import { chromium, check, summary, newCtx, watch, go, overflowX, BASE } from "./lib.mjs";

const AX = ["/ax", "/ax/monthly", "/ax/products", "/ax/products?tab=inventory", "/ax/products?tab=production", "/ax/channels", "/ax/customers",
  "/ax/growth", "/ax/reports", "/ax/business", "/ax/why", "/ax/start", "/ax/data", "/ax/data?tab=products", "/ax/data?tab=channels", "/ax/data?tab=b2b",
  "/ax/data?tab=export", "/ax/system", "/ax/settings", "/ax/present"];
const BEAUTY = ["/beauty", "/beauty/finder", "/beauty/products", "/beauty/products?concern=수분&category=크림", "/beauty/passport", "/beauty/me", "/beauty/login"];
const OTHER = ["/", "/login", "/review/ax-sprint2", "/review/ax-sprint2/video"];
const WIDTHS = [[360, 780], [390, 844], [768, 1024], [1440, 900]];

const browser = await chromium.launch();
// 제품 상세 주소 하나
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage();
  await go(p, "/beauty/products");
  const href = await p.locator('a[href^="/beauty/products/"]').first().getAttribute("href");
  if (href) BEAUTY.push(href);
  await ctx.close();
}
const routes = [...AX, ...BEAUTY, ...OTHER];
for (const [w, h] of WIDTHS) {
  const ctx = await newCtx(browser, w, h); const page = await ctx.newPage(); const errs = watch(page);
  for (const r of routes) {
    errs.length = 0;
    let status = 0;
    try { status = (await go(page, r, 500))?.status() ?? 0; } catch (e) { errs.push(`goto ${e.message}`); }
    check(`${w} ${r} 응답 200`, status === 200, `status ${status}`);
    check(`${w} ${r} 오류 없음`, errs.length === 0, errs.join(" | "));
    const ov = await overflowX(page);
    check(`${w} ${r} 가로 넘침 0`, ov <= 0, `${ov}px`);
  }
  await ctx.close();
}
await browser.close();
summary(`sweep (${routes.length}개 주소 × ${WIDTHS.length}폭, ${BASE})`);
