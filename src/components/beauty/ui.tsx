"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Crown, Gift, Heart, Search, Sparkles, Star, User } from "lucide-react";
import { CONCERNS } from "./concerns";
import { ProductVisual } from "@/components/shared/ProductVisual";
import type { Product, SkinConcern } from "@/lib/types";

/* 고객 앱 커머스형 공용 부품 (PASS 26, D-082) — 섹션 머리 · 검색칸 · 배너 넘기기 · 피부 고민 타일 · 제품 종류 동그라미
   문구 원칙: 실제 기능·실제 데이터만 (가짜 할인·별점·배송·후기 없음) */

/** 고민별 파스텔 — 타일·Finder 카드에서 같은 색 */
export const CONCERN_TINT: Record<SkinConcern, { bg: string; fg: string }> = {
  수분: { bg: "var(--t-sky)", fg: "#2B6CB0" },
  진정: { bg: "var(--t-mint)", fg: "#2F7A5B" },
  탄력: { bg: "var(--t-lilac)", fg: "#6A4FB3" },
  피부결: { bg: "var(--t-peach)", fg: "#B4572A" },
  광채: { bg: "var(--t-butter)", fg: "#8A6400" },
  "데일리 케어": { bg: "var(--t-blush)", fg: "#B8355B" },
};

export function SectionHead({ title, sub, href, linkLabel = "전체 보기 →", id }: { title: ReactNode; sub?: ReactNode; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="b-section text-[1.18rem] @3xl:text-[1.4rem]">{title}</h2>
        {sub && <p className="b-caption mt-0.5 text-[0.84rem]">{sub}</p>}
      </div>
      {href && <Link href={href} className="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap text-[0.86rem] font-semibold" style={{ color: "var(--b-text-soft)" }}>{linkLabel}</Link>}
    </div>
  );
}

/** 홈·상단의 검색칸 — 누르면 제품 화면 검색으로 */
export function SearchLink({ placeholder = "제품명이나 피부 고민으로 찾아보세요" }: { placeholder?: string }) {
  return (
    <Link href="/beauty/products?focus=search" className="flex h-[50px] w-full items-center gap-2.5 rounded-2xl px-4 text-[0.94rem]" style={{ background: "var(--b-soft)", color: "var(--b-text-soft)" }} data-testid="home-search">
      <Search size={19} aria-hidden style={{ color: "var(--b-text)" }} />
      <span className="truncate">{placeholder}</span>
    </Link>
  );
}

export interface Banner { key: string; href: string; tag: string; title: string; sub: string; cta: string; bg: string; dark?: boolean; art: ReactNode; testId?: string }

