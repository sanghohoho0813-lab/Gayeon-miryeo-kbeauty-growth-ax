"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { useBeautyData } from "./BeautyDataProvider";
import { useCustomerSession } from "./CustomerSession";
import { customerApi } from "@/lib/customer-account";
import { dDayLabel, repurchaseDue, repurchaseSchedule, type RepurchaseItem } from "@/lib/repurchase";
import { formatDateKR, todayISO } from "@/lib/date";
import type { CustomerPurchase } from "@/lib/types";

/* 회원 재구매 시점 (PASS 25, D-081) — 회원 본인의 구매 기록으로만 계산한다. 비회원·기록 없음이면 비워 둔다(가짜 개인화 없음).
   마이페이지에서 기록을 관리하고, 홈·뷰티 패스포트는 같은 계산 결과를 보여 준다. */
export function useMyRepurchase(): { loaded: boolean; member: boolean; items: RepurchaseItem[]; due: RepurchaseItem[] } {
  const { session } = useCustomerSession();
  const { products } = useBeautyData();
  const member = !!session?.account && !session.operator;
  const [purchases, setPurchases] = useState<CustomerPurchase[] | null>(null);
  useEffect(() => {
    if (!member) { setPurchases(null); return; }
    let alive = true;
    customerApi().listMyPurchases().then((p) => alive && setPurchases(p)).catch(() => alive && setPurchases([]));
    return () => { alive = false; };
  }, [member, session]);
  const items = useMemo(() => (purchases ? repurchaseSchedule(purchases, new Map(products.map((p) => [p.id, p])), todayISO()) : []), [purchases, products]);
  return { loaded: !member || purchases !== null, member, items, due: repurchaseDue(items) };
}

/** 7일 이내면 '곧 필요' — 강조 + 구매처 바로가기 */
export const isSoon = (i: RepurchaseItem) => i.daysLeft <= 7;

export function DDay({ item }: { item: RepurchaseItem }) {
  const soon = isSoon(item);
  return (
    <span className="tabular shrink-0 rounded-full px-3 py-1 text-[0.86rem] font-bold" style={soon ? { background: "var(--b-rose-ink)", color: "#fff" } : { border: "1px solid var(--b-line-strong)", color: "var(--b-text-soft)", background: "#fff" }}>
      {dDayLabel(item.daysLeft)}
    </span>
  );
}

/** 재구매 시점 줄 목록 — 사진 · 제품 · 구매일/예상일 · D-day (구분선형) */
export function RepurchaseList({ items, limit }: { items: RepurchaseItem[]; limit?: number }) {
  return (
    <ul className="b-card b-list px-4 @3xl:px-6">
      {(limit ? items.slice(0, limit) : items).map((i) => (
        <li key={i.purchase.id} className="flex items-center gap-4 py-4" style={{ borderColor: "var(--b-line)" }}>
          <div className="flex h-[72px] w-[56px] shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--b-surface-warm)" }}>
            <div className="h-[82%]"><ProductVisual category={i.product.category} variant={i.product.id.length} productId={i.product.id} className="h-full" /></div>
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/beauty/products/${i.product.id}`} className="block truncate font-bold">{i.product.name}</Link>
            <p className="b-caption mt-0.5">{formatDateKR(i.purchase.purchasedOn)} 구매 · 예상 {formatDateKR(i.expectedOn)}{i.estimated ? " (사용기간 추정)" : ""}</p>
            {isSoon(i) && <Link href={`/beauty/products/${i.product.id}#channels`} className="b-link !min-h-[36px] text-[0.86rem]">구매처 보기</Link>}
          </div>
          <DDay item={i} />
        </li>
      ))}
    </ul>
  );
}

/** 홈 맨 위 한 줄 — 회원의 재구매 시점이 가까우면(7일 이내 ~ 14일 지남) 가장 가까운 제품 하나 (D-081) */
export function RepurchaseNotice() {
  const { due } = useMyRepurchase();
  if (!due.length) return null;
  const top = due[0];
  return (
    <div data-testid="home-repurchase" className="mt-4 flex items-center gap-3.5 rounded-[18px] p-3 pr-4" style={{ background: "var(--b-rose-soft)" }}>
      <div className="flex h-[56px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-white">
        <div className="h-[82%]"><ProductVisual category={top.product.category} variant={top.product.id.length} productId={top.product.id} className="h-full" /></div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem]"><Link href={`/beauty/products/${top.product.id}`} className="font-bold">{top.product.name}</Link>{" "}
          {top.daysLeft >= 0 ? "다시 필요할 시점이 다가와요" : "다시 필요할 시점이 지났어요"}{due.length > 1 ? ` (외 ${due.length - 1}개)` : ""}</p>
        <p className="b-caption">구매 기록 기준 예상 · <Link href="/beauty/me" className="font-bold underline underline-offset-2" style={{ color: "var(--b-rose-ink)" }}>마이페이지</Link></p>
      </div>
      <DDay item={top} />
    </div>
  );
}
