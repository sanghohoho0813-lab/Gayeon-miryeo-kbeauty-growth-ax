import Link from "next/link";

export function BeautyFooter() {
  return (
    <footer style={{ background: "var(--b-navy)" }} className="mt-8 text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-display text-[1.4rem] font-bold">MIRYEO</div>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-white/70">피부 고민에서 시작하는 루틴 추천.<br />MIRYEO AI Beauty</p>
          </div>
          <div className="text-[0.92rem]">
            <div className="mb-2.5 font-semibold text-white/90">바로가기</div>
            <ul className="space-y-1.5 text-white/70">
              <li><Link href="/beauty/finder" className="hover:text-white">AI 뷰티 파인더</Link></li>
              <li><Link href="/beauty/products" className="hover:text-white">제품 둘러보기</Link></li>
              <li><Link href="/beauty/passport" className="hover:text-white">뷰티 패스포트</Link></li>
            </ul>
          </div>
          <div className="text-[0.92rem]">
            <div className="mb-2.5 font-semibold text-white/90">안내</div>
            <ul className="space-y-1.5 text-white/70">
              <li>추천은 선택한 고민·사용감 기준이며 의학적 진단이 아닙니다</li>
              <li>비회원은 익명으로 이용 · 회원 정보는 동의한 범위에서만 사용됩니다</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 text-[0.8rem] text-white/55 md:flex-row">
          <span>© {new Date().getFullYear()} MIRYEO · 가연인터내셔널</span>
          <span>AX Platform by 미래AI랩</span>
        </div>
      </div>
    </footer>
  );
}
