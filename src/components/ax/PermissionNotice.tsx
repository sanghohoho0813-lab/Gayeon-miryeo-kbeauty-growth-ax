import { Lock } from "lucide-react";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export function PermissionNotice({ role, what }: { role: Role; what: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border bg-surface p-8 text-center" style={{ borderColor: "var(--border)" }}>
      <Lock size={26} className="mx-auto text-ink-soft" aria-hidden />
      <p className="mt-3 text-[1.1rem] font-bold">{what}은(는) 대표·관리자 권한입니다</p>
      <p className="mt-1 text-[0.92rem] text-ink-soft">현재 역할: {ROLE_LABEL[role]}. Live에서는 데이터베이스 RLS가 같은 규칙으로 차단합니다.</p>
    </div>
  );
}
