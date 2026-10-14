import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
import { pathToFileURL } from "node:url";
const [F, OUT, T] = process.argv.slice(2); const [W, H] = F === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(pathToFileURL(`${process.cwd()}/comp/comp_${F}.html`).href); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
await p.evaluate((t) => { window.render(t); document.getElementById("sub").style.display = "none"; }, Number(T));
await p.screenshot({ path: OUT, type: "jpeg", quality: 82 }); await b.close();
