// node pair.mjs out.png a.png b.png ... — 프레임 나란히
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
import { readFileSync } from "node:fs";
const [out, ...fs] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.setContent(`<body style="margin:0;background:#222;display:flex;gap:6px;padding:6px;font:14px sans-serif;color:#fff">${fs.map(f=>`<div><img src="data:image/png;base64,${readFileSync(f).toString("base64")}" style="display:block;max-width:${Math.floor(1580/fs.length)}px"><div>${f.split('/').pop()}</div></div>`).join("")}</body>`);
await p.waitForTimeout(300); await p.screenshot({ path: out, fullPage: true }); await b.close();
