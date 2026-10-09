"use client";

import { useMemo, useState } from "react";
import { DatabaseBackup, FileUp } from "lucide-react";
import { DataCard, StatusBadge } from "./Cards";
import { toast } from "./Toast";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/config";
import { todayISO } from "@/lib/date";
import { applyTransfer, buildTransfer, parseTransfer, planTransfer, type TransferFile, type TransferPlan } from "@/lib/transfer";

/* 작업 데이터 백업·이관 — Supabase 연결 전(Demo 주소)에 입력한 실데이터를 파일로 받아 두고, Live 전환 후 한 번에 옮긴다.
   같은 파일로 Demo 브라우저 데이터를 복원할 수도 있다. 고객 개인정보는 포함하지 않는다. */
export function TransferCard() {
  const m = useModel();
  const { run } = useData();
  const { role } = useSession();
  const [file, setFile] = useState<{ name: string; data: TransferFile; errors: string[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const canExport = can(role, "view_financials");
  const canImport = can(role, "manage_org");
  const { summary } = buildTransfer(m.snapshot, isLive ? "live" : "demo");
  const plan: TransferPlan | null = useMemo(() => (file ? planTransfer(file.data, m.snapshot) : null), [file, m.snapshot]);
  const hasReal = summary.products + summary.sales + summary.settlements > 0;

  const download = () => {
    const { file: f } = buildTransfer(m.snapshot, isLive ? "live" : "demo");
    const blob = new Blob([JSON.stringify(f)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miryeo_transfer_${todayISO()}${isLive ? "" : "_DEMO"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast("파일이 너무 큽니다 (50MB 초과)", "error"); return; }
    const parsed = parseTransfer(await f.text());
    if ("fatal" in parsed) { toast(parsed.fatal, "error"); setFile(null); return; }
    setFile({ name: f.name, data: parsed.file, errors: parsed.errors });
  };

  const apply = async () => {
    if (!plan) return;
    setBusy("시작");
    try {
      await run((s) => applyTransfer(plan, s, (l) => setBusy(l)));
      toast(`가져왔습니다 — 상품 ${plan.products.create.length} · 채널 ${plan.channels.create.length} · 판매 ${plan.sales.create.length.toLocaleString()} · 정산 ${plan.settlements.create.length}`);
      setFile(null);
    } catch (e) {
      toast(`${e instanceof Error ? e.message : "가져오기 실패"} — 다시 가져오면 이미 들어간 항목은 건너뜁니다`, "error");
    } finally { setBusy(null); }
  };

  return (
    <DataCard title="작업 데이터 백업 · 이관" className="mt-6" id="transfer">
      <div data-testid="transfer-card">
        <p className="text-[0.88rem] text-ink-soft">
          {isLive
            ? "Supabase 연결 전(Demo 주소)에 입력해 둔 실데이터 백업 파일을 여기서 한 번에 가져옵니다. 운영 데이터 백업 파일도 받을 수 있습니다."
            : "Demo 주소에서 입력한 실데이터는 이 브라우저에만 저장됩니다. 백업 파일을 받아 두면 브라우저 데이터가 지워져도 복원할 수 있고, Supabase 연결 후 다시 입력하지 않고 그대로 옮길 수 있습니다."}
        </p>
        <p className="mt-1 text-[0.8rem] text-ink-soft">포함: 채널·상품·재고·판매·정산, Pilot 시작일·AX OWNER (Demo 시드 제외). 제외: 고객 개인정보·고객 행동·Action/Proof 이력·Baseline(운영 환경에서 다시 잠금).</p>

        <div className="mt-3 grid gap-3 @3xl:grid-cols-2">
          <div className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 font-semibold"><DatabaseBackup size={17} aria-hidden /> 백업 파일 받기</div>
            <p className="mt-1 text-[0.84rem] tabular" data-testid="transfer-summary">실데이터: 상품 {summary.products} · 채널 {summary.channels} · 재고 {summary.inventory} · 판매 {summary.sales.toLocaleString()} · 정산 {summary.settlements}{summary.skippedDemoSales ? ` (Demo 상품 판매 ${summary.skippedDemoSales.toLocaleString()}건 제외)` : ""}</p>
            <button className="btn-secondary mt-2 !min-h-[40px] text-[0.86rem]" disabled={!canExport || !hasReal} onClick={download} data-testid="transfer-download">백업 파일(.json) 받기</button>
            {!canExport && <p className="mt-1 text-[0.78rem] text-ink-soft">대표·관리자 권한</p>}
            {canExport && !hasReal && <p className="mt-1 text-[0.78rem] text-ink-soft">아직 직접 입력한 실데이터가 없습니다.</p>}
          </div>

          <div className="rounded-xl border p-3.5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 font-semibold"><FileUp size={17} aria-hidden /> 백업 파일 가져오기</div>
            {canImport ? (
              <label className="mt-2 flex min-h-[64px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-3 text-center text-[0.86rem] hover:bg-surface-muted" style={{ borderColor: "var(--border)" }}>
                <span className="break-all">{file?.name ?? "miryeo_transfer_….json 선택"}</span>
                <input data-testid="transfer-file" type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            ) : <p className="mt-1 text-[0.84rem] text-ink-soft">대표(OWNER)만 가져올 수 있습니다.</p>}
          </div>
        </div>

        {file && plan && (
          <div className="mt-4 rounded-xl bg-surface-muted p-3.5" data-testid="transfer-plan">
            <h3 className="text-[0.95rem] font-bold">가져오기 미리보기 <span className="font-normal text-ink-soft">— {file.data.orgName || "이름 없음"} · {file.data.fromMode === "demo" ? "Demo 주소에서" : "운영에서"} 백업 · {file.data.exportedAt.slice(0, 10)}</span></h3>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.86rem] tabular @xl:grid-cols-3">
              <li>상품 <b>새로 {plan.products.create.length}</b> · 이미 있음 {plan.products.matched}</li>
              <li>채널 <b>새로 {plan.channels.create.length}</b> · 이미 있음 {plan.channels.matched}</li>
              <li>재고 <b>{plan.inventory.length}</b></li>
              <li>판매 <b>새로 {plan.sales.create.length.toLocaleString()}</b> · 중복 {plan.sales.duplicate.toLocaleString()}</li>
              <li>정산 <b>새로 {plan.settlements.create.length}</b> · 이미 있음 {plan.settlements.matched}</li>
              <li>설정 {Object.keys(plan.org).length ? Object.keys(plan.org).map((k) => (k === "pilotStartedOn" ? "Pilot 시작일" : "AX OWNER")).join("·") : "변경 없음"}</li>
            </ul>
            <p className="mt-2 text-[0.8rem] text-ink-soft">이미 있는 상품(SKU 같음)·채널(이름 같음)·정산·판매는 건너뛰고 기존 값을 바꾸지 않습니다. 여러 번 가져와도 중복되지 않습니다.</p>
            {plan.demoNamedChannels.length > 0 && <p className="mt-1 text-[0.82rem]" style={{ color: "var(--warning)" }}>이름에 'Demo'가 있는 채널 {plan.demoNamedChannels.length}개({plan.demoNamedChannels.join(", ")})를 그대로 만듭니다 — 가져온 뒤 채널 관리에서 실제 이름으로 바꾸세요.</p>}
            {file.errors.length > 0 && <p className="mt-1 text-[0.82rem]" style={{ color: "var(--danger)" }}>형식 오류로 건너뛸 항목 {file.errors.length}개: {file.errors.slice(0, 3).join(" · ")}{file.errors.length > 3 ? " …" : ""}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn-primary" disabled={!!busy || plan.empty} onClick={() => void apply()} data-testid="transfer-apply">{busy ? `가져오는 중… ${busy}` : plan.empty ? "가져올 새 항목 없음" : "가져오기 (Confirm)"}</button>
              <button className="btn-secondary" disabled={!!busy} onClick={() => setFile(null)}>취소</button>
              {!isLive && <StatusBadge tone="warning">Demo: 이 브라우저에 복원</StatusBadge>}
            </div>
          </div>
        )}
      </div>
    </DataCard>
  );
}
