import type { MetadataRoute } from "next";

/* 검색 엔진 안내 — next.config.ts의 X-Robots-Tag와 같은 규칙 (D-039) */
export default function robots(): MetadataRoute.Robots {
  const indexable = process.env.NEXT_PUBLIC_DATA_MODE === "live" && process.env.NEXT_PUBLIC_ALLOW_INDEXING === "on";
  return indexable
    ? { rules: { userAgent: "*", allow: ["/", "/beauty"], disallow: ["/ax", "/login", "/api"] } }
    : { rules: { userAgent: "*", disallow: "/" } };
}
