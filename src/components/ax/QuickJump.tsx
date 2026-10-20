"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, FileText, Package, Search, Sparkles, Wallet, X } from "lucide-react";
import { AX_NAV } from "./nav";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { can, type Permission } from "@/lib/permissions";
import { formatKRW, OPEN_STATUSES } from "@/lib/analytics";
import { receivablesByCounterparty } from "@/lib/settlements";
import { Layer } from "./Modal";
import { chosung, isChosungQuery, normQuery } from "@/lib/search";

/* 빠른 이동 (Ctrl/⌘+K, /) — 화면·상품·거래처(받을 돈)·열린 Action을 이름·SKU·초성으로 찾아 바로 연다.
   메뉴 13개 + 탭 20여 개를 기억하지 않아도 되게. 역할에 없는 화면은 보이지 않는다(메뉴와 같은 규칙). */

export const OPEN_QUICK_JUMP = "miryeo-open-quick-jump";

type Group = "화면" | "상품" | "거래처" | "Action";
const GROUPS: Group[] = ["화면", "상품", "거래처", "Action"];
interface Item { id: string; group: Group; label: string; hint?: string; href: string; keys: string; requires?: Permission }

const SUB_PAGES: Omit<Item, "id" | "group">[] = [
  { label: "대표 보고 모드 (슬라이드)", hint: "대시보드", href: "/ax/present", keys: "보고 발표 슬라이드 프레젠테이션 회의 경영 present" },
  { label: "재고 현황", hint: "상품·재고·생산", href: "/ax/products?tab=inventory", keys: "재고 품절 소진 안전재고 입고예정" },
  { label: "OEM 생산 · 생산 착수 일정", hint: "상품·재고·생산", href: "/ax/products?tab=production", keys: "생산 착수 마감 리드타임 생산기간 moq oem 발주" },
  { label: "B2B 거래처", hint: "채널·B2B·수출", href: "/ax/channels?tab=b2b", keys: "b2b 도매 납품 거래처", requires: "view_commercial" },
  { label: "수출", hint: "채널·B2B·수출", href: "/ax/channels?tab=export", keys: "수출 해외 export", requires: "view_commercial" },
  { label: "정산·미수금", hint: "채널·B2B·수출", href: "/ax/channels?tab=settlements", keys: "정산 미수금 입금 연체 받을돈 청구", requires: "view_financials" },
  { label: "월 매출 목표 · 달성률", hint: "월별 실적", href: "/ax/monthly", keys: "목표 달성률 월매출", requires: "view_financials" },
  { label: "판매 입력 · 판매 파일 올리기", hint: "데이터 관리", href: "/ax/data", keys: "판매 입력 엑셀 csv xlsx 파일 업로드 가져오기 주문" },
  { label: "상품 등록 · 상품·재고 파일", hint: "데이터 관리", href: "/ax/data?tab=products", keys: "상품 등록 sku 상품파일 재고파일 원가 판매가", requires: "edit_master" },
  { label: "채널 등록", hint: "데이터 관리", href: "/ax/data?tab=channels", keys: "채널 등록 판매처 쇼핑몰", requires: "edit_master" },
  { label: "데이터 품질 점검", hint: "데이터 관리", href: "/ax/data?tab=quality", keys: "품질 점검 오류 중복 미래 날짜 실수" },
  { label: "내보내기 · 백업 파일", hint: "데이터 관리", href: "/ax/data?tab=export", keys: "내보내기 다운로드 csv 백업 이관 엑셀" },
  { label: "주간 리포트 (인쇄·PDF)", hint: "실증·Evidence", href: "/ax/reports/weekly", keys: "주간 리포트 pdf 인쇄 보고서" },
  { label: "Baseline 잠금 · Money KPI", hint: "실증·Evidence", href: "/ax/reports#baseline", keys: "baseline 기준값 kpi 잠금 효과" },
  { label: "면담·현장확인 대비", hint: "사업화·현장확인", href: "/ax/business?tab=inspection", keys: "현장확인 면담 시연 질문 실사", requires: "view_financials" },
  { label: "구성원·권한", hint: "설정", href: "/ax/settings#members", keys: "구성원 초대 권한 역할 직원 관리자" },
  { label: "고객 화면 (MIRYEO AI Beauty)", hint: "고객용", href: "/beauty", keys: "고객 화면 beauty 파인더 추천" },
];

