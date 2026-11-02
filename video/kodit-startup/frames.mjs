// node frames.mjs v|h outdir t1,t2,...  — 장면 틀에서 지정 시각 프레임 (검수용)
import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
const [, , F, OUT, TS] = process.argv; mkdirSync(OUT, { recursive: true });
const [W, H] = F === "v" ? [1080, 1920] : [1920, 1080];
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(pathToFileURL(`${process.cwd()}/comp/comp_${F}.html`).href);
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
for (const t of TS.split(",").map(Number)) {
  await p.evaluate((t) => window.render(t), t);
  await p.screenshot({ path: `${OUT}/${F}_${t.toFixed(1).padStart(5, "0")}.png` });
}
await b.close();
