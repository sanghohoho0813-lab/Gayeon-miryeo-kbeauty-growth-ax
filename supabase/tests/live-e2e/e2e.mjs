// Live 모드 E2E — 로컬 Supabase 호환 스택(stack.sh) + NEXT_PUBLIC_DATA_MODE=live 빌드 대상
// PHASE=A : 대표 로그인 → 조직 생성 (조직 ID 출력)
// PHASE=B : (NEXT_PUBLIC_MIRYEO_ORG_ID 포함 재빌드 후) 실데이터 입력 → 고객 행동 → Action·Proof·Baseline → 초대·권한 → 장애 시 Error
// 필요: playwright-core (npm i --no-save playwright-core), pg (devDependency)
import { chromium } from "playwright-core";
import pg from "pg";
import fs from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3200";
const GW = "http://127.0.0.1:54321";
const PHASE = process.env.PHASE ?? "A";
const OUT = process.env.OUT_DIR ?? "/tmp/miryeo-live-e2e";
fs.mkdirSync(OUT, { recursive: true });
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://root:root@127.0.0.1:5432/miryeo_live?sslmode=disable" });
await db.connect();
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const count = async (sql, args = []) => Number((await one(sql, args)).n);

const results = [];
const ok = (name, cond, info = "") => { results.push(!!cond); console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errors = [];
async function newPage(label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript(() => localStorage.setItem("miryeo-ax-tutorial-v2", "1"));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("dialog", (d) => d.accept());
  return page;
}
async function login(page, email, password) {
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /로그인/ }).click();
  await page.waitForURL(/\/ax/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}
const mainText = (page) => page.locator("main").innerText();

if (PHASE === "A") {
  // 대표 계정 준비 (Supabase Dashboard에서 사용자 생성하는 단계에 해당)
  const env = Object.fromEntries(fs.readFileSync(new URL("../../../.env.live-e2e", import.meta.url), "utf8").trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
  const cu = await fetch(`${GW}/auth/v1/admin/users`, { method: "POST", headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY, "content-type": "application/json" }, body: JSON.stringify({ email: "owner@miryeo.test", password: "owner-pass-123", email_confirm: true }) });
  ok("대표 계정 생성 (Auth admin)", cu.status === 200 || cu.status === 201, String(cu.status));
  const page = await newPage("owner");
  await page.goto(`${APP}/ax`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login/, { timeout: 10000 });
  ok("비로그인 /ax → /login 이동", page.url().includes("/login"));
  await page.fill("#email", "owner@miryeo.test");
  await page.fill("#password", "wrong-password");
  await page.getByRole("button", { name: /로그인/ }).click();
  ok("잘못된 비밀번호 → 오류 안내", await page.getByText("이메일 또는 비밀번호를 확인하세요").isVisible({ timeout: 8000 }).catch(() => false) || await page.getByText("이메일 또는 비밀번호를 확인하세요").waitFor({ timeout: 8000 }).then(() => true, () => false));
  await login(page, "owner@miryeo.test", "owner-pass-123");
  await page.waitForSelector("#org-name");
  ok("조직 없는 계정 → 조직 만들기 화면", true);
  await page.fill("#org-name", "가연인터내셔널 (Live E2E)");
  await page.getByRole("button", { name: "조직 만들고 시작하기" }).click();
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");
  const org = await one("select id, name from organizations");
  const role = await one("select role from organization_members where organization_id = $1", [org?.id]);
  ok("조직 생성 → DB organizations + OWNER 멤버십", org?.name === "가연인터내셔널 (Live E2E)" && role?.role === "OWNER");
  const t = await page.locator("body").innerText();
  ok("Live 대시보드: DEMO 표기 없음 · 빈 상태", !t.includes("DEMO DATA") && !t.includes("Demo 에센스"), t.slice(0, 120).replace(/\n/g, " / "));
  await page.screenshot({ path: `${OUT}/A_dashboard_empty.png`, fullPage: true });
  fs.writeFileSync(`${OUT}/org-id`, org.id);
  console.log(`ORG_ID=${org.id}`);
}

