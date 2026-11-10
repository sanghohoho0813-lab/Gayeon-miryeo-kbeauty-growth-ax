/* 배포 버전 (PASS 42, D-151) — next.config.ts가 빌드할 때 박아 넣는다. 번호 = 화면 코드의 지문(문서만 바뀐 배포는 같은 번호) */

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
export const BUILD_AT = process.env.NEXT_PUBLIC_BUILD_AT ?? "";

/** 서버 답에서 새 버전인지 — 번호가 있고 내 번호와 다를 때만 (알 수 없으면 알리지 않는다) */
export function isNewerBuild(mine: string, answer: unknown): boolean {
  if (!mine || !answer || typeof answer !== "object") return false;
  const id = (answer as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 && id !== mine;
}
