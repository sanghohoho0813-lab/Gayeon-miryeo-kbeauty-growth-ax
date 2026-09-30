"use client";

import { CONCERNS } from "./concerns";
import { isLive, PRIVACY_POLICY_URL, PRIVACY_VERSION } from "@/lib/config";
import type { SkinConcern } from "@/lib/types";

/* 고객 계정 공용 부품 — 동의 안내, 피부 고민 선택 */

export function ConsentSummary() {
  return (
    <div className="rounded-xl p-3.5 text-[0.84rem] leading-relaxed" style={{ background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }}>
      <div className="font-bold" style={{ color: "var(--b-text)" }}>개인정보 수집·이용 안내 {isLive ? `(${PRIVACY_VERSION})` : "(Demo 초안 — 가연인터내셔널 확정 필요)"}</div>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
        <li>수집 항목: 이메일, 이름(선택), 피부 고민·추천 결과, 직접 기록한 구매 내역</li>
        <li>이용 목적: 맞춤 추천 기록 보관, 구매 기록 관리, 재구매 예상 시점 안내</li>
        <li>보유 기간: 회원 탈퇴 시까지 (관계 법령에 따른 보관 예외 제외)</li>
        <li>동의하지 않아도 비회원으로 추천을 받을 수 있습니다</li>
      </ul>
      {PRIVACY_POLICY_URL && <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" className="mt-1.5 inline-block font-bold underline" style={{ color: "var(--b-navy)" }}>개인정보 처리방침 전문</a>}
    </div>
  );
}

export function ConcernPicker({ value, onChange }: { value: SkinConcern[]; onChange: (v: SkinConcern[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONCERNS.map((c) => {
        const on = value.includes(c.id);
        return (
          <button key={c.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])} className="pressable min-h-[40px] rounded-full border px-3.5 text-[0.86rem] font-semibold" style={on ? { background: "var(--b-navy)", color: "#fff", borderColor: "var(--b-navy)" } : { borderColor: "var(--b-border)", color: "var(--b-text-soft)" }}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

