import type { BeautyProfile, Product, SkinConcern } from "./types";

/* MIRYEO AI Beauty — 규칙 기반 추천 엔진 (Demo Mode)
   선택한 고민·사용감·예산을 점수화해 루틴(STEP별 1개 제품)을 구성한다.
   LLM 연동 시 추천 이유 문장 생성만 고도화하면 된다. */

export interface RecommendationResult {
  routine: { step: number; stepName: string; product: Product; reason: string }[];
  extras: Product[];
}

const STEP_NAMES: Record<number, string> = {
  1: "STEP 1 · 클렌징/토너",
  2: "STEP 2 · 에센스/앰플",
  3: "STEP 3 · 크림",
  4: "STEP 4 · 선케어",
};

function score(p: Product, profile: BeautyProfile): number {
  let s = 0;
  for (const c of profile.concerns) {
    if (p.concerns.includes(c as SkinConcern)) s += 3;
  }
  if (profile.texture === "가벼운 사용감" && p.texture === "가벼움") s += 2;
  if (profile.texture === "촉촉하고 리치한 사용감" && p.texture !== "가벼움") s += 2;
  if (profile.texture === "상관없음") s += 1;
  if (profile.budget === "합리적인 가격 위주" && p.price <= 35000) s += 2;
  if (profile.budget === "프리미엄 케어 위주" && p.price >= 45000) s += 2;
  if (p.isBest) s += 1;
  if (p.isNew) s += 0.5;
  return s;
}

function reasonFor(p: Product, profile: BeautyProfile): string {
  const matched = profile.concerns.filter((c) => p.concerns.includes(c as SkinConcern));
  const parts: string[] = [];
  if (matched.length > 0) {
    parts.push(`선택하신 고민(${matched.join(" · ")})에 맞는 ${p.category} 제품입니다`);
  } else {
    parts.push(`루틴 균형을 위해 추천하는 ${p.category} 제품입니다`);
  }
  if (profile.texture === "가벼운 사용감" && p.texture === "가벼움") {
    parts.push("선호하시는 가벼운 사용감의 텍스처입니다");
  }
  if (profile.texture === "촉촉하고 리치한 사용감" && p.texture !== "가벼움") {
    parts.push("촉촉하고 리치한 사용감을 선호하시는 분께 맞는 텍스처입니다");
  }
  if (p.isBest) parts.push("MIRYEO 추천 제품입니다");
  return parts.join(". ") + ".";
}

export function recommend(profile: BeautyProfile, products: Product[]): RecommendationResult {
  const scored = products
    .map((p) => ({ p, s: score(p, profile) }))
    .sort((a, b) => b.s - a.s);

  // 루틴 단계별 최고 점수 제품 선택
  const steps = profile.routineLevel === "가볍게 3단계면 충분해요" ? [1, 2, 3] : [1, 2, 3, 4];
  const used = new Set<string>();
  const routine: RecommendationResult["routine"] = [];

  for (const step of steps) {
    const pick = scored.find(({ p }) => p.routineStep === step && !used.has(p.id));
    if (pick) {
      used.add(pick.p.id);
      routine.push({
        step,
        stepName: STEP_NAMES[step],
        product: pick.p,
        reason: reasonFor(pick.p, profile),
      });
    }
  }

  const extras = scored
    .filter(({ p }) => !used.has(p.id))
    .slice(0, 3)
    .map(({ p }) => p);

  return { routine, extras };
}
