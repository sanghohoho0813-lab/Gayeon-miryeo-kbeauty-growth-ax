import type { Metadata } from "next";

// 화면 제목 (PASS 40, D-145) — 브라우저 탭·방문 기록·화면 낭독기에서 화면을 구별
export const metadata: Metadata = { title: "마이페이지" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
