"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { recommend } from "@/lib/beauty-recommend";
import { saveResult } from "@/lib/beauty-store";
import { getPublicSource, getSessionId, track } from "@/lib/customer-events";
import { useBeautyData } from "@/components/beauty/BeautyDataProvider";
import { useCustomerId } from "@/components/beauty/CustomerSession";
import { CONCERNS } from "@/components/beauty/concerns";
import { BottomSheet } from "@/components/beauty/BottomSheet";
import { useBeautyMemory } from "@/components/beauty/useBeautyMemory";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { CONCERN_TINT } from "@/components/beauty/ui";
import type { BeautyProfile, Product, SkinConcern } from "@/lib/types";

/* AI Beauty Finder — "나에게 맞는 제품을 찾기 위한 짧은 상담" (D-073 → PASS 26 D-082: 로즈 진행 막대 · 파스텔 고민 카드 · 카드형 선택지 · 결과 머리 배너)
   추천 로직·이벤트·저장은 그대로, 화면만: 가는 진행 막대 + 큰 질문 + 큰 선택 줄 → 결과는 '오늘의 추천 루틴' 먼저, 근거는 눌러서(시트) */
const STEPS = ["고민", "케어 방향", "사용감", "루틴", "예산", "결과"];

const CARE_GOALS = ["수분을 채우고 싶어요", "예민한 피부를 진정시키고 싶어요", "탄력 있는 피부를 만들고 싶어요", "맑고 환한 톤을 원해요"];
const TEXTURES = ["가벼운 사용감", "촉촉하고 리치한 사용감", "상관없음"];
const ROUTINES = ["가볍게 3단계면 충분해요", "꼼꼼하게 챙기는 편이에요"];
const BUDGETS = ["합리적인 가격 위주", "프리미엄 케어 위주", "상관없음"];

const QUESTIONS = [
  { q: "오늘 가장 신경 쓰이는\n피부 고민은 무엇인가요?", hint: "여러 개를 골라도 괜찮아요" },
  { q: "어떤 케어를\n원하시나요?", hint: "가장 가까운 한 가지를 골라 주세요" },
  { q: "선호하는 사용감이\n있나요?", hint: "제형을 고를 때 참고할게요" },
  { q: "평소 스킨케어 루틴은\n어떤가요?", hint: "루틴의 단계 수를 맞춰 드려요" },
  { q: "어느 정도의 케어를\n생각하고 계신가요?", hint: "마지막 질문이에요" },
];