/** 배너 넘기기 — 손가락으로 넘김(scroll-snap), 점 표시, PC는 이전·다음 버튼. 자동 넘김 없음(접근성) */
export function PromoCarousel({ banners }: { banners: Banner[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setCur(Number((e.target as HTMLElement).dataset.i))), { root: el, threshold: 0.6 });
    el.querySelectorAll("[data-i]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [banners.length]);
  const go = (i: number) => ref.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  return (
    <section aria-label="MIRYEO 소식" className="relative">
      <div ref={ref} className="b-rail !gap-3" data-testid="promo-carousel">
        {banners.map((b, i) => (
          <Link key={b.key} href={b.href} data-i={i} data-testid={b.testId}
            className="relative flex h-[214px] w-[88%] max-w-[560px] overflow-hidden rounded-[24px] p-5 @3xl:h-[248px] @3xl:w-[48%] @3xl:p-8"
            style={{ background: b.bg, color: b.dark ? "#fff" : "var(--b-text)" }}>
            <div className="relative z-10 flex max-w-[64%] flex-col @3xl:max-w-[58%]">
              <span className="b-pill self-start" style={b.dark ? { background: "rgba(255,255,255,.16)", color: "#fff" } : { background: "rgba(255,255,255,.85)", color: "var(--b-rose-ink)" }}>{b.tag}</span>
              <span className="mt-2.5 whitespace-pre-line text-[1.12rem] font-extrabold leading-[1.3] tracking-[-0.03em] @3xl:text-[1.6rem]">{b.title}</span>
              <span className="mt-1.5 line-clamp-1 text-[0.76rem] font-medium leading-snug @3xl:line-clamp-2 @3xl:text-[0.9rem]" style={{ opacity: 0.82 }}>{b.sub}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[0.86rem] font-extrabold">{b.cta} <ChevronRight size={16} aria-hidden /></span>
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[42%] items-end justify-center @3xl:w-[44%]" aria-hidden>{b.art}</div>
          </Link>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5" aria-hidden>
        {banners.map((b, i) => <span key={b.key} className="h-1.5 rounded-full transition-all" style={{ width: i === cur ? 18 : 6, background: i === cur ? "var(--b-text)" : "var(--b-line-strong)" }} />)}
      </div>
      <button type="button" aria-label="이전 배너" onClick={() => go(Math.max(0, cur - 1))} className="absolute -left-5 top-[124px] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md @3xl:flex"><ChevronLeft size={18} /></button>
      <button type="button" aria-label="다음 배너" onClick={() => go(Math.min(banners.length - 1, cur + 1))} className="absolute -right-5 top-[124px] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md @3xl:flex"><ChevronRight size={18} /></button>
    </section>
  );
}

/** 피부 고민 6타일 — 파스텔 바탕 · 아이콘 · '나의 고민' 표시(저장된 고민이 있을 때만) */
export function ConcernTiles({ mine = [] }: { mine?: SkinConcern[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2.5 @3xl:grid-cols-6 @3xl:gap-3">
      {CONCERNS.map((c) => {
        const t = CONCERN_TINT[c.id];
        const my = mine.includes(c.id);
        return (
          <li key={c.id}>
            <Link href={`/beauty/products?concern=${encodeURIComponent(c.id)}`} className="pressable relative flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-[20px] px-1.5 py-3 text-center" style={{ background: t.bg }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-6px_rgba(0,0,0,.25)]" style={{ color: t.fg }}>
                <c.icon size={21} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[0.86rem] font-bold leading-tight">{c.label}</span>
              {my && <span className="b-pill absolute right-1.5 top-1.5 bg-white" style={{ color: "var(--b-rose-ink)" }}>나의 고민</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** 제품 종류 — 동그라미 사진 (그 종류의 실제 제품 사진 한 장) */
export function CategoryRail({ products }: { products: Product[] }) {
  const cats = Array.from(new Map(products.map((p) => [p.category, p])).values());
  return (
    <div className="b-rail !gap-4 @3xl:!gap-7">
      {cats.map((p) => (
        <Link key={p.category} href={`/beauty/products?category=${encodeURIComponent(p.category)}`} className="flex w-[76px] flex-col items-center gap-2 text-center @3xl:w-[96px]">
          <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full @3xl:h-[96px] @3xl:w-[96px]" style={{ background: "var(--b-surface-warm)" }}>
            <span className="h-[70%]"><ProductVisual category={p.category} variant={p.id.length} productId={p.id} className="h-full" /></span>
          </span>
          <span className="text-[0.8rem] font-semibold leading-tight [word-break:keep-all]">{p.category}</span>
        </Link>
      ))}
    </div>
  );
}

/** 바로가기 아이콘 줄 — 앱 첫 화면의 둥근 메뉴 (모두 실제 화면으로 연결) */
export function QuickMenu({ member }: { member: boolean }) {
  const items = [
    { href: "/beauty/finder", label: "1분 상담", icon: Sparkles, bg: "var(--t-blush)", fg: "#B8355B" },
    { href: "/beauty/products?best=1", label: "베스트", icon: Crown, bg: "var(--t-butter)", fg: "#8A6400" },
    { href: "/beauty/products?sort=new", label: "신제품", icon: Star, bg: "var(--t-lilac)", fg: "#6A4FB3" },
    { href: "/beauty/passport#saved", label: "찜한 제품", icon: Heart, bg: "var(--t-peach)", fg: "#B4572A" },
    member ? { href: "/beauty/me", label: "마이페이지", icon: User, bg: "var(--t-mint)", fg: "#2F7A5B" } : { href: "/beauty/login?mode=signup", label: "회원 혜택", icon: Gift, bg: "var(--t-mint)", fg: "#2F7A5B" },
  ];
  return (
    <nav aria-label="바로가기" data-testid="quick-menu">
      <ul className="grid grid-cols-5 gap-1 @3xl:flex @3xl:gap-8">
        {items.map((it) => (
          <li key={it.label}>
            <Link href={it.href} className="pressable flex flex-col items-center gap-1.5 rounded-2xl py-1 text-center">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] @3xl:h-14 @3xl:w-14" style={{ background: it.bg, color: it.fg }}><it.icon size={23} strokeWidth={2} aria-hidden /></span>
              <span className="text-[0.76rem] font-bold leading-tight @3xl:text-[0.84rem]">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
