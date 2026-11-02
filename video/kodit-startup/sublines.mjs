import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
const subs = JSON.parse(readFileSync("subs.json"));
const b = await pw.chromium.launch();
for (const [F, W, H] of [["v", 1080, 1920], ["h", 1920, 1080]]) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.goto(pathToFileURL(`${process.cwd()}/comp/comp_${F}.html`).href); await p.evaluate(() => document.fonts.ready);
  const bad = [];
  for (const [i, s] of subs.entries()) {
    const r = await p.evaluate((t) => { window.render(t); const sp = document.querySelector("#sub span"); const lh = parseFloat(getComputedStyle(sp).lineHeight); return { lines: Math.round((sp.getBoundingClientRect().height - 32) / lh), w: Math.round(sp.getBoundingClientRect().width) }; }, (s.in + s.out) / 2);
    if (r.lines > 2) bad.push([i, r.lines, s.text.replace("\n", " / ")]);
  }
  console.log(F, "3줄 이상:", bad.length, JSON.stringify(bad));
  await p.close();
}
await b.close();
