"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, MousePointerClick, Sparkles } from "lucide-react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useDeviceView } from "@/components/device/DeviceView";

/* Tutorial — 실제 App 화면 위에서 동작하는 Spotlight 3~5 Step (v4.1 Tutorial Contract)
   각 Step은 실제 Route로 이동 → 대상 렌더 대기 → Spotlight. 종료 시 Overlay/pointer-events 완전 제거. */

const STEPS = [
  { route: "/ax", target: "kpis", title: "오늘의 숫자", body: "최근 4주 매출·재고 위험·B2B/수출을 확인합니다. 카드를 누르면 상세 목록으로 이동합니다." },
  { route: "/ax", target: "missions", title: "오늘 먼저 할 일", body: "RULE이 감지한 Growth Action 중 우선순위가 높은 최대 3개입니다. 근거를 보고 사람이 판단합니다." },
  { route: "/ax/customers", target: "customer-bridge", title: "고객 행동이 들어오는 곳", body: "MIRYEO AI Beauty의 Finder 완료·Passport 저장·찜이 이곳에 쌓이고, 관심이 오르면 Action이 생깁니다." },
  { route: "/ax/growth", target: "action-list", title: "추천 → 실행 → 결과 → 실증", body: "Action을 검토·승인하고 실행 결과를 기록하면 Proof Event가 생성되어 실증 리포트에 쌓입니다." },
  { route: "/ax/settings", target: "settings-display", title: "설정", body: "테마 7종·글자 크기·역할(대표/관리자/직원)·Demo 초기화·튜토리얼 다시 보기는 여기에서 합니다." },
];

type Rect = { top: number; left: number; width: number; height: number };

export function Tutorial() {
  const { tutorialSeen, markTutorialSeen } = useSettings();
  const { isFrame } = useDeviceView();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"off" | "welcome" | "tour">("off");
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!tutorialSeen && !isFrame) {
      const t = setTimeout(() => setPhase("welcome"), 500);
      return () => clearTimeout(t);
    }
    if (tutorialSeen) setPhase("off");
  }, [tutorialSeen, isFrame]);

  const finish = useCallback(() => {
    setPhase("off");
    setRect(null);
    markTutorialSeen();
  }, [markTutorialSeen]);

  // Step 진입: Route 이동 → 대상 대기 → 위치 계산
  useEffect(() => {
    if (phase !== "tour") return;
    const s = STEPS[step];
    if (pathname !== s.route) {
      setRect(null);
      router.push(s.route);
      return;
    }
    let tries = 0;
    const find = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
      tries += 1;
      if (el) {
        clearInterval(find);
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }, 350);
      } else if (tries > 40) {
        clearInterval(find);
        setRect({ top: window.innerHeight / 2 - 40, left: window.innerWidth / 2 - 120, width: 240, height: 80 });
      }
    }, 100);
    return () => clearInterval(find);
  }, [phase, step, pathname, router]);

  useLayoutEffect(() => {
    if (phase !== "tour") return;
    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step].target}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [phase, step]);

  useEffect(() => {
    if (phase === "off") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  if (phase === "off") return null;

  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="환영합니다">
        <div className="route-fade absolute inset-0 bg-black/45" />
        <div className="ax-card modal-in relative w-full max-w-lg p-6">
          <h2 className="text-[1.3rem] font-bold leading-snug">MIRYEO Business AX에 오신 것을 환영합니다</h2>
          <p className="mt-2 text-[0.97rem] leading-relaxed text-ink-soft">판매·재고·생산·고객 데이터를 한 곳에서 보고, AX가 제안한 Action을 사람이 실행하고, 그 결과를 실증으로 남깁니다.</p>
          <ul className="mt-4 space-y-3">
            {[[BarChart3, "오늘의 숫자 확인"], [Sparkles, "오늘 먼저 할 일(Mission) 처리"], [MousePointerClick, "결과 기록 → 실증 Evidence"]].map(([Icon, t], i) => {
              const I = Icon as typeof BarChart3;
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-soft)", color: "var(--primary)" }} aria-hidden><I size={20} /></span>
                  <span className="font-semibold">{i + 1}. {t as string}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex gap-2.5">
            <button className="btn-primary flex-1" data-autofocus onClick={() => { setStep(0); setPhase("tour"); }}>둘러보기 (5단계)</button>
            <button className="btn-secondary" onClick={finish}>나중에</button>
          </div>
        </div>
      </div>
    );
  }

  const s = STEPS[step];
  const pad = 8;
  const popTop = rect ? Math.min(window.innerHeight - 220, rect.top + rect.height + pad + 12) : window.innerHeight / 2;
  const popLeft = rect ? Math.max(12, Math.min(window.innerWidth - 372, rect.left)) : 12;
  const above = rect ? rect.top + rect.height + 240 > window.innerHeight && rect.top > 240 : false;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`튜토리얼 ${step + 1}/${STEPS.length}`}>
      {rect && (
        <div
          className="pointer-events-none fixed z-[80] rounded-2xl transition-all duration-300"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(10,14,22,0.55)", outline: "3px solid var(--highlight)" }}
        />
      )}
      {!rect && <div className="fixed inset-0 bg-black/40" />}
      <div
        className="ax-card modal-in fixed z-[90] w-[360px] max-w-[calc(100vw-24px)] p-5"
        style={above && rect ? { top: rect.top - pad - 12, left: popLeft, transform: "translateY(-100%)" } : { top: popTop, left: popLeft }}
      >
        <div className="text-[0.8rem] font-semibold" style={{ color: "var(--primary)" }}>STEP {step + 1} / {STEPS.length}</div>
        <h3 className="mt-1 text-[1.1rem] font-bold">{s.title}</h3>
        <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft">{s.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button className="btn-ghost !min-h-[42px] text-[0.88rem]" onClick={finish}>건너뛰기</button>
          <div className="flex-1" />
          {step > 0 && <button className="btn-secondary !min-h-[42px] text-[0.88rem]" onClick={() => setStep((v) => v - 1)}>이전</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn-primary !min-h-[42px] text-[0.88rem]" data-autofocus onClick={() => setStep((v) => v + 1)}>다음</button>
          ) : (
            <button className="btn-primary !min-h-[42px] text-[0.88rem]" onClick={() => { finish(); router.push("/ax"); }}>완료</button>
          )}
        </div>
      </div>
    </div>
  );
}
