"use client";

import { useEffect, useState } from "react";
import { getLastResult, getRecentlyViewed, getSavedConcerns, getWishlist } from "@/lib/beauty-store";
import type { BeautyRecommendation, SkinConcern } from "@/lib/types";
import { useCustomerSession } from "./CustomerSession";

/* 고객 앱 개인화의 근거 — 실제로 저장된 것만 (Finder 결과·찜·최근 본·회원 정보). 없으면 비워 두고 가짜 개인화를 만들지 않는다. (D-073) */
export interface BeautyMemory {
  loaded: boolean;
  /** 회원 이름 (회원 + 이름 입력 시) */
  name: string | null;
  member: boolean;
  result: BeautyRecommendation | null;
  /** Finder로 저장한 고민, 없으면 회원 정보의 피부 고민 */
  concerns: SkinConcern[];
  wishlist: string[];
  viewed: string[];
}

export function useBeautyMemory(): BeautyMemory {
  const { session } = useCustomerSession();
  const [local, setLocal] = useState<{ result: BeautyRecommendation | null; concerns: SkinConcern[]; wishlist: string[]; viewed: string[] } | null>(null);
  useEffect(() => {
    setLocal({ result: getLastResult(), concerns: getSavedConcerns(), wishlist: getWishlist(), viewed: getRecentlyViewed() });
  }, []);
  const member = !!session?.account && !session.operator;
  const name = member ? session?.account?.displayName?.trim() || null : null;
  const concerns = local?.concerns.length ? local.concerns : member ? session?.account?.skinConcerns ?? [] : [];
  return { loaded: !!local, name, member, result: local?.result ?? null, concerns, wishlist: local?.wishlist ?? [], viewed: local?.viewed ?? [] };
}

/** 루틴 단계 이름 (Product.routineStep) */
export const STEP_LABEL: Record<number, string> = { 1: "클렌징 · 토너", 2: "에센스 · 앰플", 3: "크림", 4: "선케어" };

export function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
