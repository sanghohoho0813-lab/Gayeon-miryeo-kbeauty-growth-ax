"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useData } from "@/components/providers/DataProvider";
import { ConfigErrorState, ErrorState, LoadingState } from "./States";
import { getSupabase } from "@/lib/data/supabase";

/* Live 인증/조직/로드 상태 게이트. Demo는 즉시 통과. */
export function AxGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const { status, error, refresh } = useData();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "signed_out") router.replace("/login");
  }, [session.status, router]);

  if (session.status === "misconfigured") return <ConfigErrorState />;
  if (session.status === "error") return <ErrorState title="조직 정보를 확인하지 못했습니다" message={session.error} onRetry={session.refreshMembership} />;
  if (session.status === "no_org") return <OrgOnboarding onDone={session.refreshMembership} />;
  if (session.status !== "ready" || status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error} onRetry={refresh} />;
  return <>{children}</>;
}

function OrgOnboarding({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("가연인터내셔널");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  return (
    <div className="mx-auto mt-16 max-w-lg ax-card p-7">
      <Building2 size={28} style={{ color: "var(--primary)" }} aria-hidden />
      <h1 className="mt-3 text-[1.3rem] font-bold">조직 만들기 (최초 1회)</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">로그인한 계정이 아직 조직에 속해 있지 않습니다. 조직을 만들면 이 계정이 OWNER(대표)가 됩니다.</p>
      <label className="field-label mt-5" htmlFor="org-name">조직 이름</label>
      <input id="org-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
      {err && <p className="mt-2 text-[0.88rem]" style={{ color: "var(--danger)" }}>{err}</p>}
      <button
        className="btn-primary mt-4 w-full"
        disabled={busy || !name.trim()}
        onClick={async () => {
          setBusy(true);
          setErr(undefined);
          const { error } = await getSupabase()!.rpc("bootstrap_organization", { org_name: name.trim() });
          setBusy(false);
          if (error) setErr(error.message);
          else onDone();
        }}
      >
        {busy ? "생성 중…" : "조직 만들고 시작하기"}
      </button>
    </div>
  );
}