export default function FinderPage() {
  const { products } = useBeautyData();
  const mem = useBeautyMemory();
  const [step, setStep] = useState(0);
  const started = useRef(false);
  const completedKey = useRef("");
  const [concerns, setConcerns] = useState<SkinConcern[]>([]);
  const [careGoal, setCareGoal] = useState("");
  const [texture, setTexture] = useState("");
  const [routineLevel, setRoutineLevel] = useState("");
  const [budget, setBudget] = useState("");
  const [saved, setSaved] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
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

  // 질문이 바뀌면 화면 맨 위로 (앱의 다음 화면처럼)
  useEffect(() => { if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [step]);

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

  const answers = [concerns.map((c) => CONCERNS.find((x) => x.id === c)?.label ?? c).join(" · "), careGoal, texture, routineLevel, budget];
  const open = result?.routine.find((r) => r.product.id === sheet);

  return (
    <div className="mx-auto max-w-[760px] pt-6 @3xl:pt-12">
      {step < 5 && (
        <>
          {/* 진행 — 가는 막대 6칸 + 작은 표기 */}
          <div className="flex items-center justify-between gap-3">
            <p className="b-eyebrow">AI BEAUTY CONSULTATION</p>
            <p className="b-caption tabular font-semibold">질문 {step + 1} / 5</p>
          </div>
          <ol className="mt-2 grid grid-cols-6 gap-1.5" aria-label="진행 단계">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  aria-current={i === step ? "step" : undefined}
                  aria-label={`${i + 1}단계 ${s}${i < step ? " — 완료, 다시 보기" : ""}`}
                  className="group flex h-8 w-full items-center disabled:cursor-default"
                >
                  <span className="block h-[5px] w-full rounded-full transition-colors" style={{ background: i <= step ? "var(--b-rose-ink)" : "var(--b-soft)", opacity: i < step ? 0.6 : 1 }} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          {step > 0 && (
            <p className="b-caption mt-3 line-clamp-1" data-testid="finder-answers">
              {answers.slice(0, step).filter(Boolean).join("  →  ")}
            </p>
          )}

          <div key={step} className="b-step-in mt-7 @3xl:mt-10">
            <span className="b-pill" style={{ background: "var(--b-rose-soft)", color: "var(--b-rose-ink)" }}><Sparkles size={12} aria-hidden /> MIRYEO 뷰티 상담</span>
            <h1 className="b-display mt-3 whitespace-pre-line text-[1.6rem] @3xl:text-[2.2rem]">{QUESTIONS[step].q}</h1>
            <p className="b-body mt-3">{QUESTIONS[step].hint}</p>

            {step === 0 && (
              <div className="mt-8 grid grid-cols-2 gap-2.5 @xl:grid-cols-3 @xl:gap-3">
                {CONCERNS.map((c) => {
                  const on = concerns.includes(c.id);
                  const t = CONCERN_TINT[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleConcern(c.id)}
                      aria-pressed={on}
                      className="pressable relative flex min-h-[118px] flex-col items-start rounded-[20px] border-2 p-4 text-left transition-colors"
                      style={on ? { borderColor: "var(--b-rose-ink)", background: t.bg } : { borderColor: "transparent", background: t.bg }}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-colors" style={on ? { background: "var(--b-rose-ink)", color: "#fff" } : { color: t.fg }}>
                        {on ? <Check size={18} strokeWidth={3} aria-hidden /> : <c.icon size={19} strokeWidth={2} aria-hidden />}
                      </span>
                      <span className="mt-auto block pt-3 text-[1rem] font-extrabold">{c.label}</span>
                      <span className="mt-0.5 block text-[0.78rem] leading-snug [word-break:keep-all]" style={{ color: "var(--b-text-soft)" }}>{c.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {step === 1 && <StepChoices options={CARE_GOALS} value={careGoal} onChange={setCareGoal} />}
            {step === 2 && <StepChoices options={TEXTURES} value={texture} onChange={setTexture} />}
            {step === 3 && <StepChoices options={ROUTINES} value={routineLevel} onChange={setRoutineLevel} />}
            {step === 4 && <StepChoices options={BUDGETS} value={budget} onChange={setBudget} />}
          </div>

          {/* 모바일: 엄지가 닿는 아래쪽에 고정 (하단 탭 바로 위) */}
          <div className="sticky bottom-[calc(62px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-8 flex items-center justify-between gap-3 border-t bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mt-10 md:border-0 md:bg-transparent md:px-0 md:py-0" style={{ borderColor: "var(--b-border)" }}>
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex min-h-[52px] items-center gap-1.5 rounded-full px-3 font-semibold transition-opacity disabled:opacity-0"
              style={{ color: "var(--b-text-soft)" }}
            >
              <ArrowLeft size={17} aria-hidden />
              이전
            </button>
            <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="b-btn pressable min-w-[160px] flex-1 @md:flex-none">
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
        </>
      )}

      {/* 결과 — 오늘의 추천 루틴 */}
      {step === 5 && result && (
        <div className="reveal">
          <div className="overflow-hidden rounded-[24px] p-6 @3xl:p-8" style={{ background: "linear-gradient(135deg, #FDE6EC 0%, #F6C9D6 100%)" }}>
            <span className="b-pill bg-white" style={{ color: "var(--b-rose-ink)" }}><Sparkles size={12} aria-hidden /> AI BEAUTY RESULT</span>
            <h1 className="b-display mt-3 whitespace-pre-line text-[1.7rem] @3xl:text-[2.3rem]">{mem.name ? `${mem.name}님을 위한\n` : ""}오늘의 추천 루틴</h1>
            <p className="mt-2 text-[0.92rem] leading-relaxed" style={{ color: "var(--b-text)" }}>
              선택하신 고민 <strong>{concerns.join(" · ")}</strong>
              {texture !== "상관없음" && (
                <>
                  {" "}· 선호 <strong>{texture}</strong>
                </>
              )}{" "}
              기준으로 구성했습니다.
            </p>
          </div>

          <section className="b-card mt-4 px-5 py-2 @3xl:px-8" aria-label="추천 루틴" data-testid="finder-routine">
            <div className="flex items-center justify-between border-b py-4" style={{ borderColor: "var(--b-line)" }}>
              <span className="text-[0.88rem] font-bold">데일리 루틴 · {result.routine.length}단계</span>
              <span className="b-caption">{routineLevel === "가볍게 3단계면 충분해요" ? "가볍게" : "꼼꼼하게"}</span>
            </div>
            <ol>
              {result.routine.map((r, i) => (
                <li key={r.product.id} className="flex gap-4 border-b py-5 last:border-b-0 @xl:gap-6" style={{ borderColor: "var(--b-line)" }}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-extrabold tabular text-white" style={{ background: "var(--b-rose-ink)" }}>{i + 1}</span>
                  <div className="flex h-[96px] w-[70px] shrink-0 items-center justify-center rounded-2xl @xl:h-[112px] @xl:w-[84px]" style={{ background: "var(--b-surface-warm)" }}>
                    <div className="h-[82%]"><ProductVisual category={r.product.category} variant={r.product.id.length} productId={r.product.id} className="h-full" /></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="b-caption font-semibold">{r.stepName.replace(/^STEP \d · /, "")}</div>
                    <h2 className="mt-0.5 text-[1.08rem] font-bold leading-snug">{r.product.name}</h2>
                    <p className="mt-1 line-clamp-2 text-[0.86rem] leading-snug" style={{ color: "var(--b-text-soft)" }}>{r.reason.split(". ")[0].replace(/\.$/, "")}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4">
                      <button onClick={() => setSheet(r.product.id)} className="b-link text-[0.86rem]">추천 근거 보기</button>
                      <Link href={`/beauty/products/${r.product.id}`} className="inline-flex min-h-[44px] items-center text-[0.86rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>제품 상세</Link>
                      <span className="tabular ml-auto text-[0.92rem] font-extrabold">{r.product.price.toLocaleString()}원</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={() => {
                const ids = result.routine.map((r) => r.product.id);
                const reasons = Object.fromEntries(result.routine.map((r) => [r.product.id, r.reason]));
                saveResult(profile, ids, reasons);
                track("passport_save", null, { productIds: ids, concerns });
                getPublicSource()?.saveBeautyResult(getSessionId(), profile, ids, reasons, customerId).catch((e) => console.warn("[MIRYEO] result save failed", e));
                setSaved(true);
              }}
              className="b-btn pressable w-full max-w-[360px]"
              style={saved ? { background: "var(--b-ink)" } : undefined}
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
                <Link href="/beauty/me" className="b-link text-[0.92rem]">
                  마이페이지 추천 기록에 저장됨 — 확인하기 →
                </Link>
              ) : (
                <span className="flex flex-col items-center gap-1 text-center text-[0.92rem]">
                  <Link href="/beauty/passport" className="b-link">뷰티 패스포트에서 확인하기 →</Link>
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
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[0.88rem] font-semibold"
              style={{ color: "var(--b-text-soft)" }}
            >
              <RotateCcw size={15} aria-hidden /> 다시 분석하기
            </button>
          </div>

          <BottomSheet open={!!open} onClose={() => setSheet(null)} eyebrow={open?.stepName} title={open?.product.name ?? ""}>
            {open && <ReasonBody product={open.product} reason={open.reason} concerns={concerns} />}
          </BottomSheet>
        </div>
      )}
    </div>
  );
}

function ReasonBody({ product, reason, concerns }: { product: Product; reason: string; concerns: SkinConcern[] }) {
  const matched = concerns.filter((c) => product.concerns.includes(c));
  return (
    <div>
      <div className="flex gap-4">
        <div className="flex h-[120px] w-[90px] shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--b-surface-warm)" }}>
          <div className="h-[84%]"><ProductVisual category={product.category} variant={product.id.length} productId={product.id} className="h-full" /></div>
        </div>
        <div>
          <p className="text-[0.84rem] font-bold">왜 추천됐나요?</p>
          <p className="b-body mt-1 text-[0.9rem]">{reason}</p>
        </div>
      </div>
      <dl className="mt-5 border-t text-[0.9rem]" style={{ borderColor: "var(--b-line)" }}>
        <div className="flex justify-between gap-4 border-b py-3" style={{ borderColor: "var(--b-line)" }}><dt style={{ color: "var(--b-text-soft)" }}>맞는 고민</dt><dd className="text-right font-semibold">{(matched.length ? matched : product.concerns).join(" · ")}</dd></div>
        <div className="flex justify-between gap-4 border-b py-3" style={{ borderColor: "var(--b-line)" }}><dt style={{ color: "var(--b-text-soft)" }}>제품 유형</dt><dd className="text-right font-semibold">{product.category}{product.texture ? ` · ${product.texture} 사용감` : ""}</dd></div>
        <div className="flex justify-between gap-4 py-3"><dt style={{ color: "var(--b-text-soft)" }}>가격</dt><dd className="tabular text-right font-semibold">₩{product.price.toLocaleString()}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/beauty/products/${product.id}`} className="b-btn pressable flex-1 whitespace-nowrap !px-4">제품 상세</Link>
        <Link href={`/beauty/products/${product.id}#channels`} className="inline-flex min-h-[52px] flex-1 items-center justify-center whitespace-nowrap rounded-full border px-4 font-bold" style={{ borderColor: "var(--b-line-strong)" }}>구매 채널 보기</Link>
      </div>
    </div>
  );
}

function StepChoices({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-7 grid gap-2.5" role="group">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            aria-pressed={on}
            className="pressable flex min-h-[64px] w-full items-center justify-between gap-4 rounded-[18px] border-2 px-5 text-left text-[1.02rem] transition-colors"
            style={on ? { borderColor: "var(--b-rose-ink)", background: "var(--b-rose-soft)", fontWeight: 800, color: "var(--b-text)" } : { borderColor: "transparent", background: "var(--b-canvas)", fontWeight: 600, color: "var(--b-text)" }}
          >
            {o}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors" style={on ? { background: "var(--b-rose-ink)", borderColor: "var(--b-rose-ink)", color: "#fff" } : { borderColor: "var(--b-line-strong)", background: "#fff" }} aria-hidden>
              {on && <Check size={14} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
