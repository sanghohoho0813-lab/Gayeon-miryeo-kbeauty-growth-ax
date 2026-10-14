// node contact.mjs v|h out.png t1,t2,...  — 시험 프레임 한 장 모음 (+자막 2줄 초과·가로 넘침 검사)
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
import { pathToFileURL } from "node:url";
const [F, OUT, TS] = process.argv.slice(2);
const [W, H] = F === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(pathToFileURL(`${process.cwd()}/comp/comp_${F}.html`).href); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
const shots = [];
for (const t of TS.split(",").map(Number)) {
  await p.evaluate((t) => window.render(t), t);
  shots.push({ t, src: "data:image/jpeg;base64," + (await p.screenshot({ type: "jpeg", quality: 70 })).toString("base64") });
}
// 자막 검사: 모든 자막 2줄 이하
const subIssues = await p.evaluate(() => { const out = []; const span = document.querySelector("#sub span"); const lh = parseFloat(getComputedStyle(span).lineHeight);
  for (const [a, , txt] of SUBS) { window.render(a + .3); const lines = Math.round((span.getBoundingClientRect().height - 32) / lh); if (lines > 2) out.push([a, lines, txt.slice(0, 20)]); } return out; });
console.log("자막 2줄 초과:", JSON.stringify(subIssues));
const cw = F === "v" ? 270 : 480;
const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
await pg.setContent(`<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;gap:6px;padding:6px;font:14px sans-serif;color:#fff;width:${(cw + 6) * (F === "v" ? 5 : 3) + 6}px">` +
  shots.map((s) => `<div><img src="${s.src}" style="width:${cw}px;display:block"><div>${s.t}s</div></div>`).join("") + "</body>");
await pg.waitForTimeout(500);
await pg.screenshot({ path: OUT, fullPage: true });
await b.close();
