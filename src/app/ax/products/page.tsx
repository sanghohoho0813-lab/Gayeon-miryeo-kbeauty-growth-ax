"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ax/PageHeader";
import { DataCard, InsightCard, StatusBadge, saleStatusTone, stockStatusTone } from "@/components/ax/Cards";
import { Drawer } from "@/components/ax/Modal";
import { WeeklyTrend } from "@/components/ax/TrendChart";
import { ProductVisual } from "@/components/shared/ProductVisual";
import { useAxData } from "@/lib/useAxData";
import { formatKRW, formatPct, formatPrice, productInsight, sum } from "@/lib/analytics";
import type { Product } from "@/lib/types";

const TABS = [
  { id: "products", label: "상품" },
  { id: "inventory", label: "재고" },
  { id: "production", label: "OEM 생산" },
  { id: "import", label: "데이터 가져오기" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || "products";
  const data = useAxData();
  const [selected, setSelected] = useState<Product | null>(null);

  return (
    <div className="reveal">
      <PageHeader
        title="상품·재고·생산"
        description="판매 중인 SKU의 판매·재고·생산 흐름을 관리합니다. 제품 자료는 실제 데이터 수령 후 교체됩니다."
        actions={<StatusBadge tone="neutral">DEMO DATA</StatusBadge>}
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl border bg-surface p-1.5" style={{ borderColor: "var(--border)" }} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => router.replace(`/ax/products?tab=${t.id}`, { scroll: false })}
            className="min-h-[46px] shrink-0 rounded-xl px-5 text-[0.98rem] font-semibold transition-colors"
            style={
              tab === t.id
                ? { background: "var(--primary)", color: "#fff" }
                : { color: "var(--text-secondary)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsTab onSelect={setSelected} />}
      {tab === "inventory" && <InventoryTab onSelect={setSelected} />}
      {tab === "production" && <ProductionTab />}
      {tab === "import" && <ImportTab />}

      <ProductDetailDrawer product={selected} onClose={() => setSelected(null)} data={data} />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}

/* ---------- 상품 Tab ---------- */
function ProductsTab({ onSelect }: { onSelect: (p: Product) => void }) {
  const { products, metrics, inventory, channels } = useAxData();
  const [category, setCategory] = useState<string>("전체");
  const categories = ["전체", ...Array.from(new Set(products.map((p) => p.category)))];

  const list = products.filter((p) => category === "전체" || p.category === category);

  return (
    <DataCard
      title="상품 목록"
      action={
        <div className="flex items-center gap-2">
          <label htmlFor="cat-filter" className="text-[0.88rem] text-ink-soft">
            카테고리
          </label>
          <select
            id="cat-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-xl border bg-surface px-3 text-[0.92rem] font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="table-scroll">
        <table className="text-[0.95rem]">
          <thead>
            <tr className="border-b text-left text-[0.85rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
              <th className="py-3 pr-4 font-semibold">제품</th>
              <th className="py-3 pr-4 font-semibold">카테고리</th>
              <th className="py-3 pr-4 font-semibold">판매가</th>
              <th className="py-3 pr-4 font-semibold">원가</th>
              <th className="py-3 pr-4 font-semibold">마진율</th>
              <th className="py-3 pr-4 font-semibold">현재 재고</th>
              <th className="py-3 pr-4 font-semibold">최근 4주 판매</th>
              <th className="py-3 pr-4 font-semibold">상태</th>
              <th className="py-3 font-semibold">주요 채널</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const m = metrics.get(p.id)!;
              const inv = inventory.find((i) => i.productId === p.id);
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b transition-colors hover:bg-surface-muted"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => onSelect(p)}
                >
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-9 shrink-0 rounded-lg bg-surface-muted p-1">
                        <ProductVisual category={p.category} variant={p.id.length} className="h-full" />
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-[0.8rem] text-ink-soft">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">{p.category}</td>
                  <td className="py-3.5 pr-4">{formatPrice(p.price)}</td>
                  <td className="py-3.5 pr-4 text-ink-soft">{formatPrice(p.cost)}</td>
                  <td className="py-3.5 pr-4 font-semibold">{Math.round(m.marginRate * 100)}%</td>
                  <td className="py-3.5 pr-4">{inv?.currentStock.toLocaleString() ?? "-"}</td>
                  <td className="py-3.5 pr-4">
                    {m.recent4wUnits.toLocaleString()}개{" "}
                    <span style={{ color: m.growthRate >= 0 ? "var(--success)" : "var(--danger)" }} className="font-semibold">
                      {formatPct(m.growthRate)}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge tone={saleStatusTone(p.status)}>{p.status}</StatusBadge>
                  </td>
                  <td className="py-3.5 text-[0.88rem] text-ink-soft">
                    {p.mainChannels
                      .map((id) => channels.find((c) => c.id === id)?.name ?? id)
                      .join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DataCard>
  );
}

/* ---------- 재고 Tab ---------- */
function InventoryTab({ onSelect }: { onSelect: (p: Product) => void }) {
  const { products, metrics, inventory } = useAxData();
  const [status, setStatus] = useState("전체");
  const statuses = ["전체", "품절위험", "부족주의", "안정", "과잉"];

  const rows = products
    .map((p) => ({ p, m: metrics.get(p.id)!, inv: inventory.find((i) => i.productId === p.id) }))
    .filter((r) => status === "전체" || r.m.stockStatus === status)
    .sort((a, b) => a.m.daysOfStock - b.m.daysOfStock);

  return (
    <DataCard
      title="재고 현황"
      action={
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className="min-h-[42px] rounded-xl border px-3.5 text-[0.9rem] font-semibold transition-colors"
              style={
                status === s
                  ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }
                  : { borderColor: "var(--border)", color: "var(--text-secondary)" }
              }
            >
              {s}
            </button>
          ))}
        </div>
      }
    >
      <div className="table-scroll">
        <table className="text-[0.95rem]">
          <thead>
            <tr className="border-b text-left text-[0.85rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
              <th className="py-3 pr-4 font-semibold">제품</th>
              <th className="py-3 pr-4 font-semibold">현재 재고</th>
              <th className="py-3 pr-4 font-semibold">일 판매속도</th>
              <th className="py-3 pr-4 font-semibold">예상 소진일</th>
              <th className="py-3 pr-4 font-semibold">입고 예정</th>
              <th className="py-3 pr-4 font-semibold">추천 발주/생산량</th>
              <th className="py-3 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, m, inv }) => (
              <tr
                key={p.id}
                className="cursor-pointer border-b transition-colors hover:bg-surface-muted"
                style={{ borderColor: "var(--border)" }}
                onClick={() => onSelect(p)}
              >
                <td className="py-3.5 pr-4">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[0.8rem] text-ink-soft">{p.sku}</div>
                </td>
                <td className="py-3.5 pr-4">{inv?.currentStock.toLocaleString() ?? "-"}개</td>
                <td className="py-3.5 pr-4">{m.dailyVelocity.toFixed(1)}개/일</td>
                <td className="py-3.5 pr-4 font-semibold">
                  {Number.isFinite(m.daysOfStock) ? `약 ${Math.round(m.daysOfStock)}일` : "-"}
                </td>
                <td className="py-3.5 pr-4 text-ink-soft">
                  {inv?.incomingStock
                    ? `${inv.incomingStock.toLocaleString()}개 (${inv.incomingDate ?? "-"})`
                    : "-"}
                </td>
                <td className="py-3.5 pr-4 font-semibold">
                  {m.recommendedOrder > 0 ? `${m.recommendedOrder.toLocaleString()}개` : "불필요"}
                </td>
                <td className="py-3.5">
                  <StatusBadge tone={stockStatusTone(m.stockStatus)}>{m.stockStatus}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DataCard>
  );
}

/* ---------- OEM 생산 Tab ---------- */
function ProductionTab() {
  const { production, products, metrics } = useAxData();
  const statusTone = (s: string) =>
    s === "생산중" ? "info" : s === "입고예정" ? "warning" : s === "완료" ? "success" : "neutral";

  return (
    <div className="space-y-6">
      <InsightCard
        title="AI 생산 추천"
        summary="판매속도와 재고일수를 기준으로 다음 생산 권장 시점을 계산합니다. 재고 탭의 추천 발주/생산량과 함께 확인하세요."
        compact
      />
      <DataCard title="OEM 생산 현황">
        <div className="table-scroll">
          <table className="text-[0.95rem]">
            <thead>
              <tr className="border-b text-left text-[0.85rem] text-ink-soft" style={{ borderColor: "var(--border)" }}>
                <th className="py-3 pr-4 font-semibold">제품</th>
                <th className="py-3 pr-4 font-semibold">OEM/ODM 업체</th>
                <th className="py-3 pr-4 font-semibold">최근 생산일</th>
                <th className="py-3 pr-4 font-semibold">생산수량</th>
                <th className="py-3 pr-4 font-semibold">입고 예정</th>
                <th className="py-3 pr-4 font-semibold">상태</th>
                <th className="py-3 font-semibold">다음 생산 권장일</th>
              </tr>
            </thead>
            <tbody>
              {production.map((pr) => {
                const p = products.find((x) => x.id === pr.productId);
                const m = p ? metrics.get(p.id) : undefined;
                return (
                  <tr key={pr.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold">{p?.name ?? pr.productId}</div>
                      <div className="text-[0.8rem] text-ink-soft">{p?.sku}</div>
                    </td>
                    <td className="py-3.5 pr-4">{pr.partner}</td>
                    <td className="py-3.5 pr-4">{pr.lastProducedAt}</td>
                    <td className="py-3.5 pr-4">{pr.quantity.toLocaleString()}개</td>
                    <td className="py-3.5 pr-4">{pr.expectedArrival ?? "-"}</td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge tone={statusTone(pr.status) as "info"}>{pr.status}</StatusBadge>
                    </td>
                    <td className="py-3.5">
                      {pr.nextRecommendedAt ?? "-"}
                      {m && m.stockStatus === "품절위험" && (
                        <span className="ml-2">
                          <StatusBadge tone="danger">조기 검토</StatusBadge>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}

/* ---------- 데이터 가져오기 Tab ---------- */
function ImportTab() {
  const [step, setStep] = useState<"select" | "preview" | "done">("select");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);

  function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = text
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .slice(0, 6)
        .map((l) => l.split(","));
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DataCard title="CSV 업로드">
        {step === "select" && (
          <label
            className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors hover:bg-surface-muted"
            style={{ borderColor: "var(--border)" }}
          >
            <Upload size={34} className="text-ink-soft" aria-hidden />
            <span className="font-semibold">CSV 파일을 선택하세요</span>
            <span className="text-[0.88rem] text-ink-soft">
              상품·판매·재고 데이터 CSV를 업로드하면 미리보기 후 적용합니다.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <span className="btn-secondary mt-1 text-[0.92rem]">파일 선택</span>
          </label>
        )}
        {step === "preview" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">{fileName}</span>
              <StatusBadge tone="info">미리보기 (상위 5행)</StatusBadge>
            </div>
            <div className="table-scroll rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <table className="text-[0.85rem]">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={i === 0 ? "bg-surface-muted font-semibold" : "border-t"} style={{ borderColor: "var(--border)" }}>
                      {r.map((c, j) => (
                        <td key={j} className="whitespace-nowrap px-3 py-2">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2.5">
              <button className="btn-primary" onClick={() => setStep("done")}>
                필드 확인 후 적용
              </button>
              <button className="btn-secondary" onClick={() => setStep("select")}>
                다시 선택
              </button>
            </div>
          </div>
        )}
        {step === "done" && (
          <div className="py-8 text-center">
            <StatusBadge tone="success">적용 완료 (Demo)</StatusBadge>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              현재는 Demo Mode로, 업로드된 데이터는 저장되지 않습니다.
              <br />
              Supabase 연동 시 실제 테이블에 반영됩니다.
            </p>
            <button className="btn-secondary mt-4" onClick={() => setStep("select")}>
              다른 파일 업로드
            </button>
          </div>
        )}
      </DataCard>

      <DataCard title="수기 입력 / 안내">
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">
          CSV는 첫 행을 필드명으로 인식합니다. 권장 필드:
        </p>
        <div className="mt-3 rounded-xl bg-surface-muted p-4 font-mono text-[0.85rem]">
          product_name, sku, category, price, cost, stock, weekly_sales
        </div>
        <ul className="mt-4 space-y-2 text-[0.92rem] text-ink-soft">
          <li>· Excel 완전 호환과 파일 매핑 Wizard는 2차 범위입니다.</li>
          <li>· 수기 입력 폼은 Supabase 연동과 함께 활성화됩니다.</li>
          <li>· 잘못 업로드해도 기존 데이터에 영향을 주지 않습니다.</li>
        </ul>
      </DataCard>
    </div>
  );
}

/* ---------- 상품 상세 Drawer ---------- */
function ProductDetailDrawer({
  product,
  onClose,
  data,
}: {
  product: Product | null;
  onClose: () => void;
  data: ReturnType<typeof useAxData>;
}) {
  const weekly = useMemo(() => {
    if (!product) return [];
    return Array.from({ length: 8 }, (_, i) =>
      sum(data.sales.filter((s) => s.productId === product.id).map((r) => r.weeklyUnits[i] ?? 0))
    );
  }, [product, data.sales]);

  if (!product) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;

  const m = data.metrics.get(product.id)!;
  const inv = data.inventory.find((i) => i.productId === product.id);
  const insight = productInsight(product, m);
  const channelSales = data.sales
    .filter((s) => s.productId === product.id)
    .map((s) => ({
      channel: data.channels.find((c) => c.id === s.channelId),
      units: sum(s.weeklyUnits.slice(4)),
    }))
    .sort((a, b) => b.units - a.units);

  return (
    <Drawer open onClose={onClose} title={product.name}>
      <div className="flex items-start gap-5">
        <div className="h-36 w-28 shrink-0 rounded-2xl bg-surface-muted p-3">
          <ProductVisual category={product.category} variant={product.id.length} className="h-full" />
        </div>
        <div className="space-y-1.5 text-[0.95rem]">
          <StatusBadge tone={saleStatusTone(product.status)}>{product.status}</StatusBadge>
          <div className="text-ink-soft">
            {product.sku} · {product.category} · {product.line}
          </div>
          <div className="text-[1.25rem] font-bold">{formatPrice(product.price)}</div>
          <div className="text-ink-soft">
            원가 {formatPrice(product.cost)} · 마진율 {Math.round(m.marginRate * 100)}%
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <div className="text-[0.85rem] text-ink-soft">최근 4주 판매</div>
          <div className="mt-1 text-[1.3rem] font-bold">{m.recent4wUnits.toLocaleString()}개</div>
          <div className="text-[0.88rem] font-semibold" style={{ color: m.growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
            {formatPct(m.growthRate)} vs 이전 4주
          </div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <div className="text-[0.85rem] text-ink-soft">최근 4주 매출</div>
          <div className="mt-1 text-[1.3rem] font-bold">{formatKRW(m.recent4wRevenue)}</div>
          <div className="text-[0.88rem] text-ink-soft">일 평균 {m.dailyVelocity.toFixed(1)}개</div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <div className="text-[0.85rem] text-ink-soft">현재 재고</div>
          <div className="mt-1 text-[1.3rem] font-bold">{inv?.currentStock.toLocaleString() ?? "-"}개</div>
          <div className="text-[0.88rem] text-ink-soft">안전재고 {inv?.safetyStock.toLocaleString() ?? "-"}개</div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
          <div className="text-[0.85rem] text-ink-soft">예상 소진일</div>
          <div className="mt-1 text-[1.3rem] font-bold">
            {Number.isFinite(m.daysOfStock) ? `약 ${Math.round(m.daysOfStock)}일` : "-"}
          </div>
          <StatusBadge tone={stockStatusTone(m.stockStatus)}>{m.stockStatus}</StatusBadge>
        </div>
      </div>

      <h3 className="mt-7 text-[1.08rem] font-bold">판매 추세 (최근 8주)</h3>
      <div className="mt-2">
        <WeeklyTrend weekly={weekly} height={180} />
      </div>

      <h3 className="mt-6 text-[1.08rem] font-bold">채널별 판매 (최근 4주)</h3>
      <ul className="mt-2 space-y-2">
        {channelSales.map(({ channel, units }) => (
          <li key={channel?.id ?? "?"} className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3 text-[0.95rem]">
            <span className="font-medium">{channel?.name ?? "-"}</span>
            <span className="font-semibold">{units.toLocaleString()}개</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <InsightCard title="AI Product Insight" summary={insight.summary} evidence={insight.evidence} compact />
      </div>
    </Drawer>
  );
}
