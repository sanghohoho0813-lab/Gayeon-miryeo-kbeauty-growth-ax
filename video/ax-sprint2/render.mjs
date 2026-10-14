//  node render.mjs comp.html out.mp4 W H FROM_FRAME TO_FRAME   — 영상만(무음) 구간 렌더 (스타일 가이드 14-3 기반, 구간 병렬용)
import { chromium } from "/home/user/Gayeon-miryeo-kbeauty-growth-ax/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
const [, , COMP, OUT, W, H, FROM, TO] = process.argv;
const FPS = 30;
const FFMPEG = process.env.FFMPEG;
const from = Number(FROM), to = Number(TO);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: Number(W), height: Number(H) }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(COMP).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
const args = ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), "-profile:v", "high", OUT];
const ff = spawn(FFMPEG, args, { stdio: ["pipe", "inherit", "inherit"] });
const t0 = Date.now();
for (let i = from; i < to; i++) {
  await p.evaluate((t) => window.render(t), i / FPS);
  const buf = await p.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if ((i - from) % 600 === 0) console.log(`${OUT.split("/").pop()} frame ${i}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await b.close();
console.log(`${OUT.split("/").pop()} done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
