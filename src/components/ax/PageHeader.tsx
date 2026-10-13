import type { ReactNode } from "react";

/* 화면 제목 — 모바일은 제목·설명을 줄여 첫 화면에 내용이 보이게 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-2.5 @md:mb-6 @3xl:flex-row @3xl:items-end @3xl:justify-between @3xl:gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.4rem] font-bold leading-tight tracking-tight @md:text-[1.65rem] @3xl:text-[1.85rem]">{title}</h1>
        {description && <p className="mt-1 max-w-[46rem] text-[0.9rem] leading-relaxed text-ink-soft @md:mt-1.5 @md:text-[0.97rem]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
