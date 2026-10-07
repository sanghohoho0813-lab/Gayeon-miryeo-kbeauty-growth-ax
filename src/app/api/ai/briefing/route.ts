import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { ungroundedNumbers, validateBriefInput } from "@/lib/ai/grounding";

/* 대표 브리핑 AI 문장화 (계약 별지 제1호 ④ "대표자용 요약") — 기본 꺼짐.
   켜는 조건(서버 환경변수): AI_BRIEFING_ENABLED=true + Anthropic 자격증명(ANTHROPIC_API_KEY 등).
   입력은 RULE 브리핑 문장(시스템 기록 숫자)뿐이며 고객 개인정보를 보내지 않는다.
   출력의 숫자가 입력에 없으면 버리고 RULE 요약을 유지한다. 외부 AI 사용료는 고객사 부담(계약 제16조). */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5-5";
const HOURLY_LIMIT = 20;
const hits = new Map<string, number[]>();

const SYSTEM = `당신은 화장품 브랜드 MIRYEO를 운영하는 가연인터내셔널의 대표에게 오늘의 운영 현황을 보고합니다.
사용자가 보내는 '기록된 사실' 목록만 근거로, 대표가 30초 안에 읽을 수 있는 한국어 문단 하나(3~5문장)를 쓰세요.
- 목록에 없는 숫자, 사실, 원인 추정, 전망은 쓰지 않습니다. 숫자는 목록의 표기 그대로 옮깁니다.
- 위험(미수금 연체, 재고 부족, 판매 부진)이 있으면 그것부터 말합니다.
- 마지막 문장은 목록에 근거한 오늘의 우선 행동 하나를 제안합니다.
- 제목, 글머리표, 마크다운 없이 평문으로 씁니다.`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function authorize(req: Request): Promise<{ key: string } | Response> {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "live") {
    // Demo 공개 주소에서 누구나 비용을 발생시키지 않도록 명시적으로 허용할 때만
    if (process.env.AI_BRIEFING_ALLOW_DEMO !== "true") return json({ error: "DEMO_DISABLED", message: "Demo 모드에서는 AI 요약을 쓰지 않습니다." }, 403);
    return { key: `demo:${req.headers.get("x-forwarded-for") ?? "local"}` };
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return json({ error: "NO_TOKEN", message: "로그인이 필요합니다." }, 401);
  const sb = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return json({ error: "INVALID_TOKEN", message: "세션이 만료되었습니다." }, 401);
  const m = await sb.from("organization_members").select("organization_id, role").eq("user_id", data.user.id).limit(1);
  const row = m.data?.[0];
  if (!row || !["OWNER", "ADMIN"].includes(row.role)) return json({ error: "FORBIDDEN", message: "대표·관리자만 사용할 수 있습니다." }, 403);
  return { key: `org:${row.organization_id}` };
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= HOURLY_LIMIT) { hits.set(key, list); return true; }
  list.push(now);
  hits.set(key, list);
  return false;
}

export async function POST(req: Request) {
  if (process.env.AI_BRIEFING_ENABLED !== "true") return json({ error: "AI_DISABLED", message: "AI 요약이 꺼져 있습니다 (READY)." }, 503);
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;
  if (rateLimited(auth.key)) return json({ error: "RATE_LIMIT", message: `시간당 ${HOURLY_LIMIT}회까지 사용할 수 있습니다.` }, 429);
  const lines = validateBriefInput(await req.json().catch(() => null));
  if (typeof lines === "string") return json({ error: "BAD_INPUT", message: lines }, 400);

  const facts = lines.map((l) => `- [${l.topic}] ${l.text}`).join("\n");
  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `기록된 사실:\n${facts}` }],
    });
    if (res.stop_reason === "refusal") return json({ error: "REFUSED", message: "AI가 요약을 거절해 규칙 요약을 유지합니다." }, 422);
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    if (!text) return json({ error: "EMPTY", message: "AI 응답이 비어 있습니다." }, 502);
    const bad = ungroundedNumbers(text, lines.map((l) => l.text));
    if (bad.length) return json({ error: "UNGROUNDED", message: `기록에 없는 숫자(${bad.join(", ")})가 포함되어 사용하지 않았습니다.` }, 422);
    return json({ text, model: res.model, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "AI_KEY_INVALID", message: "AI 자격증명이 유효하지 않습니다." }, 503);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "AI_RATE_LIMIT", message: "AI 사용량 한도에 걸렸습니다. 잠시 후 다시 시도하세요." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "AI_ERROR", message: `AI 호출 실패 (${e.status ?? "network"})` }, 502);
    throw e;
  }
}
