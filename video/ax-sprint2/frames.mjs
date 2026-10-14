// node frames.mjs v|h prefix t1,t2,... [scale] — 시각별 프레임 (확인용, 축소)
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
import { pathToFileURL } from "node:url";
const [F, PRE, TS, SC = "0.5"] = process.argv.slice(2);
const [W, H] = F === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(SC) });
await p.goto(pathToFileURL(`${process.cwd()}/comp/comp_${F}.html`).href); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
for (const t of TS.split(",").map(Number)) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `${PRE}_${t}.png` }); }
await b.close();
