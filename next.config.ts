import type { NextConfig } from "next";

/* 공개 사이트 기본 보안 헤더 + 검색 노출 제어 (DECISIONS D-039)
   - 검색 노출: Demo이거나 NEXT_PUBLIC_ALLOW_INDEXING=on이 아니면 전 페이지 noindex (Demo 숫자·제품이 실제처럼 검색되지 않게).
     허용 시에도 Business AX·로그인·API는 항상 noindex.
   - frame-ancestors 'self': 다른 사이트가 화면을 iframe으로 감싸지 못하게 (Device View는 같은 출처라 허용). */
const indexable = process.env.NEXT_PUBLIC_DATA_MODE === "live" && process.env.NEXT_PUBLIC_ALLOW_INDEXING === "on";
const NOINDEX = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: indexable ? security : [...security, NOINDEX] },
      ...(indexable ? ["/ax/:path*", "/ax", "/login", "/api/:path*"].map((source) => ({ source, headers: [NOINDEX] })) : []),
    ];
  },
};

export default nextConfig;
