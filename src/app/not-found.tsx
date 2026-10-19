import Link from "next/link";

/* 없는 주소 (PASS 28, D-088) — 영어 기본 404 대신 한국어 */
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 pb-16 pt-[14vh] text-center" data-testid="not-found">
      <p className="text-[0.8rem] font-bold tracking-[0.14em] text-ink-soft">404</p>
      <h1 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.02em]">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">주소가 바뀌었거나 잘못 입력되었을 수 있습니다.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link className="btn-primary" href="/">처음 화면</Link>
        <Link className="btn-secondary" href="/beauty">MIRYEO AI Beauty</Link>
      </div>
    </main>
  );
}
