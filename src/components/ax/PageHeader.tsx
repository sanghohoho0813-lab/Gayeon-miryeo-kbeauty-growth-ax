import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-bold leading-tight @3xl:text-[1.85rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[46rem] text-[0.97rem] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
