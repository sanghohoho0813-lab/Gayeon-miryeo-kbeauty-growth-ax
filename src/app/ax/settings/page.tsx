"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Lightbulb, RotateCcw, X } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge } from "@/components/ax/Cards";
import { ThemePickerPanel } from "@/components/ax/ThemePicker";
import { RoleMenu } from "@/components/ax/UtilityHeader";
import { Modal } from "@/components/ax/Modal";
import { toast } from "@/components/ax/Toast";
import { useSettings, type FontScale } from "@/components/providers/SettingsProvider";
import { useData, useModel } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { ALL_PERMISSIONS, can, PERMISSION_LABEL, ROLE_LABEL } from "@/lib/permissions";
import { isLive, liveConfigured, DATA_MODE } from "@/lib/config";
import { formatDateKR, formatDateTimeKR, todayISO } from "@/lib/date";
import type { Role, TechAsset, TechAssetStatus } from "@/lib/types";

const FONT_OPTIONS: { id: FontScale; label: string; desc: string }[] = [
  { id: "small", label: "작게", desc: "17px" },
  { id: "default", label: "기본", desc: "19px" },
  { id: "large", label: "크게", desc: "21px" },
];
const TECH_STATUS: TechAssetStatus[] = ["미확인", "준비중", "검토중", "출원예정", "출원완료", "인증완료", "해당없음"];

