import Link from "next/link";

export function BeautyFooter() {
  return (
    <footer style={{ background: "var(--b-navy)" }} className="mt-8 text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-display text-[1.4rem] font-bold">MIRYEO</div>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-white/65">
              AI가 이해하는 나의 피부.
              <br />
              MIRYEO가 제안하는 나만의 아름다움.
            </p>
          </div>
          <div className="text-[0.92rem]">
            <div className="mb-2.5 font-semibold text-white/85">바로가기</div>
            <ul className="space-y-1.5 text-white/60">
              <li><Link href="/beauty/finder" className="hover:text-white">AI 뷰티 파인더</Link></li>
              <li><Link href="/beauty/products" className="hover:text-white">제품 둘러보기</Link></li>
              <li><Link href="/beauty/passport" className="hover:text-white">뷰티 패스포트</Link></li>
            </ul>
          </div>
          <div className="text-[0.92rem]">
            <div className="mb-2.5 font-semibold text-white/85">MIRYEO 약속</div>
            <ul className="space-y-1.5 text-white/60">
              <li>AI 기반 피부 데이터 분석</li>
              <li>클린 &amp; 안전한 성분 기준</li>
              <li>지속 가능한 아름다움</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 text-[0.8rem] text-white/45 md:flex-row">
          <span>© 2025 가연인터내셔널 · MIRYEO. Demo MVP — 표시 정보는 데모 데이터입니다.</span>
          <span>AX Platform by 미래AI랩</span>
        </div>
      </div>
    </footer>
  );
}
