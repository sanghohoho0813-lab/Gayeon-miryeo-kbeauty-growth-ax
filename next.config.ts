import type { NextConfig } from "next";
import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/* 공개 사이트 기본 보안 헤더 + 검색 노출 제어 (DECISIONS D-039)
   - 검색 노출: Demo이거나 NEXT_PUBLIC_ALLOW_INDEXING=on이 아니면 전 페이지 noindex (Demo 숫자·제품이 실제처럼 검색되지 않게).
     허용 시에도 Business AX·로그인·API는 항상 noindex.
   - frame-ancestors 'self': 다른 사이트가 화면을 iframe으로 감싸지 못하게 (Device View는 같은 출처라 허용). */
const indexable = process.env.NEXT_PUBLIC_DATA_MODE === "live" && process.env.NEXT_PUBLIC_ALLOW_INDEXING === "on";
const NOINDEX = { key: "X-Robots-Tag", value: "noindex, nofollow" };

/* Demo 빌드는 브라우저에서 Supabase를 쓰지 않음 → 브라우저 묶음에서만 빈 모듈로 바꿔 첫 화면 JS를 줄인다 (PASS 38, D-140).
   NEXT_PUBLIC_DATA_MODE는 빌드할 때 정해지므로(Live 전환 = 환경변수 + 재배포) 같은 빌드 안에서 바뀌지 않는다. */
const demoBuild = process.env.NEXT_PUBLIC_DATA_MODE !== "live";

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

/* 배포 버전 (PASS 42, D-151) — 켜 둔 화면이 서버(/api/version)와 비교해 '새 버전' 안내를 띄운다.
   번호는 화면 코드(src·public·의존성·설정)의 지문이다. 문서만 바뀐 배포는 번호가 같아서 알림이 뜨지 않는다.
   빌드할 때 코드에 그대로 박힌다(실행 중에 다시 계산한 값은 쓰이지 않는다). */
function codeFingerprint(): string | null {
  try {
    const h = createHash("sha256");
    const walk = (dir: string) => {
      for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        const st = statSync(path);
        if (st.isDirectory()) walk(path);
        else if (st.size > 1_000_000) h.update(`${path}:${st.size}`); // 영상 등 큰 파일은 이름·크기만
        else { h.update(path); h.update(readFileSync(path)); }
      }
    };
    for (const d of ["src", "public"]) walk(d);
    for (const f of ["package-lock.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json"]) h.update(readFileSync(f));
    return h.digest("hex").slice(0, 10);
  } catch {
    return null; // 소스가 없는 곳(배포된 서버)에서 다시 읽힐 때
  }
}
const BUILD_AT = new Date().toISOString();
const BUILD_ID = codeFingerprint() ?? ((process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 10) || `t${Date.now().toString(36)}`);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID, NEXT_PUBLIC_BUILD_AT: BUILD_AT },
  poweredByHeader: false,
  turbopack: {
    resolveAlias: demoBuild ? { "@supabase/supabase-js": { browser: "./src/lib/data/supabase-demo-stub.ts" } } : {},
  },
  async headers() {
    return [
      { source: "/:path*", headers: indexable ? security : [...security, NOINDEX] },
      ...(indexable ? ["/ax/:path*", "/ax", "/login", "/api/:path*"].map((source) => ({ source, headers: [NOINDEX] })) : []),
    ];
  },
};

export default nextConfig;
