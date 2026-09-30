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

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function getWishlist(): string[] {
  return readJson<string[]>(WISHLIST_KEY, []);
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
  return readJson<BeautyRecommendation | null>(RESULT_KEY, null);
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
  return readJson<SkinConcern[]>(CONCERNS_KEY, []);
}

export function getRecentlyViewed(): string[] {
  return readJson<string[]>(VIEWED_KEY, []);
}

export function pushRecentlyViewed(productId: string): void {
  const list = getRecentlyViewed().filter((id) => id !== productId);
  writeJson(VIEWED_KEY, [productId, ...list].slice(0, 8));
}
