"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertOctagon, CheckCircle2, SearchCheck } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { useModel } from "@/components/providers/DataProvider";
import { checkDataQuality } from "@/lib/data-quality";
import { isLive } from "@/lib/config";

export function DataQualityCard() {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const [busy, setBusy] = useState(false);
  const canFix = can(role, "edit_master");
  const issues = checkDataQuality(m.snapshot, m.today, { allowPractice: !isLive });
  const fix = async (label: string, ids: string[]) => {
    if (!window.confirm(`${label}할까요? 지운 판매는 되돌릴 수 없습니다. (필요하면 먼저 내보내기 탭에서 판매기록을 받아 두세요)`)) return;
    setBusy(true);
    try { const n = await run((s) => s.deleteSales(ids)); toast(`판매 ${n}건을 삭제했습니다`); }
    catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
    finally { setBusy(false); }
  };
  const errors = issues.filter((i) => i.level === "오류").length;
  return (
    <DataCard title={<span className="inline-flex items-center gap-2"><SearchCheck size={18} aria-hidden /> 데이터 품질 점검</span>}>
      <div data-testid="data-quality" data-errors={errors} data-checks={issues.length}>
        <p className="text-[0.88rem] text-ink-soft">입력된 상품·판매·재고·정산을 자동으로 훑어 계산이 틀어질 수 있는 값을 찾습니다. 값을 자동으로 바꾸지 않고 고칠 화면을 알려줍니다. 미래 날짜·중복 판매만 확인을 거쳐 이 화면에서 삭제할 수 있습니다.</p>
        <p className="mt-2 text-[0.95rem] font-bold">{issues.length === 0 ? "발견된 문제 없음" : `오류 ${errors}종 · 확인 ${issues.length - errors}종`}</p>
        {issues.length === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[0.9rem]" style={{ color: "var(--success)" }}><CheckCircle2 size={17} aria-hidden /> 점검 항목 11개 모두 통과</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {issues.map((i) => (
              <li key={i.id} className="rounded-xl border p-3" style={{ borderColor: i.level === "오류" ? "var(--danger)" : "var(--border)" }} data-issue={i.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-bold">{i.level === "오류" && <AlertOctagon size={16} aria-hidden style={{ color: "var(--danger)" }} />}<StatusBadge tone={i.level === "오류" ? "danger" : "warning"}>{i.level}</StatusBadge><span className="break-any">{i.title}</span> <span className="tabular font-normal text-ink-soft">{i.count.toLocaleString()}건</span></span>
                  <Link href={i.href} className="text-[0.82rem] font-semibold underline" style={{ color: "var(--primary)" }} aria-label={`고치러 가기: ${i.title}`}>고치러 가기</Link>
                </div>
                <p className="mt-1 text-[0.84rem] text-ink-soft">{i.why}</p>
                <p className="break-any mt-1 text-[0.82rem]">예: {i.samples.join(" · ")}{i.count > i.samples.length ? ` 외 ${(i.count - i.samples.length).toLocaleString()}건` : ""}</p>
                {i.fix && i.fix.rowIds.length > 0 && canFix && <button className="btn-secondary mt-2 !min-h-[36px] text-[0.82rem]" disabled={busy} onClick={() => void fix(i.fix!.label, i.fix!.rowIds)} data-fix={i.id}>{i.fix.label}</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DataCard>
  );
}
