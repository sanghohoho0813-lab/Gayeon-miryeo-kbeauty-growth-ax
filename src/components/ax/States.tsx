"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Database, Inbox, RefreshCw } from "lucide-react";

export function EmptyState({ title, desc, action, icon }: { title: string; desc?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center" style={{ borderColor: "var(--border)" }}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-ink-soft" aria-hidden>{icon ?? <Inbox size={22} />}</span>
      <p className="mt-3 text-[1.02rem] font-bold">{title}</p>
      {desc && <p className="mt-1 max-w-md text-[0.9rem] leading-relaxed text-ink-soft">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "데이터를 불러오지 못했습니다", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-2xl border p-8 text-center" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }} role="alert">
      <AlertTriangle size={28} className="mx-auto" style={{ color: "var(--danger)" }} aria-hidden />
      <p className="mt-3 text-[1.1rem] font-bold">{title}</p>
      {message && <p className="mt-2 break-any font-mono text-[0.82rem] text-ink-soft">{message}</p>}
      <p className="mt-2 text-[0.88rem] text-ink-soft">Live 모드에서는 오류 시 Demo 숫자로 대체하지 않습니다.</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden /> 다시 시도
        </button>
      )}
    </div>
  );
}

export function LoadingState() {
  // 네트워크 오류 시 supabase-js가 자동 재시도(수 초)하므로, 길어지면 상황을 알려준다
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 5000); return () => clearTimeout(t); }, []);
  return (
    <div className="space-y-5" aria-busy="true" aria-label="불러오는 중">
      {slow && <p className="rounded-xl bg-surface-muted px-4 py-3 text-[0.9rem] text-ink-soft" role="status">데이터 연결이 지연되고 있습니다. 자동으로 다시 시도하는 중입니다…</p>}
      <div className="h-9 w-72 animate-pulse rounded-xl bg-surface-muted" />
      <div className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface-muted" />)}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}

export function ConfigErrorState() {
  return (
    <div className="mx-auto mt-20 max-w-xl rounded-2xl border bg-surface p-8" style={{ borderColor: "var(--border)" }}>
      <Database size={28} style={{ color: "var(--warning)" }} aria-hidden />
      <h1 className="mt-3 text-[1.3rem] font-bold">Live 모드 설정이 필요합니다</h1>
      <p className="mt-2 leading-relaxed text-ink-soft">
        <code>NEXT_PUBLIC_DATA_MODE=live</code>로 실행되었지만 Supabase 환경변수가 없습니다. Demo 데이터로 대체하지 않습니다.
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-[0.95rem]">
        <li><code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 설정</li>
        <li>또는 시연용으로 <code>NEXT_PUBLIC_DATA_MODE=demo</code></li>
      </ol>
      <p className="mt-4 text-[0.9rem] text-ink-soft">자세한 절차: 저장소의 SETUP.md</p>
      <Link href="/" className="btn-secondary mt-5">처음으로</Link>
    </div>
  );
}
