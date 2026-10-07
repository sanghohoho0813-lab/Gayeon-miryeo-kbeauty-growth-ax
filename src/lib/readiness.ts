"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AI_BRIEFING_UI, PRIVACY_POLICY_URL, PRIVACY_VERSION, PUBLIC_ORG_ID, SUPABASE_ANON_KEY, SUPABASE_URL, isLive, liveConfigured } from "./config";
import type { Product } from "./types";

/* 공개 전 점검 (시험버전 공개 = 계약 별지 제1호 마지막 완료기준).
   - 데이터베이스: migration별 대표 테이블·열·함수가 있는지 (익명 키로 조회 — 없으면 404/42P01/42703/PGRST202)
   - 보안: 로그인하지 않은 사람(anon)에게 내부 데이터가 보이지 않는지 — 구성원 화면과 비교
   - 고객 화면·서버 설정·수동 확인 항목
   결과는 화면에만 표시하고 저장하지 않는다. */

export type CheckStatus = "ok" | "warn" | "fail" | "info";
export type CheckGroup = "연결·설정" | "데이터베이스" | "보안 (로그인 안 한 사람)" | "고객 화면" | "서버·선택 기능" | "직접 확인";
export interface Check {
  id: string;
  group: CheckGroup;
  label: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
}

export interface ServerStatus {
  mode: "demo" | "live";
  serviceRole: "missing" | "ok" | "invalid";
  ai: { enabled: boolean; credential: boolean; allowDemo: boolean };
}

const MISSING_CODES = new Set(["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"]);
type Probe = { state: "present" | "missing" | "error"; rows: number; message?: string };

function classify(error: { code?: string; message?: string } | null, rows: number, status?: number): Probe {
  if (!error) return { state: "present", rows };
  if (MISSING_CODES.has(error.code ?? "") || status === 404) return { state: "missing", rows: 0, message: error.code };
  return { state: "error", rows: 0, message: `${error.code ?? ""} ${error.message ?? ""}`.trim() };
}

async function probe(sb: SupabaseClient, table: string, column = "id", eqs: [string, string | boolean][] = []): Promise<Probe> {
  let q = sb.from(table).select(column).limit(5);
  for (const [c, v] of eqs) q = q.eq(c, v);
  const r = await q;
  return classify(r.error, r.data?.length ?? 0, r.status);
}

async function probeRpc(sb: SupabaseClient, fn: string): Promise<Probe> {
  const r = await sb.rpc(fn);
  return classify(r.error, Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0, r.status);
}

/** 세션을 쓰지 않는 익명 클라이언트 — 고객(비로그인)이 보는 것과 같다 */
function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "miryeo-readiness-anon" } });
}

const SCHEMA: { id: string; label: string; probes: [string, string?][]; rpc?: string; file: string }[] = [
  { id: "m001", label: "기본 테이블 (001·002)", probes: [["organizations"], ["organization_members", "user_id"], ["products"], ["sales_records"], ["customer_events"], ["growth_actions"], ["proof_events"]], file: "001·002" },
  { id: "m005", label: "Baseline·AX OWNER (005)", probes: [["kpi_baselines"], ["organizations", "ax_owner_name"]], file: "005" },
  { id: "m006", label: "고객 이벤트 한도 (006)", probes: [], rpc: "event_limits", file: "006" },
  { id: "m007", label: "고객 회원·구매기록·정산 (007)", probes: [["customer_accounts", "user_id"], ["customer_purchases"], ["settlements"], ["products", "usage_days"]], file: "007" },
];

/* 익명에게 0행이어야 하는 테이블 — 구성원에게 보이는 행 수와 비교 */
const PRIVATE_TABLES: [string, string, string][] = [
  ["organizations", "id", "조직"],
  ["organization_members", "user_id", "구성원"],
  ["sales_records", "id", "판매"],
  ["inventory", "product_id", "재고"],
  ["settlements", "id", "정산·미수금"],
  ["customer_accounts", "user_id", "고객 회원 정보"],
  ["customer_purchases", "id", "고객 구매기록"],
  ["growth_actions", "id", "Action"],
];

export interface ReadinessInput {
  member: SupabaseClient | null;
  memberOrgId?: string;
  products: Product[];
  server: ServerStatus | { error: string } | null;
  origin: string;
}

