import type { Metadata } from "next";
import { ReviewVideo } from "@/components/review/ReviewVideo";
import { formatDurationKR, REVIEW_VIDEO } from "@/lib/review/ax-sprint2-video";

/* AX Sprint II 담당자·심사위원용 소개 영상 페이지 (PASS 17, D-069)
   - 심사 페이지와 같은 공개 읽기 전용 경로 (/ax 레이아웃 밖, 검색 노출 차단)
   - 세로 9:16 / 가로 16:9 전환 · 재생 속도 · 장면 이동 · 원본 1080p 내려받기 */
export const metadata: Metadata = {
  title: "MIRYEO K-Beauty Growth AX | AX Sprint II 소개 영상",
  description: "주식회사 가연인터내셔널 — MIRYEO K-Beauty Growth AX를 3분여로 설명하는 AX Sprint II 담당자용 보조 영상 (시연용 예시 데이터).",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function Page() {
  const V = REVIEW_VIDEO;
  return (
    <div className="min-h-screen" style={{ background: "#F6F7F9", color: "#101828" }}>
      <main className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-6 md:py-12">
        <p className="text-[0.84rem] font-bold tracking-wide" style={{ color: "#0E7490" }}>AX Sprint II · 담당자·심사위원용</p>
        <h1 className="mt-1.5 flex flex-wrap items-baseline gap-x-3 text-[clamp(1.5rem,3vw,2.1rem)] font-bold leading-snug [word-break:keep-all]" style={{ color: "#0E1A33" }}>
          {V.title}
          <span className="text-[1rem] font-semibold" style={{ color: "#475467" }}>{formatDurationKR(V.durationSec)}</span>
        </h1>
        <p className="mt-1.5 text-[0.95rem] [word-break:keep-all]" style={{ color: "#475467" }}>{V.company} · 세로(9:16) · 가로(16:9) · 자막 포함 · 원본 1080p</p>
        <div className="mt-6">
          <ReviewVideo idPrefix="vp" />
        </div>
        <p className="mt-8 text-center text-[0.86rem]" style={{ color: "#475467" }}>
          <a href="/review/ax-sprint2" className="font-semibold underline underline-offset-4" style={{ color: "#0E1A33" }}>AX Sprint II 심사 페이지에서 직접 눌러 보는 데모 보기 →</a>
        </p>
      </main>
    </div>
  );
}
