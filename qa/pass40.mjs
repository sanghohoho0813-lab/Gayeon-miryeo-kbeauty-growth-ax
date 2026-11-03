// PASS 40 검수 — 읽는 순서·이동 (D-145): 화면마다 제목 · 본문으로 건너뛰기 · 제목 단계 · 랜드마크 · 초점 표시
//   AXE_PATH=…/axe-core/axe.min.js node qa/pass40.mjs
import { readFileSync } from "fs";
import { chromium, check, summary, newCtx, watch, go } from "./lib.mjs";

const AX = [["/ax", "대시보드"], ["/ax/monthly", "월별 실적"], ["/ax/products", "상품·재고·생산"], ["/ax/channels", "채널·B2B·수출"], ["/ax/customers", "고객 인사이트"],
  ["/ax/growth", "AI Growth Center"], ["/ax/reports", "실증·Evidence"], ["/ax/business", "사업화·현장확인"], ["/ax/why", "기획의도"], ["/ax/start", "실데이터 시작 가이드"],
  ["/ax/data", "데이터 관리"], ["/ax/system", "공개 전 점검"], ["/ax/settings", "설정"], ["/ax/present", "대표 보고 모드"]];
const BEAUTY = [["/beauty", "MIRYEO AI Beauty"], ["/beauty/finder", "AI 뷰티 파인더"], ["/beauty/products", "제품"], ["/beauty/passport", "뷰티 패스포트"],
  ["/beauty/me", "마이페이지"], ["/beauty/login", "로그인"]];
const OTHER = [["/login", "로그인"]];
const axeSrc = readFileSync(process.env.AXE_PATH, "utf8");
// axe '모범 사례' 중 읽는 순서·랜드마크 규칙 (WCAG A·AA는 qa/a11y가 봄)
const RULES = ["region", "heading-order", "page-has-heading-one", "landmark-one-main", "landmark-unique", "landmark-no-duplicate-banner",
  "landmark-no-duplicate-contentinfo", "landmark-banner-is-top-level", "landmark-main-is-top-level", "skip-link", "bypass", "document-title"];

const browser = await chromium.launch();
const errsAll = [];
const titles = new Map();

async function structure(p) {
  return p.evaluate(() => {
    const vis = (h) => { const s = getComputedStyle(h); return s.display !== "none" && s.visibility !== "hidden" && !h.closest("[aria-hidden=true],[hidden]"); };
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => Number(h.tagName[1]));
    const skips = []; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skips.push(`h${hs[i - 1]}→h${hs[i]}`);
    return { h1: hs.filter((x) => x === 1).length, skips, mains: document.querySelectorAll("main").length };
  });
}
async function axeBp(p) {
  if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: axeSrc });
  return p.evaluate(async (rules) => {
    const r = await window.axe.run(document, { runOnly: { type: "rule", values: rules } });
    return r.violations.map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`);
  }, RULES);
}

for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await newCtx(browser, w, h); const p = await ctx.newPage(); errsAll.push(watch(p));
  for (const [r, want] of [...AX, ...BEAUTY, ...OTHER]) {
    await go(p, r, 600);
    const title = await p.title();
    if (w === 1440) {
      check(`${r} 제목에 '${want}'`, title.includes(want), title);
      titles.set(r, title);
    }
    const st = await structure(p);
    check(`${w} ${r} h1 하나`, st.h1 === 1, String(st.h1));
    check(`${w} ${r} 제목 단계 건너뜀 없음`, st.skips.length === 0, st.skips.join(","));
    check(`${w} ${r} main 하나`, st.mains === 1, String(st.mains));
    const v = await axeBp(p);
    check(`${w} ${r} axe 읽는 순서·랜드마크`, v.length === 0, v.join(" | "));
  }
  await ctx.close();
}
// 화면끼리 제목이 겹치지 않음 (탭·방문 기록에서 구별)
const vals = [...titles.values()];
check("화면 제목이 모두 다름", new Set(vals).size === vals.length, vals.filter((t, i) => vals.indexOf(t) !== i).join(" | "));

// 제품 상세 — 제품 이름이 탭 제목
{
  const ctx = await newCtx(browser, 390, 844); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, "/beauty/products", 600);
  const href = await p.locator('a[href^="/beauty/products/"]').first().getAttribute("href");
  await go(p, href, 900);
  const name = (await p.locator("h1").first().innerText()).trim();
  check("제품 상세 탭 제목 = 제품 이름 (주소로 바로 열어도)", (await p.title()).startsWith(name), `${await p.title()} / ${name}`);
  await p.waitForTimeout(1500);
  check("…시간이 지나도 그대로", (await p.title()).startsWith(name), await p.title());
  await p.goBack(); await p.waitForTimeout(900);
  check("목록으로 돌아오면 '제품' 제목", (await p.title()).startsWith("제품 ·"), await p.title());
  await ctx.close();
}

// 본문으로 건너뛰기 — 첫 Tab · 보임 · Enter로 본문 · 다음 Tab은 본문 안
for (const [r, w] of [["/ax", 1440], ["/ax/data", 390], ["/beauty", 390], ["/beauty/products", 1440]]) {
  const ctx = await newCtx(browser, w, 900); const p = await ctx.newPage(); errsAll.push(watch(p));
  await go(p, r, 700);
  await p.keyboard.press("Tab");
  const f = await p.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect(); return { t: a.textContent?.trim(), id: a.dataset.testid, x: b.left, y: b.top, w: b.width }; });
  check(`${r} 첫 Tab = 본문으로 건너뛰기 · 화면 안에 보임`, f.id === "skip-link" && f.x >= 0 && f.y >= 0 && f.w > 40, JSON.stringify(f));
  await p.keyboard.press("Enter"); await p.waitForTimeout(150);
  check(`${r} Enter → 본문(main)으로`, await p.evaluate(() => document.activeElement?.id === "main"));
  await p.keyboard.press("Tab");
  check(`${r} 다음 Tab은 본문 안 (메뉴 건너뜀)`, await p.evaluate(() => !!document.activeElement?.closest("main")));
  await ctx.close();
}

// 초점 표시 — 처음 15번의 Tab마다 보이는 표시(테두리·그림자)
for (const [r, w, theme] of [["/ax", 1440, "deep-navy"], ["/ax/data", 1440, "pure-white"], ["/beauty/products", 390, undefined]]) {
  const ctx = await newCtx(browser, w, 900, { theme }); const p = await ctx.newPage();
  await go(p, r, 700);
  let bad = [];
  for (let k = 0; k < 15; k++) {
    await p.keyboard.press("Tab");
    const s = await p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const c = getComputedStyle(a);
      const ring = (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) >= 2) || (c.boxShadow && c.boxShadow !== "none");
      return { ring, t: (a.getAttribute("aria-label") || a.textContent || a.tagName).trim().slice(0, 20) }; });
    if (s && !s.ring) bad.push(s.t);
  }
  check(`${r}${theme ? ` (${theme})` : ""} Tab 15번 모두 초점 표시`, bad.length === 0, bad.join(", "));
  await ctx.close();
}

check("페이지 오류·콘솔 오류 0", errsAll.flat().length === 0, errsAll.flat().slice(0, 3).join(" | "));
await browser.close();
summary("qa/pass40");
