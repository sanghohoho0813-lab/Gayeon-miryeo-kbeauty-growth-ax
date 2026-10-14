import type { Metadata } from "next";
import { ReviewAxSprint2 } from "@/components/review/ReviewAxSprint2";

/* AX Sprint II 심사위원 전용 공개 페이지 (PASS 16, D-068)
   - /ax 레이아웃 밖의 독립 경로: 사이드바·관리자 헤더·로그인·내부 링크 없음
   - 운영 데이터·인증·저장소를 쓰지 않는다: 공개 시연 데이터(src/lib/review/ax-sprint2-demo.ts) → 기존 순수 계산 함수 → 화면 */
export const metadata: Metadata = {
  title: "MIRYEO K-Beauty Growth AX | AX Sprint II Review",
  description: "K-Beauty 판매·재고·생산·고객행동 데이터를 연결해 운영 판단을 지원하는 MIRYEO Growth AX Pilot.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    title: "MIRYEO K-Beauty Growth AX | AX Sprint II Review",
    description: "K-Beauty 판매·재고·생산·고객행동 데이터를 연결해 운영 판단을 지원하는 MIRYEO Growth AX Pilot (시연용 샘플 데이터).",
    type: "website",
  },
};

// 날짜(오늘·착수 마감일)를 요청 시점 기준으로 — 빌드 날짜에 고정되지 않게
export const dynamic = "force-dynamic";

export default function Page() {
  return <ReviewAxSprint2 now={new Date().toISOString()} />;
}