function score(item: Item, q: string): number {
  if (!q) return 1;
  const label = normQuery(item.label);
  const all = normQuery(`${item.label} ${item.keys} ${item.hint ?? ""}`);
  if (label.startsWith(q)) return 4;
  if (label.includes(q)) return 3;
  if (all.includes(q)) return 2;
  if (isChosungQuery(q) && normQuery(chosung(item.label)).includes(q)) return 1.5;
  return 0;
}

export function QuickJumpButton() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(OPEN_QUICK_JUMP))}
      className="flex h-11 shrink-0 items-center gap-2 rounded-xl px-2.5 text-ink-soft hover:bg-surface-muted @5xl:border @5xl:px-3"
      style={{ borderColor: "var(--border)" }}
      aria-label="빠른 이동 — 화면·상품·Action 찾기"
      data-testid="quick-jump-open"
    >
      <Search size={19} aria-hidden />
      <span className="hidden whitespace-nowrap text-left text-[0.86rem] @5xl:inline">빠른 이동</span>
      <kbd className="hidden whitespace-nowrap rounded-md border px-1.5 py-0.5 font-sans text-[0.7rem] @5xl:inline" style={{ borderColor: "var(--border)" }}>{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}

export function QuickJump() {
  const router = useRouter();
  const { model } = useData();
  const { role, roleReady } = useSession();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<Element | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
    (trigger.current as HTMLElement | null)?.focus?.();
  }, []);

  useEffect(() => {
    const show = () => { trigger.current = document.activeElement; setOpen(true); };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (window.location.pathname.startsWith("/ax/present")) return; // 보고 모드는 자체 키(←/→·숫자)를 쓴다
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); show(); }
      else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); show(); }
    };
    window.addEventListener(OPEN_QUICK_JUMP, show);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(OPEN_QUICK_JUMP, show); window.removeEventListener("keydown", onKey); };
  }, []);

  const items = useMemo<Item[]>(() => {
    const allowed = (r?: Permission) => !r || (roleReady && can(role, r));
    const pages: Item[] = AX_NAV.flatMap((g) => g.items.filter((i) => allowed(i.requires)).map((i) => ({ id: `p:${i.href}`, group: "화면" as const, label: i.label, hint: g.group, href: i.href, keys: "" })));
    const subs: Item[] = SUB_PAGES.filter((s) => allowed(s.requires)).map((s) => ({ ...s, id: `s:${s.href}`, group: "화면" as const }));
    const products: Item[] = (model?.snapshot.products ?? []).map((p) => ({ id: `pr:${p.id}`, group: "상품" as const, label: p.name, hint: p.sku, href: `/ax/products?tab=inventory&p=${encodeURIComponent(p.id)}`, keys: `${p.sku} ${p.category} ${p.line ?? ""}` }));
    const actions: Item[] = (model?.actions ?? []).filter((a) => OPEN_STATUSES.includes(a.status)).map((a) => ({ id: `a:${a.id}`, group: "Action" as const, label: a.title, hint: `${a.priority} · ${a.category}`, href: `/ax/growth?a=${encodeURIComponent(a.id)}`, keys: a.judgement }));
    // 거래처 (PASS 31, D-099): 받을 돈이 남은 거래처 → 정산 목록을 그 거래처로 걸러 연다 (재무 권한)
    const parties: Item[] = model && allowed("view_financials") ? receivablesByCounterparty(model.snapshot.settlements, model.today).map((c) => ({ id: `c:${c.counterparty}`, group: "거래처" as const, label: c.counterparty, hint: `받을 돈 ${formatKRW(c.amount)}${c.overdueAmount > 0 ? ` · 연체 ${c.maxOverdueDays}일` : ""}`, href: `/ax/channels?tab=settlements&q=${encodeURIComponent(c.counterparty)}`, keys: "거래처 정산 미수금 받을돈" })) : [];
    return [...pages, ...subs, ...products, ...parties, ...actions];
  }, [model, role, roleReady]);

  const results = useMemo(() => {
    const nq = normQuery(q);
    const ranked = items.map((it) => ({ it, s: score(it, nq) })).filter((x) => x.s > 0);
    const byGroup: Record<Group, Item[]> = { 화면: [], 상품: [], 거래처: [], Action: [] };
    for (const g of GROUPS) {
      byGroup[g] = ranked.filter((x) => x.it.group === g).sort((a, b) => b.s - a.s).slice(0, nq ? 8 : g === "화면" ? 8 : 4).map((x) => x.it);
    }
    return byGroup;
  }, [items, q]);
  const flat = useMemo(() => GROUPS.flatMap((g) => results[g]), [results]);
  useEffect(() => setActive(0), [q]);

  const go = (it: Item) => { close(); router.push(it.href); };
  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter·화살표는 입력기 몫
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && flat[active]) { e.preventDefault(); go(flat[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { e.preventDefault(); } // 포커스는 입력칸에 고정 (목록은 화살표로)
  };
  const icon = (g: Group) => (g === "상품" ? <Package size={16} aria-hidden /> : g === "Action" ? <Sparkles size={16} aria-hidden /> : g === "거래처" ? <Wallet size={16} aria-hidden /> : <FileText size={16} aria-hidden />);
  let idx = -1;

  // 헤더(@container) 안에 그려지므로 body 바로 아래(portal)로 — 그래야 화면 전체를 덮는다
  return (
    <Layer>
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="빠른 이동" data-print="hide">
      <button className="route-fade absolute inset-0 bg-black/45" aria-label="닫기" tabIndex={-1} onClick={close} />
      <div className="ax-card modal-in relative flex max-h-[76vh] w-full max-w-[640px] flex-col overflow-hidden !p-0" data-testid="quick-jump">
        <div className="flex items-center gap-2 border-b px-4 focus-within:shadow-[inset_0_-2px_0_var(--primary)]" style={{ borderColor: "var(--border)" }}>
          <Search size={19} className="shrink-0 text-ink-soft" aria-hidden />
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="qj-list"
            aria-activedescendant={flat[active] ? `qj-${flat[active].id}` : undefined}
            aria-autocomplete="list"
            aria-label="화면·상품·Action 검색"
            placeholder="화면, 상품명·SKU, Action 검색 (초성 가능: ㅈㄱ)"
            className="h-14 min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-ink-soft focus-visible:!shadow-none focus-visible:!outline-none"
          />
          <button onClick={close} aria-label="닫기" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted"><X size={19} /></button>
        </div>
        {flat.length === 0 && <p className="px-3 py-6 text-center text-[0.92rem] text-ink-soft" role="status">&lsquo;{q}&rsquo;에 맞는 화면·상품·거래처·Action이 없습니다</p>}
        <ul id="qj-list" role="listbox" aria-label="검색 결과" className="min-h-0 flex-1 overflow-y-auto p-2" hidden={flat.length === 0}>
          {GROUPS.map((g) =>
            results[g].length === 0 ? null : (
              <li key={g} role="presentation">
                <div className="px-3 pb-1 pt-2.5 text-[0.75rem] font-semibold tracking-wide text-ink-soft" aria-hidden="true">{g === "Action" ? "열린 Action" : g}</div>
                <ul role="group" aria-label={g === "Action" ? "열린 Action" : g}>
                  {results[g].map((it) => {
                    idx++;
                    const i = idx;
                    const sel = i === active;
                    return (
                      <li
                        key={it.id}
                        id={`qj-${it.id}`}
                        role="option"
                        aria-selected={sel}
                        onMouseMove={() => setActive(i)}
                        onClick={() => go(it)}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2"
                        style={sel ? { background: "var(--primary-soft)", color: "var(--primary)" } : undefined}
                      >
                        <span className={sel ? "" : "text-ink-soft"}>{icon(g)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.95rem] font-semibold">{it.label}</span>
                          {it.hint && <span className="block truncate text-[0.78rem] text-ink-soft">{it.hint}</span>}
                        </span>
                        {sel && <CornerDownLeft size={15} aria-hidden />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            )
          )}
        </ul>
        <div className="hidden items-center gap-3 border-t px-4 py-2 text-[0.75rem] text-ink-soft sm:flex" style={{ borderColor: "var(--border)" }}>
          <span>↑↓ 이동</span><span>Enter 열기</span><span>Esc 닫기</span><span className="ml-auto">/ 또는 Ctrl·⌘ K</span>
        </div>
      </div>
    </div>
    </Layer>
  );
}
