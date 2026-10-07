/* AI 문장 검증 — 출력에 나온 숫자는 모두 입력(기록된 사실)에 있어야 한다.
   "4.0억"과 "4억"처럼 표기만 다른 같은 값은 허용, 1~3은 서술용("세 가지" 등)으로 허용. */
export function numbersIn(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => Number(t.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

export function ungroundedNumbers(output: string, inputs: string[]): number[] {
  const allowed = new Set(inputs.flatMap(numbersIn));
  return [...new Set(numbersIn(output))].filter((n) => !(n >= 1 && n <= 3 && Number.isInteger(n)) && !allowed.has(n));
}

export const BRIEF_TOPICS = ["매출", "이익", "성장", "부진", "재고", "미수금", "고객", "재구매", "실행", "실증"] as const;
export interface BriefInputLine { topic: string; text: string }

export function validateBriefInput(body: unknown): BriefInputLine[] | string {
  const lines = (body as { lines?: unknown })?.lines;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 12) return "lines: 1~12개";
  const out: BriefInputLine[] = [];
  for (const l of lines) {
    const topic = String((l as BriefInputLine)?.topic ?? "");
    const text = String((l as BriefInputLine)?.text ?? "").trim();
    if (!(BRIEF_TOPICS as readonly string[]).includes(topic)) return `알 수 없는 topic: ${topic}`;
    if (!text || text.length > 300) return "text: 1~300자";
    out.push({ topic, text });
  }
  return out;
}
