"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, StatusBadge } from "@/components/ax/Cards";
import { ThemePickerPanel } from "@/components/ax/ThemePicker";
import { useSettings, type FontScale } from "@/components/providers/SettingsProvider";
import { isSupabaseConfigured } from "@/lib/repository";
import { BookOpen, Lightbulb, LogOut, User } from "lucide-react";

const FONT_OPTIONS: { id: FontScale; label: string; desc: string }[] = [
  { id: "small", label: "작게", desc: "약 17px" },
  { id: "default", label: "기본", desc: "약 19px" },
  { id: "large", label: "크게", desc: "약 21px" },
];

export default function SettingsPage() {
  const { fontScale, setFontScale, resetTutorial } = useSettings();

  return (
    <div className="reveal mx-auto max-w-[980px]">
      <PageHeader title="설정" description="화면 테마, 글자 크기, 데이터 상태를 관리합니다." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 화면 */}
        <DataCard title="화면 — 테마">
          <ThemePickerPanel />
        </DataCard>

        <div className="space-y-6">
          <DataCard title="화면 — 글자 크기">
            <div className="grid grid-cols-3 gap-2.5">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontScale(f.id)}
                  aria-pressed={fontScale === f.id}
                  className="rounded-xl border-2 p-4 text-center transition-colors"
                  style={
                    fontScale === f.id
                      ? { borderColor: "var(--primary)", background: "var(--primary-soft)" }
                      : { borderColor: "var(--border)" }
                  }
                >
                  <div className="text-[1.05rem] font-bold">{f.label}</div>
                  <div className="text-[0.82rem] text-ink-soft">{f.desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[0.88rem] text-ink-soft">
              글자 크기는 즉시 반영되며 이 브라우저에 저장됩니다.
            </p>
          </DataCard>

          <DataCard title="사용">
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  resetTutorial();
                  window.location.href = "/ax";
                }}
                className="flex w-full items-center gap-3 rounded-xl border p-4 text-left font-semibold transition-colors hover:bg-surface-muted"
                style={{ borderColor: "var(--border)" }}
              >
                <BookOpen size={20} className="text-ink-soft" aria-hidden />
                튜토리얼 다시 보기
              </button>
              <Link
                href="/ax/why"
                className="flex w-full items-center gap-3 rounded-xl border p-4 font-semibold transition-colors hover:bg-surface-muted"
                style={{ borderColor: "var(--border)" }}
              >
                <Lightbulb size={20} className="text-ink-soft" aria-hidden />
                기획의도 보기
              </Link>
            </div>
          </DataCard>
        </div>

        {/* 데이터 */}
        <DataCard title="데이터">
          <div className="space-y-3 text-[0.95rem]">
            <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5">
              <span className="font-medium">데이터 소스</span>
              {isSupabaseConfigured ? (
                <StatusBadge tone="success">Supabase 연결됨</StatusBadge>
              ) : (
                <StatusBadge tone="info">DEMO DATA</StatusBadge>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3.5">
              <span className="font-medium">마지막 업데이트</span>
              <span className="text-ink-soft">2025.05.31 (Demo Seed)</span>
            </div>
            <p className="text-[0.88rem] leading-relaxed text-ink-soft">
              Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)를 설정하면 실제 데이터로
              자동 전환됩니다. 테이블이 없거나 비어 있으면 Demo Data로 안전하게 fallback합니다.
            </p>
          </div>
        </DataCard>

        {/* 사용자 */}
        <DataCard title="사용자">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-[1.2rem] font-bold text-white"
              style={{ background: "var(--primary)" }}
              aria-hidden
            >
              가
            </div>
            <div>
              <div className="text-[1.05rem] font-bold">김가연</div>
              <div className="text-[0.9rem] text-ink-soft">MIRYEO 팀 · 관리자 (Demo)</div>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <button
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-left font-semibold transition-colors hover:bg-surface-muted"
              style={{ borderColor: "var(--border)" }}
            >
              <User size={20} className="text-ink-soft" aria-hidden />
              프로필 관리 (로그인 연동 후 활성화)
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-left font-semibold transition-colors hover:bg-surface-muted"
              style={{ borderColor: "var(--border)", color: "var(--danger)" }}
            >
              <LogOut size={20} aria-hidden />
              로그아웃 (로그인 연동 후 활성화)
            </button>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
