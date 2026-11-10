"use client";

/* MIRYEO AI Beauty — 고객 행동 데이터 로컬 스토어 (MVP)
   향후 Supabase customer_events / beauty_recommendations 테이블과 연결되는 지점.
   Data Model은 types.ts의 BeautyProfile / BeautyRecommendation을 그대로 사용한다. */

import type { BeautyProfile, BeautyRecommendation, SkinConcern } from "./types";

/* Beauty Passport의 개인 UX 저장(브라우저). 행동 이벤트는 customer-events.ts가 Business AX로 전달한다. */

const WISHLIST_KEY = "miryeo-beauty-wishlist";
const RESULT_KEY = "miryeo-beauty-last-result";
const VIEWED_KEY = "miryeo-beauty-recently-viewed";
const CONCERNS_KEY = "miryeo-beauty-concerns";

/* 저장된 값은 믿지 않는다 (PASS 41, D-149) — 예전 형식·손상·다른 프로그램이 바꾼 값이면 화면이 오류로 멈추고,
   저장값이 그대로라 새로고침해도 풀리지 않았다. 읽을 때 형태를 확인하고, 맞지 않는 부분만 버린다. */
function readRaw(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

const CONCERNS: readonly SkinConcern[] = ["수분", "진정", "탄력", "피부결", "광채", "데일리 케어"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** 글자 목록만 — 빈 글자·중복·너무 긴 값은 버림 */
export function cleanIds(v: unknown, max = 200): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) if (typeof x === "string" && x && x.length <= 200 && !out.includes(x)) out.push(x);
  return out.slice(0, max);
}
export function cleanConcerns(v: unknown): SkinConcern[] {
  return cleanIds(v).filter((c): c is SkinConcern => (CONCERNS as readonly string[]).includes(c));
}
/** 추천 결과 — 시각이 없거나 제품 목록이 목록이 아니면 결과 없음으로 본다 */
export function cleanResult(v: unknown): BeautyRecommendation | null {
  if (!isObj(v)) return null;
  const createdAt = text(v.createdAt);
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) return null;
  if (!Array.isArray(v.productIds)) return null;
  const productIds = cleanIds(v.productIds, 20);
  const p = isObj(v.profile) ? v.profile : {};
  const reasons: Record<string, string> = {};
  if (isObj(v.reasons)) for (const [k, r] of Object.entries(v.reasons)) if (typeof r === "string") reasons[k] = r;
  return {
    createdAt,
    profile: { concerns: cleanConcerns(p.concerns), careGoal: text(p.careGoal), texture: text(p.texture), routineLevel: text(p.routineLevel), budget: text(p.budget) },
    productIds,
    reasons,
  };
}

export function getWishlist(): string[] {
  return cleanIds(readRaw(WISHLIST_KEY));
}

export function toggleWishlist(productId: string): string[] {
  const list = getWishlist();
  const next = list.includes(productId)
    ? list.filter((id) => id !== productId)
    : [...list, productId];
  writeJson(WISHLIST_KEY, next);
  return next;
}

export function getLastResult(): BeautyRecommendation | null {
  return cleanResult(readRaw(RESULT_KEY));
}

export function saveResult(profile: BeautyProfile, productIds: string[], reasons: Record<string, string>): void {
  const rec: BeautyRecommendation = {
    createdAt: new Date().toISOString(),
    profile,
    productIds,
    reasons,
  };
  writeJson(RESULT_KEY, rec);
  writeJson(CONCERNS_KEY, profile.concerns);
}

export function getSavedConcerns(): SkinConcern[] {
  return cleanConcerns(readRaw(CONCERNS_KEY));
}

export function getRecentlyViewed(): string[] {
  return cleanIds(readRaw(VIEWED_KEY), 8);
}

export function pushRecentlyViewed(productId: string): void {
  const list = getRecentlyViewed().filter((id) => id !== productId);
  writeJson(VIEWED_KEY, [productId, ...list].slice(0, 8));
}
