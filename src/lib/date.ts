/* 날짜 유틸 — 하드코딩 날짜 금지. 모든 기준일은 현재 시각(Asia/Seoul) 기준으로 계산한다. */

export const TIME_ZONE = "Asia/Seoul";

/* 날짜 형식기는 만들 때 비용이 커서(수천 번 호출되면 화면이 수 초 멈춤) 한 번만 만들어 다시 쓴다 (PASS 29, D-091) */
const ISO_DAY = new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE });
const KR_DATETIME = new Intl.DateTimeFormat("ko-KR", { timeZone: TIME_ZONE, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export function todayISO(now: Date = new Date()): string {
  return ISO_DAY.format(now);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysAgoISO(days: number): string {
  return addDaysISO(todayISO(), -days);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function formatDateKR(iso?: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}.${m}.${d}`;
}

export function formatDateTimeKR(iso?: string | null): string {
  if (!iso) return "-";
  return KR_DATETIME.format(new Date(iso));
}

export function relativeKR(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 최근 28일 / 이전 28일 기간 라벨 */
export function periodLabel(): string {
  const t = todayISO();
  return `${formatDateKR(addDaysISO(t, -27))} ~ ${formatDateKR(t)}`;
}
