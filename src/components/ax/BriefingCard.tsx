"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Newspaper, Sparkles } from "lucide-react";
import { DataCard, StatusBadge, type Tone } from "./Cards";
import { AiReadyButton, AI_SPECS } from "./AiReady";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { buildBriefing, type BriefTone } from "@/lib/briefing";
import { AI_BRIEFING_UI, isLive } from "@/lib/config";
import { getSupabase } from "@/lib/data/supabase";

const TONE: Record<BriefTone, Tone> = { risk: "danger", warn: "warning", good: "success", info: "neutral" };

/** 대표자용 브리핑 — RULE 요약 (대시보드·주간 리포트) */
export function BriefingCard({ compact = false }: { compact?: boolean }) {
  const m = useModel();
  const { role } = useSession();
  const b = buildBriefing(m, { financial: can(role, "view_financials") });
  const [ai, setAi] = useState<{ text?: string; note?: string; busy?: boolean }>({});
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
      title={<span className="flex items-center gap-2"><Newspaper size={19} style={{ color: "var(--primary)" }} aria-hidden /> {can(role, "view_financials") ? "대표 브리핑" : "운영 브리핑"}</span>}
      action={!compact && <div className="flex items-center gap-2" data-print="hide"><StatusBadge tone="neutral">RULE 요약</StatusBadge><AiReadyButton spec={AI_SPECS.report} /></div>}
      tourId="briefing"
    >
      <p className="text-[1.05rem] font-bold leading-snug" data-testid="briefing-headline">{b.headline}</p>
      {aiAllowed && (
        <div className="mt-3 rounded-xl p-3.5" style={{ background: "var(--primary-soft)" }} data-print="hide">
          {ai.text ? <p className="text-[0.95rem] leading-relaxed" data-testid="briefing-ai">{ai.text}</p> : null}
          {ai.note && <p className="mt-1 text-[0.78rem] text-ink-soft" data-testid="briefing-ai-note">{ai.note}</p>}
          {!ai.text && <button className="btn-secondary mt-1 !min-h-[38px] text-[0.85rem]" disabled={ai.busy || b.lines.length === 0} onClick={runAi}><Sparkles size={15} aria-hidden /> {ai.busy ? "요약 중…" : "AI 문장으로 요약"}</button>}
        </div>
      )}
      <ul className="mt-3 space-y-1.5" data-testid="briefing-lines">
        {b.lines.map((l) => (
          <li key={l.topic + l.text} className="flex items-start gap-2.5 text-[0.93rem]">
            <span className="mt-0.5 shrink-0"><StatusBadge tone={TONE[l.tone]}>{l.topic}</StatusBadge></span>
            {l.href && !compact ? (
              <Link href={l.href} className="group inline-flex items-start gap-0.5 hover:underline">{l.text}<ChevronRight size={15} className="mt-1 shrink-0 text-ink-soft" aria-hidden /></Link>
            ) : <span>{l.text}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.78rem] text-ink-soft">시스템에 기록된 숫자로만 만든 요약입니다 (근거 없는 문장 없음). 문장 자연화(LLM)는 승인 시 연결합니다.</p>
    </DataCard>
  );
}
