import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight lg:text-[1.9rem]">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-[46rem] text-[0.98rem] leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
