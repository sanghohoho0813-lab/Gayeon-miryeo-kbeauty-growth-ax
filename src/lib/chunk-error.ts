/* 화면 코드 묶음을 못 받았을 때 (PASS 41, D-148)
   - 새 버전이 배포된 뒤 예전에 열어 둔 탭에서 메뉴를 누르면, 옛 묶음 파일이 서버에 없어 받지 못한다.
   - 연결이 잠깐 끊겨도 같은 오류가 난다.
   둘 다 새로고침하면 풀리므로 오류 화면 대신 한 번 자동으로 새로고침한다. 되풀이되지 않게 1분 안에는 한 번만. */

const KEY = "miryeo-chunk-reload";
const ONCE_WITHIN_MS = 60_000;

export function isChunkLoadError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const { name, message } = e as { name?: unknown; message?: unknown };
  return /ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(`${String(name ?? "")} ${String(message ?? "")}`);
}

/** 최근 1분 안에 자동 새로고침을 하지 않았으면 새로고침하고 true. 이미 했으면(또 실패한 것) false → 안내 화면을 보인다 */
export function reloadOnceForChunk(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? "0");
    if (Number.isFinite(last) && last > 0 && now - last < ONCE_WITHIN_MS) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false; // 기록할 수 없으면 되풀이를 막을 수 없으니 자동 새로고침은 하지 않는다
  }
  window.location.reload();
  return true;
}
