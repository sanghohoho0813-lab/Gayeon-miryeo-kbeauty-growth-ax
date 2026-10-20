/* 한글 검색 도우미 — 빠른 이동(⌘K)·상품 목록 검색 공용 (PASS 30)
   공백·대소문자 무시, 초성만 입력하면 초성으로 비교: "ㅈㄱ" → 재고, "ㅇㅍ" → 앰플 */
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export function chosung(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0) - 0xac00;
    out += c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch;
  }
  return out;
}
export const normQuery = (s: string) => s.toLowerCase().replace(/\s+/g, "");
export const isChosungQuery = (s: string) => s.length > 0 && [...s].every((c) => CHO.includes(c));

/** 여러 글자 묶음 중 하나라도 검색어를 포함하면 true (초성 검색어면 각 묶음의 초성과 비교) */
export function matchesQuery(q: string, ...texts: (string | undefined | null)[]): boolean {
  const nq = normQuery(q);
  if (!nq) return true;
  const cho = isChosungQuery(nq);
  return texts.some((t) => {
    if (!t) return false;
    const nt = normQuery(t);
    return nt.includes(nq) || (cho && normQuery(chosung(t)).includes(nq));
  });
}
