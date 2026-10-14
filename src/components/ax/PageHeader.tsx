import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

/* 화면 제목 (D-075) — 설명 문장은 제목 옆 ⓘ 안내로 옮겨 첫 화면에 내용이 바로 보이게 */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2.5 @md:mb-5 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-3">
      <div className="flex min-w-0 items-center gap-1.5 @3xl:shrink-0">
        <h1 className="text-[1.4rem] font-bold leading-tight tracking-tight @md:text-[1.65rem] @3xl:text-[1.85rem]">{title}</h1>
        {description && <InfoTip text={description} label={`${title} 화면 설명`} />}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 @3xl:justify-end">{actions}</div>}
    </div>
  );
}