export async function runReadiness(input: ReadinessInput): Promise<Check[]> {
  const out: Check[] = [];
  const add = (c: Check) => out.push(c);

  /* 연결·설정 */
  add({ id: "mode", group: "연결·설정", label: "Data Mode = live", status: isLive ? "ok" : "fail", detail: isLive ? "SUPABASE LIVE" : "DEMO — 시연용. 시험버전 공개 전 live로 전환", fix: "NEXT_PUBLIC_DATA_MODE=live → 재배포 (SETUP §B-4)" });
  add({ id: "supabase-env", group: "연결·설정", label: "Supabase 주소·anon 키", status: liveConfigured ? "ok" : "fail", detail: liveConfigured ? "설정됨" : "없음", fix: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (SETUP §B-5)" });
  const https = input.origin.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)/.test(input.origin);
  add({ id: "https", group: "연결·설정", label: "HTTPS 주소", status: https ? "ok" : "fail", detail: input.origin, fix: "Vercel 기본 도메인(https) 또는 연결 도메인 사용" });

  if (!isLive || !liveConfigured) {
    add({ id: "db-skip", group: "데이터베이스", label: "데이터베이스·보안 점검", status: "info", detail: "Live 연결 후 이 화면에서 자동 점검합니다." });
  } else {
    const anon = anonClient();
    /* 데이터베이스 */
    for (const m of SCHEMA) {
      const results = await Promise.all([...m.probes.map(([t, c]) => probe(anon, t, c ?? "id").then((r) => ({ name: c ? `${t}.${c}` : t, r }))), ...(m.rpc ? [probeRpc(anon, m.rpc).then((r) => ({ name: `${m.rpc}()`, r }))] : [])]);
      const missing = results.filter((x) => x.r.state === "missing").map((x) => x.name);
      const errors = results.filter((x) => x.r.state === "error");
      add({
        id: m.id, group: "데이터베이스", label: m.label,
        status: missing.length ? "fail" : errors.length ? "warn" : "ok",
        detail: missing.length ? `없음: ${missing.join(", ")}` : errors.length ? `확인 실패: ${errors[0].r.message}` : "적용됨",
        fix: missing.length ? `Supabase SQL Editor에서 migration ${m.file} 실행 (새 프로젝트면 supabase/setup_all.sql 한 번에)` : undefined,
      });
    }

    /* 보안 — 익명 노출 */
    const leaks: string[] = []; const unknown: string[] = []; const checked: string[] = [];
    for (const [t, c, label] of PRIVATE_TABLES) {
      const a = await probe(anon, t, c);
      if (a.state !== "present") continue; // 없는 테이블은 '데이터베이스'에서 표시, 권한 오류(401/42501)는 차단된 것
      if (a.rows > 0) { leaks.push(label); continue; }
      const mine = input.member ? await probe(input.member, t, c) : null;
      if (mine && mine.rows > 0) checked.push(label); else unknown.push(label);
    }
    add({
      id: "anon-leak", group: "보안 (로그인 안 한 사람)", label: "내부 데이터가 익명에게 보이지 않음 (RLS)",
      status: leaks.length ? "fail" : "ok",
      detail: leaks.length ? `익명에게 보임: ${leaks.join(", ")}` : `차단 확인 ${checked.length}개${checked.length ? ` (${checked.join(", ")})` : ""}${unknown.length ? ` · 데이터가 없어 다음에 재확인: ${unknown.join(", ")}` : ""}`,
      fix: leaks.length ? "즉시 고객 화면 공개 중단 → migration 003·005·007 정책 적용 여부 확인" : undefined,
    });
    const hidden = await probe(anon, "products", "id", [["is_published", false]]);
    add({ id: "anon-unpublished", group: "보안 (로그인 안 한 사람)", label: "비공개 상품이 익명에게 보이지 않음", status: hidden.rows > 0 ? "fail" : "ok", detail: hidden.rows > 0 ? `비공개 상품 ${hidden.rows}개 이상 노출` : "차단됨", fix: hidden.rows > 0 ? "migration 003 products_public_select 정책 확인" : undefined });

    /* 고객 화면 */
    const orgOk = !!PUBLIC_ORG_ID && PUBLIC_ORG_ID === input.memberOrgId;
    add({ id: "public-org", group: "고객 화면", label: "고객 화면 조직 ID", status: !PUBLIC_ORG_ID ? "fail" : orgOk ? "ok" : "fail", detail: !PUBLIC_ORG_ID ? "NEXT_PUBLIC_MIRYEO_ORG_ID 없음 — 고객 행동이 기록되지 않음" : orgOk ? "내 조직과 일치" : "내 조직과 다름 — 고객 행동이 다른 조직으로 기록됨", fix: orgOk ? undefined : "설정 > 조직 ID를 NEXT_PUBLIC_MIRYEO_ORG_ID에 넣고 재배포 (SETUP §B-8)" });
    if (PUBLIC_ORG_ID) {
      const pub = await probe(anon, "products", "id", [["organization_id", PUBLIC_ORG_ID], ["is_published", true]]);
      add({ id: "public-products", group: "고객 화면", label: "고객에게 보이는 상품", status: pub.rows > 0 ? "ok" : "warn", detail: pub.rows > 0 ? `${pub.rows >= 5 ? "5개 이상" : `${pub.rows}개`} 공개` : "공개 상품 없음 — 고객 화면이 비어 보임", fix: pub.rows > 0 ? undefined : "데이터 관리 > 상품 '고객 화면에 공개' 체크" });
    }
  }

  const real = input.products.filter((p) => !p.isDemo && p.isPublished);
  const noLink = real.filter((p) => !p.purchaseLinks.some((l) => l.url));
  if (isLive) add({ id: "purchase-links", group: "고객 화면", label: "공개 상품의 구매 링크", status: real.length === 0 ? "info" : noLink.length ? "warn" : "ok", detail: real.length === 0 ? "공개 상품 없음" : noLink.length ? `링크 없음 ${noLink.length}개: ${noLink.slice(0, 3).map((p) => p.name).join(", ")}${noLink.length > 3 ? " 외" : ""} — '연결 예정' 안내가 뜸` : `${real.length}개 모두 연결` });
  const privacy = Boolean(PRIVACY_POLICY_URL && PRIVACY_VERSION);
  add({ id: "privacy", group: "고객 화면", label: "개인정보 처리방침 (회원가입 조건)", status: privacy ? "ok" : isLive ? "warn" : "info", detail: privacy ? `${PRIVACY_VERSION} · ${PRIVACY_POLICY_URL}` : "없음 — 고객 회원가입이 닫혀 있음 (추천·구매처 이동은 가능)", fix: privacy ? undefined : "NEXT_PUBLIC_PRIVACY_POLICY_URL·VERSION (SETUP §B-6-2, 법률 확인 필요)" });

  /* 서버·선택 기능 */
  const s = input.server;
  if (!s || "error" in s) {
    add({ id: "server", group: "서버·선택 기능", label: "서버 설정 조회", status: "warn", detail: s && "error" in s ? s.error : "응답 없음" });
  } else {
    add({ id: "service-role", group: "서버·선택 기능", label: "서버 전용 관리 키 (앱 내 초대·고객 탈퇴)", status: s.serviceRole === "ok" ? "ok" : s.serviceRole === "invalid" ? "fail" : "info", detail: s.serviceRole === "ok" ? (isLive ? "설정됨 · 관리자 권한 확인" : "설정됨") : s.serviceRole === "invalid" ? "설정됐으나 유효하지 않음 (다른 프로젝트 키?)" : "없음 (선택) — 구성원은 SQL로 추가, 탈퇴는 본인 권한 범위만 삭제", fix: s.serviceRole === "invalid" ? "Supabase > Project Settings > API의 service_role 키로 교체 (NEXT_PUBLIC 금지)" : undefined });
    const aiConsistent = AI_BRIEFING_UI === (s.ai.enabled && s.ai.credential);
    add({
      id: "ai", group: "서버·선택 기능", label: "대표 브리핑 AI 문장화 (선택, 사용료 고객사 부담)",
      status: !AI_BRIEFING_UI && !s.ai.enabled ? "info" : aiConsistent ? "ok" : "warn",
      detail: !AI_BRIEFING_UI && !s.ai.enabled ? "꺼짐 (RULE 브리핑 사용)" : aiConsistent ? "켜짐 — 대시보드에서 1회 실행해 '숫자 검증 통과' 확인" : `설정 불일치: 버튼 ${AI_BRIEFING_UI ? "켜짐" : "꺼짐"} · 서버 ${s.ai.enabled ? "켜짐" : "꺼짐"} · 자격증명 ${s.ai.credential ? "있음" : "없음"}`,
      fix: aiConsistent ? undefined : "SETUP §G — 세 값을 함께 설정",
    });
    if (isLive && s.ai.allowDemo) add({ id: "ai-demo", group: "서버·선택 기능", label: "AI_BRIEFING_ALLOW_DEMO", status: "warn", detail: "운영 환경에는 필요 없음", fix: "환경변수 삭제" });
  }

  /* 직접 확인 (자동 판정 불가) */
  for (const [id, label, detail] of [
    ["redirect", "Supabase 로그인 메일 돌아올 주소", "Authentication > URL Configuration: Site URL = 공개 주소, Redirect URLs에 /login, /beauty/me 추가 (초대·가입 메일 링크)"],
    ["smtp", "메일 발송 한도", "Supabase 기본 메일은 시간당 발송 수가 적음 — 초대·가입이 많으면 Custom SMTP 설정"],
    ["backup", "데이터 백업", "Supabase 요금제별 백업 주기 확인 (무료 요금제는 자동 백업 없음 — 주간 CSV 내보내기 권장)"],
  ] as const) add({ id, group: "직접 확인", label, status: "info", detail });

  return out;
}

export function summarize(checks: Check[]) {
  const n = (s: CheckStatus) => checks.filter((c) => c.status === s).length;
  return { ok: n("ok"), warn: n("warn"), fail: n("fail"), info: n("info"), ready: n("fail") === 0 };
}
