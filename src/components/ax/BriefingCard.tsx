"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Copy, Newspaper, Sparkles } from "lucide-react";
import { DataCard, StatusBadge, type Tone } from "./Cards";
import { AiReadyButton, AI_SPECS } from "./AiReady";
import { toast } from "./Toast";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { briefingText, buildBriefing, type BriefTone } from "@/lib/briefing";
import { copyText } from "@/lib/clipboard";
import { AI_BRIEFING_UI, isLive } from "@/lib/config";
import { getSupabase } from "@/lib/data/supabase";

const TONE: Record<BriefTone, Tone> = { risk: "danger", warn: "warning", good: "success", info: "neutral" };

/** 대표자용 브리핑 — RULE 요약 (대시보드·주간 리포트) */
/** limit: 접힌 상태에서 보일 줄 수 — 위험·주의 문장을 먼저 고르고 원래 순서로 표시, '전체 보기'로 펼침 */
export function BriefingCard({ compact = false, limit }: { compact?: boolean; limit?: number }) {
  const m = useModel();
  const { role } = useSession();
  const b = buildBriefing(m, { financial: can(role, "view_financials") });
  const [ai, setAi] = useState<{ text?: string; note?: string; busy?: boolean }>({});
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = can(role, "view_financials") ? "대표 브리핑" : "운영 브리핑";
  // 메신저로 보내기 — 접힌 상태여도 전체 문장을 복사
  const copy = async () => {
    const ok = await copyText(briefingText(b, { title, orgName: m.snapshot.org.name, today: m.today, demo: !isLive }));
    if (!ok) { toast("복사하지 못했습니다. 문장을 길게 눌러 직접 복사해 주세요", "error"); return; }
    setCopied(true);
    toast("브리핑을 복사했습니다 — 메신저·메일에 붙여 넣으세요");
    window.setTimeout(() => setCopied(false), 2500);
  };
  const collapsible = !!limit && b.lines.length > limit;
  const shown = !collapsible || expanded ? b.lines : (() => {
    const rank = (t: BriefTone) => (t === "risk" ? 0 : t === "warn" ? 1 : 2);
    const keep = new Set([...b.lines].map((l, i) => ({ l, i })).sort((x, y) => rank(x.l.tone) - rank(y.l.tone) || x.i - y.i).slice(0, limit).map((x) => x.i));
    return b.lines.filter((_, i) => keep.has(i));
  })();
  const aiAllowed = AI_BRIEFING_UI && can(role, "view_financials") && !compact;
  const runAi = async () => {
    setAi({ busy: true });
    try {
      const token = isLive ? (await getSupabase()?.auth.getSession())?.data.session?.access_token : undefined;
      const res = await fetch("/api/ai/briefing", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ lines: b.lines.map((l) => ({ topic: l.topic, text: l.text })) }) });
      const data = (await res.json().catch(() => ({}))) as { text?: string; message?: string; model?: string };
      setAi(res.ok && data.text ? { text: data.text, note: `Claude 요약 (${data.model ?? ""}) · 숫자 검증 통과 · 근거는 아래 RULE 문장` } : { note: data.message ?? "AI 요약을 만들지 못해 규칙 요약을 유지합니다." });
    } catch {
      setAi({ note: "AI 요약을 만들지 못해 규칙 요약을 유지합니다." });
    }
  };
  return (
    <DataCard
      title={<span className="flex items-center gap-2"><Newspaper size={19} style={{ color: "var(--primary)" }} aria-hidden /> {title}</span>}
      action={!compact && (
        <div className="flex flex-wrap items-center gap-2" data-print="hide">
          <StatusBadge tone="neutral">RULE 요약</StatusBadge>
          <button className="btn-ghost !min-h-[36px] !px-2.5 text-[0.82rem]" onClick={() => void copy()} disabled={b.lines.length === 0} data-testid="briefing-copy" title="메신저·메일에 붙여 넣을 글로 복사">
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "복사됨" : "글 복사"}
          </button>
          <AiReadyButton spec={AI_SPECS.report} />
        </div>
      )}
      tourId="briefing"
      id="briefing"
    >
      <p className="text-[1.05rem] font-bold leading-snug" data-testid="briefing-headline">{b.headline}</p>
      {aiAllowed && (
        <div className="mt-3 rounded-xl p-3.5" style={{ background: "var(--primary-soft)" }} data-print="hide">
          {ai.text ? <p className="text-[0.95rem] leading-relaxed" data-testid="briefing-ai">{ai.text}</p> : null}
          {ai.note && <p className="mt-1 text-[0.78rem] text-ink-soft" data-testid="briefing-ai-note">{ai.note}</p>}
          {!ai.text && <button className="btn-secondary mt-1 !min-h-[38px] text-[0.85rem]" disabled={ai.busy || b.lines.length === 0} onClick={runAi}><Sparkles size={15} aria-hidden /> {ai.busy ? "요약 중…" : "AI 문장으로 요약"}</button>}
        </div>
      )}
      <ul className="mt-3 space-y-1.5" data-testid="briefing-lines" id="briefing-lines">
        {shown.map((l) => (
          <li key={l.topic + l.text} className="flex items-start gap-2.5 text-[0.93rem]">
            <span className="mt-0.5 shrink-0"><StatusBadge tone={TONE[l.tone]}>{l.topic}</StatusBadge></span>
            {l.href && !compact ? (
              <Link href={l.href} className="group inline-flex items-start gap-0.5 hover:underline">{l.text}<ChevronRight size={15} className="mt-1 shrink-0 text-ink-soft" aria-hidden /></Link>
            ) : <span>{l.text}</span>}
          </li>
        ))}
      </ul>
      {collapsible && (
        <button className="mt-2 inline-flex min-h-[40px] items-center gap-1 rounded-lg px-1.5 text-[0.88rem] font-semibold text-ink-soft hover:bg-surface-muted hover:text-ink" aria-expanded={expanded} aria-controls="briefing-lines" onClick={() => setExpanded((v) => !v)} data-testid="briefing-toggle" data-print="hide">
          {expanded ? "중요한 문장만 보기" : `브리핑 전체 ${b.lines.length}줄 보기`} <ChevronRight size={15} className={expanded ? "-rotate-90" : "rotate-90"} aria-hidden />
        </button>
      )}
      <p className="mt-3 text-[0.78rem] text-ink-soft">시스템에 기록된 숫자로만 만든 요약입니다 (근거 없는 문장 없음). 문장 자연화(LLM)는 승인 시 연결합니다.</p>
    </DataCard>
  );
}
