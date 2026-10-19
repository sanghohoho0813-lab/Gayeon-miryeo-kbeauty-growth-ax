"use client";

import { useEffect } from "react";

/* 최상위 레이아웃까지 실패했을 때 (PASS 28, D-088) — 앱 글꼴·스타일이 없을 수 있어 글자와 버튼만. 영어 기본 화면 대신 한국어 안내 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("[MIRYEO] global error", error); }, [error]);
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", background: "#F6F6F8", color: "#1B1C22" }}>
        <title>잠시 문제가 생겼습니다 · MIRYEO</title>
        <main style={{ maxWidth: 520, margin: "12vh auto 0", padding: "0 20px", textAlign: "center" }} role="alert">
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", color: "#6B6F7A" }}>MIRYEO</p>
          <h1 style={{ fontSize: 24, margin: "8px 0 10px" }}>화면을 표시하는 중 문제가 생겼습니다</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5E616C" }}>잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 새로고침하거나 처음 화면으로 이동해 주세요.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={() => retry()} style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, border: 0, background: "#1B1C22", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>다시 시도</button>
            <a href="/" style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, border: "1px solid #C9CBD3", color: "#1B1C22", fontSize: 15, fontWeight: 700, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>처음 화면</a>
          </div>
          {error.digest && <p style={{ marginTop: 18, fontSize: 12, color: "#6B6F7A" }}>오류 번호 {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
