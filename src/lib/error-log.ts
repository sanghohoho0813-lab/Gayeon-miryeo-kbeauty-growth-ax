/* 이 브라우저의 오류 기록 (PASS 42, D-152)
   화면에서 난 오류는 브라우저 콘솔에만 남아 운영자가 알 방법이 없었다 — D-146은 배포 다음 날부터 모든 화면에서 났지만 일주일간 몰랐다.
   외부 오류 수집 서비스(R-28, 승인 전) 대신, 오류 글과 화면 주소만 이 브라우저에 최근 30건 적어 두고 '공개 전 점검'에서 보고 복사한다.
   서버로 보내지 않는다. 입력값·자료는 적지 않는다(오류 글 · 화면 경로 · 버전 · 시각 · 횟수). */

export const ERROR_LOG_KEY = "miryeo-error-log";
export const ERROR_LOG_EVENT = "miryeo-error-log-change";
const MAX_ENTRIES = 30;
const MAX_MESSAGE = 300;

export type ErrorKind = "error" | "promise" | "screen";
export interface ErrorEntry {
  /** 마지막으로 난 시각 */
  at: string;
  kind: ErrorKind;
  message: string;
  /** 화면 경로 (주소의 ? 뒤는 적지 않는다) */
  path: string;
  build: string;
  count: number;
}

const KINDS: readonly ErrorKind[] = ["error", "promise", "screen"];
export const ERROR_KIND_LABEL: Record<ErrorKind, string> = { error: "화면 오류", promise: "처리 오류", screen: "오류 화면" };

/** 기록하지 않는 것 — 브라우저가 스스로 내는 무해한 알림 */
const NOISE = /ResizeObserver loop|Script error\.?$/i;

export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? `${e.name && e.name !== "Error" ? `${e.name}: ` : ""}${e.message}` : typeof e === "string" ? e : (() => { try { return JSON.stringify(e) ?? String(e); } catch { return String(e); } })();
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE);
}

/** 저장된 값의 형태 확인 — 맞는 줄만 남긴다 */
export function cleanErrorLog(v: unknown): ErrorEntry[] {
  if (!Array.isArray(v)) return [];
  const out: ErrorEntry[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const { at, kind, message, path, build, count } = x as Record<string, unknown>;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at)) || typeof message !== "string" || !message || typeof path !== "string") continue;
    if (!(KINDS as readonly unknown[]).includes(kind)) continue;
    out.push({ at, kind: kind as ErrorKind, message: message.slice(0, MAX_MESSAGE), path: path.slice(0, 200), build: typeof build === "string" ? build.slice(0, 40) : "", count: typeof count === "number" && Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1 });
  }
  return out.slice(0, MAX_ENTRIES);
}

/** 새 오류를 더한 목록 — 같은 화면의 같은 오류는 줄을 늘리지 않고 횟수만 올려 맨 위로 */
export function addError(list: ErrorEntry[], e: Omit<ErrorEntry, "count">): ErrorEntry[] {
  const message = e.message.slice(0, MAX_MESSAGE);
  if (!message || NOISE.test(message)) return list;
  const path = e.path.split(/[?#]/)[0].slice(0, 200);
  const same = list.find((x) => x.kind === e.kind && x.message === message && x.path === path);
  const rest = list.filter((x) => x !== same);
  return [{ ...e, message, path, count: (same?.count ?? 0) + 1 }, ...rest].slice(0, MAX_ENTRIES);
}

/** 복사용 글 — 문의할 때 그대로 붙여 넣는다 */
export function errorLogText(list: ErrorEntry[], meta: { build: string; mode: string; now: string; userAgent: string }): string {
  const head = [`[MIRYEO Business AX 오류 기록] ${meta.now}`, `버전 ${meta.build || "알 수 없음"} · ${meta.mode}`, `브라우저 ${meta.userAgent}`, `기록 ${list.length}건`];
  const rows = list.map((x, i) => `${i + 1}. ${x.at} · ${ERROR_KIND_LABEL[x.kind]} · ${x.path} · ${x.count}번${x.build && x.build !== meta.build ? ` · 버전 ${x.build}` : ""}\n   ${x.message}`);
  return [...head, "", ...rows].join("\n");
}

export function readErrorLog(): ErrorEntry[] {
  if (typeof window === "undefined") return [];
  try { return cleanErrorLog(JSON.parse(localStorage.getItem(ERROR_LOG_KEY) ?? "[]")); } catch { return []; }
}

export function recordError(kind: ErrorKind, error: unknown, build: string): void {
  if (typeof window === "undefined") return;
  try {
    const before = readErrorLog();
    const next = addError(before, { at: new Date().toISOString(), kind, message: errorMessage(error), path: window.location.pathname, build });
    if (next === before) return;
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(ERROR_LOG_EVENT));
  } catch { /* 기록하지 못해도 화면에는 영향 없음 */ }
}

export function clearErrorLog(): void {
  try { localStorage.removeItem(ERROR_LOG_KEY); window.dispatchEvent(new Event(ERROR_LOG_EVENT)); } catch { /* noop */ }
}

/** 화면 밖으로 새어 나온 오류를 적는다. 반환값으로 해제 */
export function installErrorLog(build: string): () => void {
  const onError = (ev: ErrorEvent) => recordError("error", ev.error ?? ev.message, build);
  const onRejection = (ev: PromiseRejectionEvent) => recordError("promise", ev.reason, build);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
}
