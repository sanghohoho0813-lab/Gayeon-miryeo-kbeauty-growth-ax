/* 지금 서버에 배포된 버전 (PASS 42, D-151) — 켜 둔 화면이 자기 버전과 비교해 '새 버전' 안내를 띄운다.
   비밀 값이 아니다(화면 코드의 지문 10자 · 빌드 시각). 항상 새로 답한다. */

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID ?? "", builtAt: process.env.NEXT_PUBLIC_BUILD_AT ?? "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
