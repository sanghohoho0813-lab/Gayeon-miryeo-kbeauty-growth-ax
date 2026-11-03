// 첫 화면 성능 검수 (PASS 38, D-139·D-140) — 화면마다 처음 받는 JS 크기와 휴대폰 조건의 첫 화면 지표
//   node qa/perf.mjs              (빌드한 앱을 BASE에 띄운 뒤. Demo 빌드 기준)
//   PERF_ONLY=size node qa/perf.mjs   (크기만 — 빠름)
//
// ① 첫 로드 JS: 그 주소의 HTML이 바로 싣는 <script src> 묶음만 센다 (다른 화면을 미리 받는 prefetch는 제외).
//    gzip 크기는 서버 압축과 비슷하게 zlib로 계산. 차트(recharts)·Supabase 라이브러리가 들어 있는지도 본다.
// ② 휴대폰 조건(390×844, CPU 4배 느리게, 지연 150ms·약 9Mbps, 빈 캐시): FCP·LCP·CLS·TBT(50ms 넘는 긴 작업의 초과분 합).
//    시간 지표는 기기·부하에 따라 흔들리므로 기준선은 넉넉히 두고, 크기·포함 여부를 엄격히 본다.
import { gzipSync } from "zlib";
import { chromium, check, summary, BASE } from "./lib.mjs";

const CUSTOMER = ["/", "/login", "/beauty", "/beauty/products", "/beauty/finder", "/beauty/passport"];
const AX = ["/ax", "/ax/products", "/ax/channels", "/ax/monthly", "/ax/customers", "/ax/business", "/ax/data"];
const SIG = {
  recharts: /recharts-(?:surface|wrapper|layer|cartesian)/,
  supabase: /GoTrueClient|PostgrestQueryBuilder|RealtimeChannel/,
};
// 첫 로드 JS 기준선 (gzip KB) — PASS 38 측정값(고객 최대 215 · AX 최대 292) + 여유. 넘으면 무엇이 새로 실렸는지 확인
const BUDGET_GZ = { customer: 230, ax: 310 };

const cache = new Map();
async function chunk(src) {
  if (!cache.has(src)) {
    const body = Buffer.from(await (await fetch(BASE + src)).arrayBuffer());
    const text = body.toString("utf8");
    cache.set(src, { raw: body.length, gz: gzipSync(body, { level: 6 }).length, libs: Object.entries(SIG).filter(([, re]) => re.test(text)).map(([k]) => k) });
  }
  return cache.get(src);
}

async function firstLoad(route) {
  const html = await (await fetch(BASE + route)).text();
  const srcs = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]))];
  let raw = 0, gz = 0; const libs = new Set();
  for (const s of srcs) { const c = await chunk(s); raw += c.raw; gz += c.gz; c.libs.forEach((l) => libs.add(l)); }
  return { n: srcs.length, raw, gz, libs: [...libs] };
}

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
const rows = [];
for (const r of [...CUSTOMER, ...AX]) {
  const f = await firstLoad(r);
  const group = CUSTOMER.includes(r) ? "customer" : "ax";
  rows.push({ r, ...f });
  check(`${r} 첫 로드에 차트 라이브러리 없음`, !f.libs.includes("recharts"), f.libs.join(","));
  check(`${r} 첫 로드에 Supabase 라이브러리 없음 (Demo 빌드)`, !f.libs.includes("supabase"), f.libs.join(","));
  check(`${r} 첫 로드 JS ≤ ${BUDGET_GZ[group]}KB(gzip)`, f.gz / 1024 <= BUDGET_GZ[group], kb(f.gz));
}
console.log("\n주소                          첫 로드 JS (압축 전 / gzip, 파일 수)");
for (const x of rows) console.log(`${x.r.padEnd(30)}${kb(x.raw).padStart(7)} / ${kb(x.gz).padStart(6)}  (${x.n})${x.libs.length ? `  [${x.libs}]` : ""}`);

if (process.env.PERF_ONLY !== "size") {
  const browser = await chromium.launch();
  console.log("\n휴대폰 조건 첫 화면 (ms · CLS)");
  for (const r of [...CUSTOMER, "/ax", "/ax/products", "/ax/monthly"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
    await ctx.addInitScript(() => {
      try { localStorage.setItem("miryeo-ax-tutorial-v2", "1"); } catch { /* noop */ }
      const w = window; w.__lcp = 0; w.__cls = 0; w.__tbt = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__tbt += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true });
    });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.1e6, uploadThroughput: 0.7e6 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.goto(BASE + r, { waitUntil: "networkidle", timeout: 120000 });
    await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({ fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0), lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), tbt: Math.round(window.__tbt) }));
    console.log(`${r.padEnd(22)} FCP ${String(m.fcp).padStart(5)}  LCP ${String(m.lcp).padStart(5)}  CLS ${m.cls.toFixed(3)}  TBT ${String(m.tbt).padStart(5)}`);
    // Core Web Vitals '좋음' 기준 0.1. 고객 화면은 더 엄격히 (글꼴 교체로 생기는 작은 밀림은 남을 수 있음)
    const clsMax = r.startsWith("/beauty") ? 0.02 : 0.1;
    check(`${r} 레이아웃 밀림 CLS ≤ ${clsMax}`, m.cls <= clsMax, String(m.cls));
    await ctx.close();
  }
  await browser.close();
}
summary(`qa/perf (${BASE})`);
