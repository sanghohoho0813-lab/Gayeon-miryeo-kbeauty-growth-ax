import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";
import { ReviewVideo } from "@/components/review/ReviewVideo";
import { formatDurationKR, REVIEW_VIDEO } from "@/lib/review/ax-sprint2-video";

/* 루트 포털 — 내부 운영 시스템과 고객 플랫폼 진입점 분리 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f5f0] px-6 py-16">
      <p className="text-[0.95rem] font-semibold tracking-[0.25em] text-[#6B6550]">
        GAYEON INTERNATIONAL
      </p>
      <h1 className="font-display mt-3 text-center text-[2.4rem] font-bold leading-tight text-[#16233f] md:text-[3.2rem]">
        MIRYEO K-Beauty Growth AX
      </h1>
      <p className="mt-4 max-w-xl text-center text-[1.05rem] leading-relaxed text-[#5e6678]">
        판매·재고·생산·고객 데이터를 하나로 연결하고,
        <br className="hidden md:block" />
        AI가 다음 성장 행동을 제안하는 K-Beauty 운영 시스템
      </p>

      <div className="mt-12 grid w-full max-w-3xl gap-5 md:grid-cols-2">
        <Link
          href="/ax"
          className="group rounded-3xl border border-[#e2ddd0] bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8eef8] text-[#1b3a6b]">
            <BarChart3 size={24} aria-hidden />
          </span>
          <h2 className="mt-5 text-[1.35rem] font-bold text-[#16233f]">MIRYEO Business AX</h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-[#5e6678]">
            대표·직원용 내부 운영 시스템.
            <br />
            매출·재고·채널·AI Action을 한눈에.
          </p>
          <span className="mt-5 inline-flex items-center gap-1 font-semibold text-[#1b3a6b]">
            내부 시스템 입장 <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </Link>

        <Link
          href="/beauty"
          className="group rounded-3xl border border-[#e2ddd0] bg-[#16233f] p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#e3c987]">
            <Sparkles size={24} aria-hidden />
          </span>
          <h2 className="mt-5 text-[1.35rem] font-bold text-white">MIRYEO AI Beauty</h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-white/70">
            고객용 제품 탐색·AI 추천 플랫폼.
            <br />
            AI가 이해하는 나의 피부.
          </p>
          <span className="mt-5 inline-flex items-center gap-1 font-semibold text-[#e3c987]">
            고객 화면 보기 <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </Link>
      </div>

      {/* AX Sprint II 담당자용 소개 영상 (PASS 17, D-069) — 심사 페이지와 같은 원본 영상 */}
      <section aria-labelledby="home-video-title" className="mt-16 w-full max-w-6xl" data-testid="home-video">
        <p className="text-center text-[0.86rem] font-semibold tracking-[0.18em] text-[#6B6550]">AX SPRINT II · 담당자용</p>
        <h2 id="home-video-title" className="mt-2 text-center text-[1.6rem] font-bold text-[#16233f] md:text-[2rem]">
          MIRYEO K-Beauty Growth AX 소개 영상 <span className="text-[1rem] font-semibold text-[#5e6678]">{formatDurationKR(REVIEW_VIDEO.durationSec)}</span>
        </h2>
        <p className="mt-2 text-center text-[0.95rem] text-[#5e6678]">주식회사 가연인터내셔널 · 세로(9:16) · 가로(16:9) · 자막 포함</p>
        <div className="mt-6 text-left">
          <ReviewVideo idPrefix="hv" />
        </div>
        <p className="mt-4 text-center text-[0.9rem]">
          <Link href="/review/ax-sprint2" className="font-semibold text-[#1b3a6b] underline underline-offset-4">AX Sprint II 심사 페이지 보기 →</Link>
        </p>
      </section>

      <p className="mt-12 text-[0.82rem] text-[#6B6550]">AX Platform by 미래AI랩 · PILOT</p>
    </main>
  );
}
