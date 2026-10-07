"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Copy, Info, RefreshCw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard } from "@/components/ax/Cards";
import { PermissionNotice } from "@/components/ax/PermissionNotice";
import { toast } from "@/components/ax/Toast";
import { useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { getSupabase } from "@/lib/data/supabase";
import { formatDateTimeKR } from "@/lib/date";
import { runReadiness, summarize, type Check, type CheckGroup, type CheckStatus, type ServerStatus } from "@/lib/readiness";

/* 공개 전 점검 — 시험버전(MVP 베타) 공개 직전에 대표·관리자가 한 번 누르는 화면 */
const GROUPS: CheckGroup[] = ["연결·설정", "데이터베이스", "보안 (로그인 안 한 사람)", "고객 화면", "서버·선택 기능", "직접 확인"];
const ICON: Record<CheckStatus, { C: typeof CheckCircle2; color: string; label: string }> = {
  ok: { C: CheckCircle2, color: "var(--success)", label: "정상" },
  warn: { C: AlertTriangle, color: "var(--warning)", label: "확인 필요" },
  fail: { C: XCircle, color: "var(--danger)", label: "문제" },
  info: { C: Info, color: "var(--text-secondary)", label: "참고" },
};

async function fetchServer(): Promise<ServerStatus | { error: string }> {
  const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  try {
    const res = await fetch("/api/system/status", { headers: token ? { authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    const body = await res.json();
    return res.ok ? (body as ServerStatus) : { error: body.message ?? `HTTP ${res.status}` };
  } catch {
    return { error: "서버에 연결하지 못했습니다" };
  }
}

export default function SystemCheckPage() {
  const { role, orgId } = useSession();
  const m = useModel();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const products = m.snapshot.products;

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const server = await fetchServer();
      setChecks(await runReadiness({ member: getSupabase(), memberOrgId: orgId, products, server, origin: window.location.origin }));
      setAt(new Date().toISOString());
    } catch (e) {
      toast(e instanceof Error ? e.message : "점검 실패", "error");
    } finally { setBusy(false); }
  }, [orgId, products]);

  const allowed = can(role, "edit_master");
  useEffect(() => { if (allowed && !checks && !busy) void run(); }, [allowed, checks, busy, run]);
  if (!allowed) return <PermissionNotice role={role} what="공개 전 점검" />;

  const s = checks ? summarize(checks) : null;
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="공개 전 점검"
        description="시험버전을 공개하기 전에 연결·데이터베이스·보안·고객 화면 설정을 자동으로 확인합니다. 키·비밀번호 값은 표시하지 않습니다."
        actions={<button className="btn-secondary" onClick={() => void run()} disabled={busy}><RefreshCw size={16} aria-hidden className={busy ? "animate-spin" : ""} /> {busy ? "점검 중…" : "다시 점검"}</button>}
      />
      {!isLive && <p className="mb-4 rounded-xl p-3 text-[0.9rem]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>DEMO 모드: 데이터베이스·보안 점검은 Live 연결 후 실행됩니다. 지금은 공개에 필요한 설정이 무엇인지 보여 줍니다.</p>}

      <DataCard>
        <div className="flex flex-wrap items-center justify-between gap-3" data-testid="readiness-summary" data-ready={s?.ready ? "1" : "0"}>
          <div>
            <div className="text-[0.85rem] font-semibold text-ink-soft">점검 결과{at && ` · ${formatDateTimeKR(at)}`}</div>
            <div className="mt-0.5 text-[1.35rem] font-bold">{!s ? "점검 중…" : s.ready && isLive ? "공개 가능 — 문제 없음" : s.fail ? `문제 ${s.fail}건 해결 필요` : "공개 전 Live 전환 필요"}</div>
          </div>
          {s && (
            <div className="flex flex-wrap gap-3 text-[0.9rem]">
              {(["ok", "warn", "fail", "info"] as const).map((k) => { const I = ICON[k]; return <span key={k} className="inline-flex items-center gap-1"><I.C size={16} style={{ color: I.color }} aria-hidden />{I.label} <b className="tabular">{s[k]}</b></span>; })}
            </div>
          )}
        </div>
        {isLive && orgId && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted p-3 text-[0.86rem]">
            <span className="font-semibold">내 조직 ID</span>
            <code className="break-all" data-testid="org-id">{orgId}</code>
            <button className="btn-ghost !min-h-[34px] text-[0.82rem]" onClick={() => { void navigator.clipboard?.writeText(orgId).then(() => toast("조직 ID를 복사했습니다"), () => toast("복사하지 못했습니다", "error")); }}><Copy size={14} aria-hidden /> 복사</button>
            <span className="text-ink-soft">→ Vercel 환경변수 NEXT_PUBLIC_MIRYEO_ORG_ID</span>
          </div>
        )}
      </DataCard>

      {checks && GROUPS.map((g) => {
        const list = checks.filter((c) => c.group === g);
        if (!list.length) return null;
        return (
          <section key={g} className="mt-6">
            <h2 className="mb-2 text-[1.05rem] font-bold">{g}</h2>
            <ul className="space-y-2">
              {list.map((c) => {
                const I = ICON[c.status];
                return (
                  <li key={c.id} data-check={c.id} data-status={c.status} className="ax-card flex items-start gap-3 p-4">
                    <I.C size={22} className="mt-0.5 shrink-0" style={{ color: I.color }} aria-label={I.label} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{c.label}</div>
                      <p className="break-any mt-0.5 text-[0.88rem]">{c.detail}</p>
                      {c.fix && c.status !== "ok" && <p className="mt-1 text-[0.84rem] text-ink-soft">해결: {c.fix}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="mt-6 text-[0.84rem] text-ink-soft">설치 순서는 SETUP.md §B, 새 Supabase 프로젝트는 <code>supabase/setup_all.sql</code> 한 번 실행으로 데이터베이스가 준비됩니다. 실제 자료 입력 순서는 <Link className="underline" href="/ax/start">시작 가이드</Link>를 보세요.</p>
    </div>
  );
}
