import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";

/* 루트 포털 — 내부 운영 시스템과 고객 플랫폼 진입점 분리 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7f5f0] px-6 py-16">
      <p className="text-[0.95rem] font-semibold tracking-[0.25em] text-[#8a8264]">
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

      <p className="mt-12 text-[0.82rem] text-[#9a927c]">AX Platform by 미래AI랩 · Demo Data 기반 MVP</p>
    </main>
  );
}