if (PHASE === "B") {
  const orgId = fs.readFileSync(`${OUT}/org-id`, "utf8").trim();
  const owner = await newPage("owner");
  await login(owner, "owner@miryeo.test", "owner-pass-123");
  ok("재로그인 → 대시보드 (조직 유지)", (await owner.locator("body").innerText()).includes("대시보드"));

  // 1. 채널·상품 등록 (UI)
  await owner.goto(`${APP}/ax/data?tab=channels`, { waitUntil: "networkidle" });
  await owner.fill("#c-name", "자사몰");
  await owner.selectOption("#c-type", "직영몰");
  await owner.getByRole("button", { name: "저장", exact: true }).click();
  await owner.waitForTimeout(800);
  ok("채널 저장 → DB", (await count("select count(*) n from channels where organization_id = $1 and name = '자사몰'", [orgId])) === 1);

  await owner.goto(`${APP}/ax/data?tab=products`, { waitUntil: "networkidle" });
  await owner.getByRole("button", { name: /새 상품/ }).click();
  await owner.fill("#p-sku", "MR-TONER-01");
  await owner.fill("#p-name", "E2E 토너");
  await owner.selectOption("#p-cat", "토너/미스트");
  await owner.fill("#p-price", "30000");
  await owner.selectOption("#p-step", "1");
  await owner.getByRole("button", { name: "수분", exact: true }).click();
  await owner.fill("#p-links", "자사몰|https://example.com/toner");
  await owner.getByLabel("고객 화면(MIRYEO AI Beauty)에 공개").check();
  await owner.getByRole("button", { name: "저장", exact: true }).click();
  await owner.waitForTimeout(800);
  const prod = await one("select id, is_published, is_demo, purchase_links from products where organization_id = $1 and sku = 'MR-TONER-01'", [orgId]);
  ok("상품 저장 → DB (공개·실데이터·구매링크)", prod?.is_published === true && prod?.is_demo === false && prod?.purchase_links?.[0]?.url === "https://example.com/toner");

  // 1-1. 상품 일괄 등록 (신규 1 + 기존 1 수정) → Live upsert
  fs.writeFileSync(`${OUT}/products.csv`, ["상품코드,상품명,분류,판매가,라인", "MR-SUN-01,E2E 선크림,선크림,\"25,000\",", "MR-TONER-01,,,,E2E 라인"].join("\n"));
  await owner.setInputFiles('[data-testid="product-file"]', `${OUT}/products.csv`);
  await owner.waitForTimeout(600);
  await owner.getByRole("button", { name: "2개 저장 (Confirm)" }).click();
  await owner.waitForTimeout(1500);
  const sun = await one("select category, price, is_published from products where organization_id = $1 and sku = 'MR-SUN-01'", [orgId]);
  const ton = await one("select line, price, is_published from products where organization_id = $1 and sku = 'MR-TONER-01'", [orgId]);
  ok("상품 일괄 등록 → DB (신규 비공개 · 기존은 라인만 갱신)", sun?.category === "선케어" && Number(sun.price) === 25000 && sun.is_published === false && ton?.line === "E2E 라인" && Number(ton.price) === 30000 && ton.is_published === true);

  // 2. 판매 파일(한글 열) 8주치 → 증가 추세
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const day = (n) => new Date(Date.parse(today) - n * 86400e3).toISOString().slice(0, 10);
  const lines = ["주문일,상품코드,판매처,수량"];
  for (let w = 7; w >= 0; w--) lines.push(`${day(w * 7 + 1).replace(/-/g, ".")},MR-TONER-01,자사몰,${w >= 4 ? 10 : 22}`);
  fs.writeFileSync(`${OUT}/sales.csv`, lines.join("\n"));
  await owner.goto(`${APP}/ax/data`, { waitUntil: "networkidle" });
  await owner.setInputFiles('[data-testid="sales-file"]', `${OUT}/sales.csv`);
  await owner.waitForTimeout(600);
  ok("판매 파일: 8행 정상 인식", (await mainText(owner)).includes("정상 8행"));
  await owner.getByRole("button", { name: "8행 저장 (Confirm)" }).click();
  await owner.waitForTimeout(1000);
  const sales = await one("select count(*) n, sum(units) u, sum(revenue) r from sales_records where organization_id = $1 and source = 'csv'", [orgId]);
  ok("판매 8행 → DB (수량·매출 자동 계산)", Number(sales.n) === 8 && Number(sales.u) === 128 && Number(sales.r) === 128 * 30000, JSON.stringify(sales));

  // 3. 재고 낮게 → 품절위험 RULE → Action 자동 생성
  await owner.goto(`${APP}/ax/products?tab=inventory`, { waitUntil: "networkidle" });
  await owner.getByRole("button", { name: "E2E 토너 재고 수정" }).click();
  await owner.fill("#currentStock", "12");
  await owner.fill("#safetyStock", "40");
  await owner.fill("#incomingStock", "0");
  await owner.getByRole("button", { name: "저장", exact: true }).click();
  await owner.waitForTimeout(1500);
  await owner.goto(`${APP}/ax/growth`, { waitUntil: "networkidle" });
  await owner.waitForTimeout(1500);
  const act = await one("select id, status, title from growth_actions where organization_id = $1 and rule_key like 'stock:%'", [orgId]);
  ok("재고 위험 RULE → growth_actions 생성 (NEW)", act?.status === "NEW", act?.title);
  ok("생성 이력 action_events(NEW)", (await count("select count(*) n from action_events where growth_action_id = $1 and to_status = 'NEW'", [act?.id])) === 1);

  // 4. Baseline 잠금 (Action 승인 전 기준값)
  await owner.goto(`${APP}/ax/reports`, { waitUntil: "networkidle" });
  await owner.locator('[data-testid="kpi-COST"]').getByRole("button", { name: /Baseline 잠금/ }).click();
  await owner.fill("#bl-value", "24");
  await owner.fill("#bl-from", day(21));
  await owner.fill("#bl-to", day(8));
  await owner.getByRole("button", { name: "잠금", exact: true }).click();
  await owner.waitForTimeout(1000);
  const bl = await one("select value, unit, source, locked_by from kpi_baselines where organization_id = $1 and kpi_key = 'COST' and superseded_at is null", [orgId]);
  ok("Baseline 잠금 → kpi_baselines (RPC)", Number(bl?.value) === 24 && bl?.unit === "시간" && bl?.locked_by === "owner@miryeo.test");

  // 5. Action 처리 → Proof → OWNER 확정
  await owner.goto(`${APP}/ax/growth`, { waitUntil: "networkidle" });
  await owner.getByRole("button", { name: /E2E 토너 재고 확보/ }).first().click();
  await owner.getByRole("button", { name: "근거 확인 — 검토 완료" }).click();
  await owner.waitForTimeout(800);
  await owner.fill("#assignee", "생산 담당");
  await owner.getByRole("button", { name: "승인하고 실행 시작" }).click();
  await owner.waitForTimeout(800);
  await owner.fill("#result", "OEM에 1,000개 추가 생산 발주 (E2E)");
  await owner.getByRole("button", { name: "결과 기록하고 완료" }).click();
  await owner.waitForTimeout(1200);
  const done = await one("select status, approved_by, kpi_before, kpi_after from growth_actions where id = $1", [act.id]);
  ok("Action DONE + 승인자 + KPI before/after (DB)", done.status === "DONE" && done.approved_by === "owner@miryeo.test" && done.kpi_before?.length > 0 && done.kpi_after?.length > 0);
  ok("Action 이력 4건+ (NEW/REVIEWED/IN_PROGRESS/DONE)", (await count("select count(*) n from action_events where growth_action_id = $1", [act.id])) >= 4);
  const proof = await one("select id, status, data_source from proof_events where growth_action_id = $1", [act.id]);
  ok("Proof 기록 (SUPABASE LIVE)", proof?.status === "RECORDED" && proof?.data_source === "SUPABASE LIVE");
  await owner.keyboard.press("Escape");
  await owner.goto(`${APP}/ax/reports`, { waitUntil: "networkidle" });
  await owner.getByRole("button", { name: /결과 확정/ }).first().click();
  await owner.waitForTimeout(1000);
  ok("OWNER 결과 확정 → RESULT_CONFIRMED", (await one("select status from proof_events where id = $1", [proof.id])).status === "RESULT_CONFIRMED");
  const cost = await owner.locator('[data-testid="kpi-COST"]').innerText();
  ok("COST: Baseline 대비 변화 표시", cost.includes("개선") && cost.includes("승인 1건"), cost.split("\n").slice(3, 11).join(" / "));
  await owner.screenshot({ path: `${OUT}/B_reports.png`, fullPage: true });

  // 6. 설정: Pilot 시작일 · AX OWNER
  await owner.goto(`${APP}/ax/settings`, { waitUntil: "networkidle" });
  await owner.fill("#pilot-date", today);
  await owner.locator("#pilot-date").locator("xpath=following-sibling::button").click();
  await owner.waitForTimeout(600);
  await owner.fill("#ax-owner", "운영팀장 (E2E)");
  await owner.locator("#ax-owner").locator("xpath=following-sibling::button").click();
  await owner.waitForTimeout(800);
  const o = await one("select pilot_started_on::text p, ax_owner_name a from organizations where id = $1", [orgId]);
  ok("Pilot 시작일·AX OWNER → DB", o.p === today && o.a === "운영팀장 (E2E)");

  // 7. 익명 고객 (다른 브라우저 컨텍스트)
  const cust = await newPage("customer");
  await cust.context().route("https://example.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>외부 구매처</title>ok" }));
  await cust.goto(`${APP}/beauty`, { waitUntil: "networkidle" });
  ok("고객 홈: 공개 실상품 노출 · Demo 없음", (await cust.locator("body").innerText()).includes("E2E 토너") && !(await cust.locator("body").innerText()).includes("Demo 에센스"));
  await cust.goto(`${APP}/beauty/products/${prod.id}`, { waitUntil: "networkidle" });
  await cust.waitForTimeout(800);
  const pop = cust.context().waitForEvent("page", { timeout: 5000 }).catch(() => null);
  await cust.getByRole("button", { name: /자사몰/ }).first().click();
  const popup = await pop;
  ok("구매채널 클릭 → 외부 구매처 새 창", !!popup && popup.url().includes("example.com"), popup?.url());
  await popup?.close();
  await cust.waitForTimeout(800);
  await cust.goto(`${APP}/beauty/finder`, { waitUntil: "networkidle" });
  await cust.getByRole("button", { name: /수분 부족/ }).click();
  await cust.getByRole("button", { name: "다음" }).click();
  await cust.getByRole("button", { name: "수분을 채우고 싶어요" }).click();
  await cust.getByRole("button", { name: "다음" }).click();
  await cust.getByRole("button", { name: "가벼운 사용감", exact: true }).click();
  await cust.getByRole("button", { name: "다음" }).click();
  await cust.getByRole("button", { name: "꼼꼼하게 챙기는 편이에요" }).click();
  await cust.getByRole("button", { name: "다음" }).click();
  await cust.getByRole("button", { name: "합리적인 가격 위주" }).click();
  await cust.getByRole("button", { name: "결과 보기" }).click();
  await cust.waitForTimeout(800);
  await cust.getByRole("button", { name: "Beauty Passport에 저장" }).click();
  await cust.waitForTimeout(1500);
  const evTypes = (await db.query("select event_type, count(*) n from customer_events where organization_id = $1 group by 1", [orgId])).rows.map((r) => `${r.event_type}:${r.n}`).sort();
  ok("익명 고객 이벤트 → customer_events (anon RLS)", ["view_product", "finder_start", "finder_complete", "passport_save"].every((t) => evTypes.some((x) => x.startsWith(t + ":"))), evTypes.join(", "));
  ok("구매채널 이동 이벤트 기록", evTypes.some((x) => x.startsWith("outbound_purchase_click")));
  ok("Finder 결과 저장 → beauty_profiles + recommendations (익명)", (await count("select count(*) n from beauty_profiles where organization_id = $1", [orgId])) === 1 && (await count("select count(*) n from beauty_recommendations where organization_id = $1 and beauty_profile_id is not null", [orgId])) === 1);

  await owner.goto(`${APP}/ax/customers`, { waitUntil: "networkidle" });
  await owner.waitForTimeout(800);
  ok("AX 고객 인사이트에 실제 이벤트 반영", (await mainText(owner)).includes("Finder"));

  // 8. 초대 (서버 API + service role) → 메일 → 수락 → 비밀번호 → 역할별 화면
  await owner.goto(`${APP}/ax/settings#members`, { waitUntil: "networkidle" });
  await owner.waitForTimeout(800);
  ok("구성원 목록 (서버 API)", (await owner.locator("#members tbody tr").count()) === 1);
  for (const [email, role] of [["staff@miryeo.test", "STAFF"], ["admin@miryeo.test", "ADMIN"]]) {
    await owner.fill("#invite-email", email);
    await owner.selectOption("#invite-role", role);
    await owner.getByRole("button", { name: /^초대$/ }).click();
    await owner.waitForTimeout(1500);
  }
  ok("초대 2명 → organization_members", (await count("select count(*) n from organization_members where organization_id = $1", [orgId])) === 3);
  const mails = await (await fetch(`${GW}/__mail`)).json();
  const linkFor = (email) => {
    const m = [...mails].reverse().find((x) => x.to.some((t) => t.includes(email)));
    const body = (m?.body ?? "").replace(/=\r?\n/g, "").replace(/=3D/g, "=").replace(/&amp;/g, "&");
    return body.match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]+/)?.[0];
  };
  const staffLink = linkFor("staff@miryeo.test");
  ok("초대 메일 발송 (SMTP 수신)", !!staffLink && !!linkFor("admin@miryeo.test"), staffLink?.slice(0, 90));

  async function accept(link, pw, label) {
    const p = await newPage(label);
    await p.goto(link, { waitUntil: "networkidle" });
    await p.waitForSelector("#new-password", { timeout: 15000 });
    await p.fill("#new-password", pw);
    await p.getByRole("button", { name: "비밀번호 저장하고 시작" }).click();
    await p.waitForURL(/\/ax/, { timeout: 15000 });
    await p.waitForLoadState("networkidle");
    return p;
  }
  const staff = await accept(staffLink, "staff-pass-123", "staff");
  ok("초대 수락 → 비밀번호 설정 → /ax 진입 (STAFF)", staff.url().includes("/ax"));
  await staff.locator("aside").getByText("직원", { exact: true }).waitFor({ timeout: 10000 });
  const nav = await staff.locator("aside").innerText();
  ok("STAFF: 역할 확정 후 채널·B2B·수출 메뉴 숨김", !nav.includes("채널·B2B·수출") && !nav.includes("확인 중"));
  await staff.goto(`${APP}/ax/reports`, { waitUntil: "networkidle" });
  ok("STAFF: Baseline 잠금·결과 확정 버튼 없음", (await staff.getByRole("button", { name: /Baseline 잠금|다시 잠금|결과 확정/ }).count()) === 0);
  const staffB2b = await staff.evaluate(async ({ gw }) => {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    const tok = JSON.parse(localStorage.getItem(key)).access_token;
    const r = await fetch(`${gw}/rest/v1/sales_records?select=id`, { headers: { authorization: `Bearer ${tok}`, apikey: "x" } });
    const b = await fetch(`${gw}/rest/v1/b2b_accounts?select=id`, { headers: { authorization: `Bearer ${tok}`, apikey: "x" } });
    return [(await r.json()).length, (await b.json()).length];
  }, { gw: GW });
  ok("STAFF 토큰: 판매 조회 가능 · B2B 0행 (RLS)", staffB2b[0] === 8 && staffB2b[1] === 0, JSON.stringify(staffB2b));
  await staff.goto(`${APP}/ax/settings`, { waitUntil: "networkidle" });
  ok("STAFF: 구성원 목록 차단", (await staff.locator("#members").innerText()).includes("대표·관리자만"));

  const admin = await accept(linkFor("admin@miryeo.test"), "admin-pass-123", "admin");
  ok("ADMIN: 채널·B2B·수출 메뉴 보임", await admin.locator("aside").getByText("채널·B2B·수출").waitFor({ timeout: 10000 }).then(() => true, () => false));
  await admin.goto(`${APP}/ax/settings#members`, { waitUntil: "networkidle" });
  await admin.waitForTimeout(800);
  ok("ADMIN: 구성원 목록 조회 가능 · 초대 폼 없음", (await admin.locator("#members tbody tr").count()) === 3 && (await admin.locator("#invite-email").count()) === 0);
  const adminInvite = await admin.evaluate(async () => {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    const tok = JSON.parse(localStorage.getItem(key)).access_token;
    const r = await fetch("/api/org/members", { method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify({ email: "x@miryeo.test", role: "STAFF" }) });
    return r.status;
  });
  ok("ADMIN이 API로 초대 시도 → 403", adminInvite === 403);

  // 9. OWNER 역할 변경·제거 (서버 API)
  await owner.goto(`${APP}/ax/settings#members`, { waitUntil: "networkidle" });
  await owner.waitForTimeout(800);
  await owner.selectOption('select[aria-label="staff@miryeo.test 역할"]', "ADMIN");
  await owner.waitForTimeout(1200);
  ok("역할 변경 STAFF→ADMIN (DB)", (await one("select m.role from organization_members m join auth.users u on u.id = m.user_id where u.email = 'staff@miryeo.test'")).role === "ADMIN");
  await owner.locator("#members tbody tr", { hasText: "staff@miryeo.test" }).getByRole("button", { name: /제거/ }).click();
  await owner.waitForTimeout(1200);
  ok("구성원 제거 (DB, 계정은 유지)", (await count("select count(*) n from organization_members where organization_id = $1", [orgId])) === 2 && (await count("select count(*) n from auth.users where email = 'staff@miryeo.test'")) === 1);
  await owner.screenshot({ path: `${OUT}/B_members.png`, fullPage: false });

  // 10. 주간 리포트 (Live)
  await owner.goto(`${APP}/ax/reports/weekly`, { waitUntil: "networkidle" });
  const wk = await owner.locator('[data-testid="weekly-report"]').innerText();
  ok("주간 리포트: SUPABASE LIVE · 완료 Action · 확정 Proof", wk.includes("SUPABASE LIVE") && wk.includes("E2E 토너 재고 확보") && wk.includes("결과 확정") && !wk.includes("DEMO 데이터"));
  await owner.emulateMedia({ media: "print" });
  await owner.pdf({ path: `${OUT}/weekly_live.pdf`, format: "A4", printBackground: true });
  await owner.emulateMedia({ media: "screen" });

  // 11. 장애: REST 게이트웨이 중단 → Error 화면 (Demo로 대체하지 않음)
  const gwPid = fs.readFileSync("/tmp/miryeo-gateway.pid", "utf8").trim();
  process.kill(Number(gwPid));
  await new Promise((r) => setTimeout(r, 800));
  await owner.goto(`${APP}/ax`, { waitUntil: "domcontentloaded" });
  await owner.waitForTimeout(6500);
  ok("장애 중 로딩 5초+ → 재시도 안내 · 잘못된 역할(직원) 표시 없음", (await owner.locator("body").innerText()).includes("자동으로 다시 시도") && !(await owner.locator("header").innerText()).includes("직원"));
  await owner.getByText(/확인하지 못했|불러오지 못했/).first().waitFor({ timeout: 30000 }).catch(() => {});
  const down = await owner.locator("body").innerText();
  ok("DB 연결 실패 → Error 화면 · Demo 숫자 없음", /불러오지 못했|확인하지 못했|오류|실패/.test(down) && !down.includes("Demo 에센스") && !down.includes("DEMO DATA"), down.slice(0, 160).replace(/\n/g, " / "));
  await owner.screenshot({ path: `${OUT}/B_error_state.png` });

  // 12. 로그아웃
  // (게이트웨이 재시작은 stack.sh 재실행으로)
}

const failed = results.filter((r) => !r).length;
ok("Page error 0", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.filter(Boolean).length}/${results.length} PASS (PHASE ${PHASE})`);
await browser.close();
await db.end();
process.exit(failed ? 1 : 0);
