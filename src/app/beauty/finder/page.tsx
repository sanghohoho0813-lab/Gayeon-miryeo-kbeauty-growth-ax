"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { recommend } from "@/lib/beauty-recommend";
import { saveResult } from "@/lib/beauty-store";
import { getPublicSource, getSessionId, track } from "@/lib/customer-events";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { useCustomerId } from "@/components/beauty/CustomerSession";
import { CONCERNS } from "@/components/beauty/concerns";
import { ProductVisual } from "@/components/shared/ProductVisual";
import type { BeautyProfile, SkinConcern } from "@/lib/types";

const STEPS = ["고민", "케어 방향", "사용감", "루틴", "예산", "결과"];

const CARE_GOALS = ["수분을 채우고 싶어요", "예민한 피부를 진정시키고 싶어요", "탄력 있는 피부를 만들고 싶어요", "맑고 환한 톤을 원해요"];
const TEXTURES = ["가벼운 사용감", "촉촉하고 리치한 사용감", "상관없음"];
const ROUTINES = ["가볍게 3단계면 충분해요", "꼼꼼하게 챙기는 편이에요"];
const BUDGETS = ["합리적인 가격 위주", "프리미엄 케어 위주", "상관없음"];

export default function FinderPage() {
  const { products } = useBeautyData();
  const [step, setStep] = useState(0);
  const started = useRef(false);
  const completedKey = useRef("");
  const [concerns, setConcerns] = useState<SkinConcern[]>([]);
  const [careGoal, setCareGoal] = useState("");
  const [texture, setTexture] = useState("");
  const [routineLevel, setRoutineLevel] = useState("");
  const [budget, setBudget] = useState("");
  const [saved, setSaved] = useState(false);
  const customerId = useCustomerId();

  const profile: BeautyProfile = useMemo(
    () => ({ concerns, careGoal, texture, routineLevel, budget }),
    [concerns, careGoal, texture, routineLevel, budget]
  );

  const result = useMemo(() => {
    if (step !== 5) return null;
    return recommend(profile, products);
  }, [step, profile, products]);

  // Customer Event Bridge — 결과 도달 = finder_complete + 추천 노출
  useEffect(() => {
    if (!result) return;
    const ids = result.routine.map((r) => r.product.id);
    const key = `${concerns.join(",")}|${ids.join(",")}`;
    if (completedKey.current === key) return;
    completedKey.current = key;
    track("finder_complete", null, { concerns, productIds: ids, texture, budget });
    ids.forEach((id) => track("recommendation_view", id));
  }, [result, concerns, texture, budget]);

  const canNext =
    (step === 0 && concerns.length > 0) ||
    (step === 1 && careGoal) ||
    (step === 2 && texture) ||
    (step === 3 && routineLevel) ||
    (step === 4 && budget);

  function toggleConcern(c: SkinConcern) {
    if (!started.current) {
      started.current = true;
      track("finder_start");
    }
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <div className="mx-auto max-w-[780px] pt-8">
      {/* Step Indicator */}
      <ol className="mb-9 flex items-center justify-between" aria-label="진행 단계">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={current ? "step" : undefined}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[0.9rem] font-bold transition-colors"
                style={
                  current
                    ? { background: "var(--b-navy)", color: "#fff" }
                    : done
                      ? { background: "var(--b-gold)", color: "#fff", cursor: "pointer" }
                      : { background: "var(--b-surface-warm)", color: "var(--b-text-soft)" }
                }
              >
                {done ? <Check size={17} aria-hidden /> : i + 1}
              </button>
              <span className="text-[0.75rem] font-semibold" style={{ color: current ? "var(--b-navy)" : "var(--b-text-soft)" }}>
                {s}
              </span>
            </li>
          );
        })}
      </ol>

      {step < 5 && (
        <div className="rounded-[28px] border bg-white p-7 @xl:p-9" style={{ borderColor: "var(--b-border)" }}>
          <p className="text-[0.85rem] font-bold" style={{ color: "var(--b-gold)" }}>
            STEP {step + 1}/5
          </p>

          {step === 0 && (
            <>
              <h1 className="font-display mt-2 text-[1.5rem] font-bold @xl:text-[1.7rem]" style={{ color: "var(--b-navy)" }}>
                가장 고민되는 피부는 무엇인가요?
              </h1>
              <p className="mt-1 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>
                복수 선택 가능
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 @xl:grid-cols-3">
                {CONCERNS.map((c) => {
                  const on = concerns.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleConcern(c.id)}
                      aria-pressed={on}
                      className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all"
                      style={
                        on
                          ? { borderColor: "var(--b-navy)", background: "var(--b-surface-warm)" }
                          : { borderColor: "var(--b-border)" }
                      }
                    >
                      <c.icon size={26} style={{ color: "var(--b-navy)" }} aria-hidden />
                      <span className="text-[0.95rem] font-bold">{c.label}</span>
                      <span className="text-[0.78rem]" style={{ color: "var(--b-text-soft)" }}>
                        {c.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <StepChoices
              title="어떤 케어 방향을 원하시나요?"
              options={CARE_GOALS}
              value={careGoal}
              onChange={setCareGoal}
            />
          )}
          {step === 2 && (
            <StepChoices
              title="선호하는 사용감이 있나요?"
              options={TEXTURES}
              value={texture}
              onChange={setTexture}
            />
          )}
          {step === 3 && (
            <StepChoices
              title="현재 스킨케어 루틴은 어떤가요?"
              options={ROUTINES}
              value={routineLevel}
              onChange={setRoutineLevel}
            />
          )}
          {step === 4 && (
            <StepChoices
              title="어느 정도의 케어를 생각하고 계신가요?"
              options={BUDGETS}
              value={budget}
              onChange={setBudget}
            />
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex min-h-[50px] items-center gap-1.5 rounded-2xl border-2 px-5 font-bold transition-opacity disabled:opacity-40"
              style={{ borderColor: "var(--b-border)", color: "var(--b-text-soft)" }}
            >
              <ArrowLeft size={17} aria-hidden />
              이전
            </button>
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex min-h-[50px] items-center gap-2 rounded-2xl px-7 font-bold text-white transition-all disabled:opacity-40"
              style={{ background: "var(--b-navy)" }}
            >
              {step === 4 ? (
                <>
                  <Sparkles size={17} aria-hidden />
                  결과 보기
                </>
              ) : (
                <>
                  다음
                  <ArrowRight size={17} aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 결과 */}
      {step === 5 && result && (
        <div className="reveal">
          <div className="rounded-[28px] p-7 text-center @xl:p-9" style={{ background: "var(--b-navy)" }}>
            <p className="text-[0.82rem] font-bold tracking-[0.2em] text-white/60">AI BEAUTY RESULT</p>
            <h1 className="font-display mt-2 text-[1.6rem] font-bold text-white @xl:text-[1.85rem]">
              오늘의 추천 루틴
            </h1>
            <p className="mx-auto mt-2.5 max-w-lg text-[0.92rem] leading-relaxed text-white/70">
              선택하신 고민 <strong className="text-white">{concerns.join(" · ")}</strong>
              {texture !== "상관없음" && (
                <>
                  {" "}
                  · 선호 <strong className="text-white">{texture}</strong>
                </>
              )}{" "}
              기준으로 구성했습니다. 
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {result.routine.map((r) => (
              <div
                key={r.product.id}
                className="flex flex-col gap-5 rounded-[24px] border bg-white p-6 @xl:flex-row @xl:items-center"
                style={{ borderColor: "var(--b-border)" }}
              >
                <div
                  className="flex h-[150px] w-full shrink-0 items-center justify-center rounded-2xl @xl:w-[130px]"
                  style={{ background: "var(--b-surface-warm)" }}
                >
                  <div className="h-[115px]">
                    <ProductVisual category={r.product.category} variant={r.product.id.length} className="h-full" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[0.8rem] font-bold" style={{ color: "var(--b-gold)" }}>
                    {r.stepName}
                  </div>
                  <h2 className="mt-1 text-[1.15rem] font-bold">{r.product.name}</h2>
                  <div className="mt-0.5 text-[0.95rem] font-semibold">₩{r.product.price.toLocaleString()}</div>
                  <p className="mt-2 text-[0.9rem] leading-relaxed" style={{ color: "var(--b-text-soft)" }}>
                    <strong style={{ color: "var(--b-navy)" }}>추천 이유:</strong> {r.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/beauty/products/${r.product.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-xl border-2 px-4 text-[0.9rem] font-bold"
                      style={{ borderColor: "var(--b-navy)", color: "var(--b-navy)" }}
                    >
                      제품 상세
                    </Link>
                    <Link
                      href={`/beauty/products/${r.product.id}#channels`}
                      className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-[0.9rem] font-bold"
                      style={{ background: "var(--b-surface-warm)", color: "var(--b-text)" }}
                    >
                      구매 채널 보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              onClick={() => {
                const ids = result.routine.map((r) => r.product.id);
                const reasons = Object.fromEntries(result.routine.map((r) => [r.product.id, r.reason]));
                saveResult(profile, ids, reasons);
                track("passport_save", null, { productIds: ids, concerns });
                getPublicSource()?.saveBeautyResult(getSessionId(), profile, ids, reasons, customerId).catch((e) => console.warn("[MIRYEO] result save failed", e));
                setSaved(true);
              }}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl px-8 text-[1rem] font-bold text-white transition-transform hover:scale-[1.02]"
              style={{ background: saved ? "var(--b-gold)" : "var(--b-navy)" }}
            >
              {saved ? (
                <>
                  <Check size={18} aria-hidden />
                  Beauty Passport에 저장됨
                </>
              ) : (
                "Beauty Passport에 저장"
              )}
            </button>
            {saved && (
              customerId ? (
                <Link href="/beauty/me" className="text-[0.92rem] font-bold underline" style={{ color: "var(--b-navy)" }}>
                  마이페이지 추천 기록에 저장됨 — 확인하기 →
                </Link>
              ) : (
                <span className="flex flex-col items-center gap-1 text-center text-[0.92rem]">
                  <Link href="/beauty/passport" className="font-bold underline" style={{ color: "var(--b-navy)" }}>뷰티 패스포트에서 확인하기 →</Link>
                  <Link href="/beauty/login?mode=signup" className="underline" style={{ color: "var(--b-text-soft)" }}>회원가입하면 이 기록을 계정에 보관하고 재구매 시점을 알려드려요</Link>
                </span>
              )
            )}
            <button
              onClick={() => {
                setStep(0);
                setSaved(false);
                completedKey.current = "";
              }}
              className="text-[0.88rem] font-semibold"
              style={{ color: "var(--b-text-soft)" }}
            >
              다시 분석하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepChoices({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <h1 className="font-display mt-2 text-[1.5rem] font-bold @xl:text-[1.7rem]" style={{ color: "var(--b-navy)" }}>
        {title}
      </h1>
      <div className="mt-6 space-y-3">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              aria-pressed={on}
              className="flex min-h-[58px] w-full items-center justify-between rounded-2xl border-2 px-5 text-left text-[1rem] font-semibold transition-all"
              style={
                on
                  ? { borderColor: "var(--b-navy)", background: "var(--b-surface-warm)" }
                  : { borderColor: "var(--b-border)" }
              }
            >
              {o}
              {on && <Check size={19} style={{ color: "var(--b-navy)" }} aria-hidden />}
            </button>
          );
        })}
      </div>
    </>
  );
}
