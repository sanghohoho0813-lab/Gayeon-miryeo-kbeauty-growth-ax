/* Demo 빌드의 브라우저 묶음에서 @supabase/supabase-js 대신 들어가는 빈 모듈 (PASS 38, D-140).
   Demo(NEXT_PUBLIC_DATA_MODE ≠ live)는 브라우저에서 Supabase를 쓰지 않으므로, 실제 라이브러리(압축 전 약 350KB)를 싣지 않는다.
   next.config.ts의 turbopack.resolveAlias(browser 조건)가 이 파일로 바꾼다. 서버 코드·Live 빌드는 실제 라이브러리 그대로.
   여기가 불렸다면 Demo 빌드에서 Live 코드가 돈 것 — 조용히 넘어가지 않고 바로 알린다. */
export function createClient(): never {
  throw new Error("Demo 빌드에서는 Supabase를 쓰지 않습니다. Live로 쓰려면 NEXT_PUBLIC_DATA_MODE=live로 다시 빌드하세요.");
}
