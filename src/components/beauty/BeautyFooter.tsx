import Link from "next/link";

/* 푸터 — 꽉 찬 잉크 블록 대신 아이보리 + 구분선 (D-073). 모바일은 하단 탭 높이만큼 여백 */
export function BeautyFooter() {
  return (
    <footer className="mt-16 border-t pb-24 md:pb-0" style={{ borderColor: "var(--b-line)" }}>
      <div className="mx-auto w-full max-w-[1240px] px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1.4fr]">
          <div>
            <div className="b-serif text-[1.35rem] font-bold tracking-[0.08em]" style={{ color: "var(--b-ink)" }}>MIRYEO</div>
            <p className="b-body mt-2">피부 고민에서 시작하는 루틴 추천.<br />MIRYEO AI Beauty</p>
          </div>
          <div className="text-[0.9rem]">
            <div className="b-eyebrow mb-3">Menu</div>
            <ul className="space-y-1" style={{ color: "var(--b-text-soft)" }}>
              <li><Link href="/beauty/finder" className="inline-flex min-h-[36px] items-center hover:underline">AI 뷰티 파인더</Link></li>
              <li><Link href="/beauty/products" className="inline-flex min-h-[36px] items-center hover:underline">제품 둘러보기</Link></li>
              <li><Link href="/beauty/passport" className="inline-flex min-h-[36px] items-center hover:underline">뷰티 패스포트</Link></li>
            </ul>
          </div>
          <div className="text-[0.86rem]">
            <div className="b-eyebrow mb-3">Notice</div>
            <ul className="space-y-2 leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
              <li>추천은 선택한 고민·사용감 기준이며 의학적 진단이 아닙니다</li>
              <li>비회원은 익명으로 이용 · 회원 정보는 동의한 범위에서만 사용됩니다</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t pt-6 text-[0.78rem] md:flex-row" style={{ borderColor: "var(--b-line)", color: "var(--b-text-soft)" }}>
          <span>© {new Date().getFullYear()} MIRYEO · 가연인터내셔널</span>
          <span>Technology by 미래AI랩</span>
        </div>
      </div>
    </footer>
  );
}