export default function SettingsPage() {
  const router = useRouter();
  const m = useModel();
  const { run, source } = useData();
  const { role, actorName, userEmail } = useSession();
  const { fontScale, setFontScale, reduceMotion, setReduceMotion, resetTutorial } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [pilot, setPilot] = useState(m.snapshot.org.pilotStartedOn ?? "");
  const owner = can(role, "manage_org");

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="설정" description="화면·역할·데이터·실증 운영·기술자산을 관리합니다." />

      <div className="grid gap-6 @4xl:grid-cols-2">
        <DataCard title="화면 — 테마 (Canonical 7)" tourId="settings-display">
          <ThemePickerPanel bare />
          <p className="mt-3 text-[0.82rem] text-ink-soft">본문·표·폼은 테마와 무관하게 중립색으로 유지됩니다. 선택한 테마는 고객 화면 브랜드 색과 Mobile 미리보기에도 함께 반영됩니다.</p>
        </DataCard>

        <div className="space-y-6">
          <DataCard title="화면 — 글자 크기 · 모션">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="글자 크기">
              {FONT_OPTIONS.map((f) => (
                <button key={f.id} role="radio" aria-checked={fontScale === f.id} onClick={() => setFontScale(f.id)} className="pressable rounded-xl border-2 p-3 text-center" style={fontScale === f.id ? { borderColor: "var(--primary)", background: "var(--primary-soft)" } : { borderColor: "var(--border)" }}>
                  <div className="font-bold">{f.label}</div><div className="text-[0.78rem] text-ink-soft">{f.desc}</div>
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3">
              <span><span className="block font-semibold">모션 줄이기</span><span className="text-[0.82rem] text-ink-soft">상태 변화 표시는 유지하고 장식 애니메이션만 줄입니다</span></span>
              <input type="checkbox" className="h-5 w-5" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
            </label>
          </DataCard>

          <DataCard title="사용 안내">
            <div className="space-y-2">
              <button onClick={() => { resetTutorial(); router.push("/ax"); }} className="row-hover flex w-full items-center gap-3 rounded-xl border p-3.5 text-left font-semibold" style={{ borderColor: "var(--border)" }}>
                <BookOpen size={19} className="text-ink-soft" aria-hidden /> 튜토리얼 다시 보기
              </button>
              <Link href="/ax/why" className="row-hover flex w-full items-center gap-3 rounded-xl border p-3.5 font-semibold" style={{ borderColor: "var(--border)" }}>
                <Lightbulb size={19} className="text-ink-soft" aria-hidden /> 기획의도 보기
              </Link>
            </div>
          </DataCard>
        </div>

        <DataCard title="역할 · 권한" className="@4xl:col-span-2">
          <div className="grid gap-5 @3xl:grid-cols-2">
            <div>
              <div className="font-semibold">현재: {ROLE_LABEL[role]} ({role}){isLive ? ` · ${userEmail}` : " · Demo"}</div>
              <p className="mt-1 text-[0.86rem] text-ink-soft">{isLive ? "역할은 organization_members에서 OWNER가 관리합니다." : "Demo에서는 역할을 바꿔 메뉴·민감정보·버튼 차이를 확인할 수 있습니다."}</p>
              <div className="mt-3"><RoleMenu inline /></div>
              <p className="mt-3 text-[0.82rem] text-ink-soft">AX OWNER(실증 책임자)는 로그인 역할과 별개입니다: <b>REQUIRED / UNASSIGNED</b></p>
            </div>
            <div className="table-scroll">
              <table className="!min-w-[420px] text-[0.86rem]">
                <thead><tr className="border-b text-left text-ink-soft" style={{ borderColor: "var(--border)" }}><th className="py-2 pr-3 font-semibold">권한</th>{(["OWNER", "ADMIN", "STAFF"] as Role[]).map((r) => <th key={r} className="py-2 pr-2 text-center font-semibold">{ROLE_LABEL[r]}</th>)}</tr></thead>
                <tbody>
                  {ALL_PERMISSIONS.map((p) => (
                    <tr key={p} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 pr-3">{PERMISSION_LABEL[p]}</td>
                      {(["OWNER", "ADMIN", "STAFF"] as Role[]).map((r) => <td key={r} className="py-2 pr-2 text-center">{can(r, p) ? <Check size={16} className="mx-auto" style={{ color: "var(--success)" }} aria-label="가능" /> : <X size={16} className="mx-auto text-ink-soft" aria-label="불가" />}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataCard>

        <DataCard title="데이터">
          <dl className="space-y-2 text-[0.92rem]">
            {[
              ["Data Mode", <StatusBadge key="m" tone={isLive ? "success" : "warning"}>{DATA_MODE.toUpperCase()}</StatusBadge>],
              ["Data Source", isLive ? (liveConfigured ? "Supabase (RLS 적용)" : "설정 누락") : "브라우저 Demo 저장소 (시연용)"],
              ["불러온 시각", formatDateTimeKR(m.snapshot.loadedAt)],
              ["상품 / 판매 행", `${m.snapshot.products.length}개 / ${m.snapshot.sales.length}행 (직접 입력 ${m.snapshot.sales.filter((s) => s.source !== "seed").length})`],
              ["고객 이벤트", `${m.customer.totalCount.toLocaleString()}건 (실제 발생 ${m.customer.liveCount})`],
              ["최근 판매일", formatDateKR(m.kpis.lastSaleDate)],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-2.5"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/ax/data" className="btn-secondary">데이터 입력 · CSV</Link>
            {!isLive && owner && <button className="btn-secondary" style={{ color: "var(--danger)" }} onClick={() => setConfirmReset(true)}><RotateCcw size={16} aria-hidden /> Demo 초기화</button>}
          </div>
          {!isLive && !owner && <p className="mt-2 text-[0.8rem] text-ink-soft">Demo 초기화는 대표 역할에서 가능합니다.</p>}
        </DataCard>

        <DataCard title="실증 운영" id="pilot">
          <label className="field-label" htmlFor="pilot-date">Pilot 시작일 (Week 0)</label>
          <div className="flex gap-2">
            <input id="pilot-date" type="date" className="field" value={pilot} disabled={!owner} onChange={(e) => setPilot(e.target.value)} />
            <button className="btn-primary" disabled={!owner || pilot === (m.snapshot.org.pilotStartedOn ?? "")} onClick={async () => {
              try { await run((s) => s.updateOrg({ pilotStartedOn: pilot || null })); toast("Pilot 시작일을 저장했습니다"); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
            }}>저장</button>
          </div>
          <button className="btn-ghost mt-2 !min-h-[36px] text-[0.85rem]" disabled={!owner} onClick={() => setPilot(todayISO())}>오늘로 설정</button>
          <p className="mt-2 text-[0.82rem] text-ink-soft">{owner ? "지정 후 실증·Evidence 화면에 Week 진행이 표시됩니다." : "대표(OWNER)만 지정할 수 있습니다."}</p>
          <div className="mt-4 rounded-xl bg-surface-muted p-3 text-[0.86rem]">
            <div className="font-semibold">AI 연결 상태</div>
            <ul className="mt-1 space-y-0.5 text-ink-soft">
              <li>· 재고·생산·채널·고객 관심: <b>RULE / STATISTICAL</b> 동작 중</li>
              <li>· 경영 요약 LLM: <b>NEXT (CONDITIONAL)</b> — API 미연결</li>
              <li>· 문서 질의 RAG: <b>NEXT (CONDITIONAL)</b></li>
            </ul>
          </div>
        </DataCard>

        <DataCard title="기술·사업화 자산" className="@4xl:col-span-2">
          <p className="mb-3 text-[0.88rem] text-ink-soft">실제 확인된 상태와 번호만 입력합니다. 확인 전에는 &lsquo;미확인&rsquo;으로 두며, 번호를 임의로 만들지 않습니다.</p>
          <ul className="grid gap-3 @3xl:grid-cols-2">
            {m.snapshot.techAssets.map((t) => <TechAssetRow key={t.id} t={t} editable={owner} onSave={async (next) => {
              try { await run((s) => s.upsertTechAsset(next)); toast("기술자산 상태를 저장했습니다"); } catch (e) { toast(e instanceof Error ? e.message : "실패", "error"); }
            }} />)}
          </ul>
        </DataCard>

        <DataCard title="사용자" className="@4xl:col-span-2">
          <p className="text-[0.92rem]">{isLive ? `${userEmail} · ${ROLE_LABEL[role]}` : `${actorName} — Demo 모드는 로그인 없이 역할 전환으로 시연합니다.`}</p>
          <p className="mt-1 text-[0.84rem] text-ink-soft">구성원 초대·역할 변경: Supabase Dashboard → organization_members (SETUP.md). 앱 내 초대 화면은 2차 범위.</p>
        </DataCard>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Demo 데이터를 초기화할까요?">
        <p className="text-[0.95rem] text-ink-soft">이 브라우저의 Demo 저장소(입력한 판매·Action·Proof·고객 이벤트)가 처음 상태로 돌아갑니다. Live 데이터에는 영향이 없습니다.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmReset(false)}>취소</button>
          <button className="btn-primary" style={{ background: "var(--danger)" }} onClick={async () => {
            await source?.reset();
            try { localStorage.removeItem("miryeo-beauty-wishlist"); localStorage.removeItem("miryeo-beauty-last-result"); localStorage.removeItem("miryeo-beauty-recently-viewed"); localStorage.removeItem("miryeo-beauty-concerns"); } catch { /* noop */ }
            setConfirmReset(false);
            toast("Demo를 초기화했습니다");
          }}>초기화</button>
        </div>
      </Modal>
    </div>
  );
}

function TechAssetRow({ t, editable, onSave }: { t: TechAsset; editable: boolean; onSave: (t: TechAsset) => void }) {
  const [v, setV] = useState(t);
  const dirty = v.status !== t.status || (v.referenceNo ?? "") !== (t.referenceNo ?? "") || (v.note ?? "") !== (t.note ?? "");
  return (
    <li className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-2"><span className="font-bold">{t.kind}</span><StatusBadge tone={t.status === "미확인" ? "warning" : t.status === "해당없음" ? "neutral" : "primary"}>{t.status}</StatusBadge></div>
      {editable ? (
        <div className="mt-3 grid gap-2 @xl:grid-cols-2">
          <select className="field" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as TechAssetStatus })} aria-label={`${t.kind} 상태`}>{TECH_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
          <input className="field" placeholder="실제 번호 (예: 출원번호)" value={v.referenceNo ?? ""} onChange={(e) => setV({ ...v, referenceNo: e.target.value })} aria-label={`${t.kind} 번호`} />
          <input className="field @xl:col-span-2" placeholder="메모" value={v.note ?? ""} onChange={(e) => setV({ ...v, note: e.target.value })} aria-label={`${t.kind} 메모`} />
          <button className="btn-secondary @xl:col-span-2" disabled={!dirty} onClick={() => onSave(v)}>저장</button>
        </div>
      ) : (
        <p className="mt-2 text-[0.86rem] text-ink-soft">{t.referenceNo ? `번호 ${t.referenceNo}` : "번호 없음"}{t.note ? ` · ${t.note}` : ""}</p>
      )}
    </li>
  );
}
