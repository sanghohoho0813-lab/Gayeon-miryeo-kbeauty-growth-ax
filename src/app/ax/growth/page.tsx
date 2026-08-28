"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ax/PageHeader";
import { ActionCard, DataCard, InsightCard, StatusBadge } from "@/components/ax/Cards";
import { useAxData } from "@/lib/useAxData";
import type { ActionCategory } from "@/lib/types";

const FILTERS: ("전체" | ActionCategory)[] = ["전체", "재고", "생산", "채널", "B2B", "재구매", "매출"];

export default function GrowthPage() {
  const { actions, customers, customerEvents, products } = useAxData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");

  const filtered = actions.filter((a) => filter === "전체" || a.category === filter);
  const top3 = actions.slice(0, 3);

  // Customer Front 행동 데이터 기반 관심 제품 랭킹
  const interest = products
    .map((p) => ({
      p,
      views: customerEvents.find((e) => e.productId === p.id && e.type === "view")?.count ?? 0,
      wishes: customerEvents.find((e) => e.productId === p.id && e.type === "wishlist")?.count ?? 0,
      finders: customerEvents.find((e) => e.productId === p.id && e.type === "finder_complete")?.count ?? 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const repurchase = customers.filter((c) => c.repurchaseDue);

  return (
    <div className="reveal">
      <PageHeader
        title="AI Growth Center"
        description="판매·재고·채널·고객 데이터를 분석해 지금 실행할 성장 행동을 우선순위로 제안합니다."
        actions={<StatusBadge tone="neutral">규칙 기반 분석 · DEMO DATA</StatusBadge>}
      />

      {/* 오늘의 우선순위 */}
      <DataCard title="오늘의 우선순위" className="mb-6">
        <ol className="grid gap-4 lg:grid-cols-3">
          {top3.map((a, i) => (
            <li key={a.id} className="relative">
              <span
                className="absolute -top-2 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[0.95rem] font-bold text-white"
                style={{ background: "var(--primary)" }}
                aria-hidden
              >
                {i + 1}
              </span>
              <ActionCard action={a} />
            </li>
          ))}
        </ol>
      </DataCard>

      {/* 필터 + 전체 Action */}
      <DataCard
        title={`전체 AI Action (${filtered.length}건)`}
        action={
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className="min-h-[42px] rounded-xl border px-3.5 text-[0.9rem] font-semibold transition-colors"
                style={
                  filter === f
                    ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }
                    : { borderColor: "var(--border)", color: "var(--text-secondary)" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
        className="mb-6"
      >
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-ink-soft">해당 카테고리의 Action이 없습니다.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => (
              <ActionCard key={a.id} action={a} detailed />
            ))}
          </div>
        )}
      </DataCard>

      {/* 고객 재구매 기회 + Customer Front 관심도 */}
      <div className="grid gap-6 xl:grid-cols-2">
        <DataCard title="고객 재구매 기회">
          <p className="mb-4 text-[0.9rem] text-ink-soft">
            구매 주기와 마지막 주문일 기준 재구매 시점이 도래한 고객입니다. (Demo)
          </p>
          <ul className="space-y-2.5">
            {repurchase.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[0.85rem] text-ink-soft">
                    마지막 주문 {c.lastOrderAt} · 누적 {c.orderCount}회 ·{" "}
                    {c.favoriteProducts.map((id) => products.find((p) => p.id === id)?.name ?? id).join(", ")}
                  </div>
                </div>
                <StatusBadge tone="warning">재구매 시점</StatusBadge>
              </li>
            ))}
          </ul>
        </DataCard>

        <DataCard title="Customer Front 관심도 Top 5">
          <p className="mb-4 text-[0.9rem] text-ink-soft">
            MIRYEO AI Beauty(고객 화면)의 조회·찜·AI 추천 데이터입니다. 상품기획과 생산 판단의 근거가 됩니다.
          </p>
          <ul className="space-y-2.5">
            {interest.map(({ p, views, wishes, finders }, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold"
                  style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-[0.85rem] text-ink-soft">
                    조회 {views.toLocaleString()} · 찜 {wishes.toLocaleString()} · AI 추천 완료 {finders.toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </DataCard>
      </div>

      <div className="mt-6">
        <InsightCard
          title="AI 분석 방식 안내"
          summary="성장률·재고일수·마진율·재구매 예상 등 계산 가능한 지표는 모두 코드로 계산하며, 위 Action은 해당 지표에 규칙을 적용해 생성됩니다. LLM 연동 시 요약·우선순위 해석 문장이 더 정교해집니다."
          compact
        />
      </div>
    </div>
  );
}
