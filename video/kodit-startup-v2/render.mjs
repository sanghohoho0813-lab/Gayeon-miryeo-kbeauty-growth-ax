//  node render.mjs comp.html out.mp4 W H FROM_FRAME TO_FRAME — 영상만(무음) 구간 렌더 (video/ax-sprint2/render.mjs와 같은 방식, 설치된 Playwright 사용)
import pw from "/opt/node-tools/node_modules/playwright/index.js";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
const [, , COMP, OUT, W, H, FROM, TO] = process.argv;
const FPS = Number(process.env.FPS || 60);
const from = Number(FROM), to = Number(TO);
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: Number(W), height: Number(H) }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(COMP).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
const args = ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-x264-params", "deblock=-2,-2:aq-mode=3", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-r", String(FPS), "-profile:v", "high", OUT];
const ff = spawn("ffmpeg", ["-nostdin", ...args], { stdio: ["pipe", "inherit", "inherit"] });
const t0 = Date.now();
for (let i = from; i < to; i++) {
  await p.evaluate((t) => window.render(t), i / FPS);
  const buf = await p.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if ((i - from) % 600 === 0) console.log(`${OUT.split("/").pop()} frame ${i}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await b.close();
console.log(`${OUT.split("/").pop()} done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
