"use client";

import { useEffect, useState } from "react";
import { BarChart3, MousePointerClick, Sparkles } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { Modal } from "./Modal";

const POINTS = [
  {
    icon: BarChart3,
    title: "오늘의 숫자 확인",
    desc: "대시보드에서 매출·재고·채널 핵심 지표를 바로 확인합니다.",
  },
  {
    icon: Sparkles,
    title: "AI Action 확인",
    desc: "AI가 제안하는 오늘의 우선순위 행동을 확인합니다.",
  },
  {
    icon: MousePointerClick,
    title: "필요한 업무로 바로 이동",
    desc: "각 Action의 확인하기 버튼으로 관련 화면으로 이동합니다.",
  },
];

export function WelcomeModal() {
  const { tutorialSeen, markTutorialSeen } = useSettings();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tutorialSeen) {
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [tutorialSeen]);

  function close() {
    setOpen(false);
    markTutorialSeen();
  }

  return (
    <Modal open={open} onClose={close} title="MIRYEO Business AX에 오신 것을 환영합니다">
      <p className="text-[0.98rem] leading-relaxed text-ink-soft">
        판매·재고·생산·고객 데이터를 하나로 연결하고, AI가 다음 성장 행동을 제안합니다.
      </p>
      <div className="mt-5 space-y-4">
        {POINTS.map((p, i) => (
          <div key={p.title} className="flex items-start gap-3.5">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              aria-hidden
            >
              <p.icon size={21} />
            </span>
            <div>
              <div className="font-bold">
                {i + 1}. {p.title}
              </div>
              <p className="mt-0.5 text-[0.92rem] leading-relaxed text-ink-soft">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2.5">
        <button className="btn-primary flex-1" onClick={close}>
          둘러보기
        </button>
        <button className="btn-secondary" onClick={close}>
          나중에
        </button>
      </div>
    </Modal>
  );
}
