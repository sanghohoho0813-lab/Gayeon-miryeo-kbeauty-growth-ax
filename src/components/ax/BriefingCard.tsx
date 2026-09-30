"use client";

import Link from "next/link";
import { ChevronRight, Newspaper } from "lucide-react";
import { DataCard, StatusBadge, type Tone } from "./Cards";
import { AiReadyButton, AI_SPECS } from "./AiReady";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { buildBriefing, type BriefTone } from "@/lib/briefing";

const TONE: Record<BriefTone, Tone> = { risk: "danger", warn: "warning", good: "success", info: "neutral" };

/** 대표자용 브리핑 — RULE 요약 (대시보드·주간 리포트) */
export function BriefingCard({ compact = false }: { compact?: boolean }) {
  const m = useModel();
  const { role } = useSession();
  const b = buildBriefing(m, { financial: can(role, "view_financials") });
  return (
    <DataCard
      title={<span className="flex items-center gap-2"><Newspaper size={19} style={{ color: "var(--primary)" }} aria-hidden /> {can(role, "view_financials") ? "대표 브리핑" : "운영 브리핑"}</span>}
      action={!compact && <div className="flex items-center gap-2" data-print="hide"><StatusBadge tone="neutral">RULE 요약</StatusBadge><AiReadyButton spec={AI_SPECS.report} /></div>}
      tourId="briefing"
    >
      <p className="text-[1.05rem] font-bold leading-snug" data-testid="briefing-headline">{b.headline}</p>
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
