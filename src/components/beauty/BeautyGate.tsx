"use client";

import type { ReactNode } from "react";
import { useBeautyData } from "./BeautyDataProvider";

export function BeautyGate({ children }: { children: ReactNode }) {
  const { status, error, reload } = useBeautyData();
  if (status === "loading") {
    return (
      <div className="grid grid-cols-2 gap-4 pt-8 @3xl:grid-cols-4" aria-busy="true" aria-label="불러오는 중">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-[20px]" style={{ background: "var(--b-surface-warm)" }} />)}
      </div>
    );
  }
  if (status === "misconfigured") {
    return <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center"><p className="font-bold">서비스 준비 중입니다</p><p className="mt-2 text-[0.9rem]" style={{ color: "var(--b-text-soft)" }}>잠시 후 다시 방문해 주세요.</p></div>;
  }
  if (status === "error") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-center" role="alert">
        <p className="font-bold">제품 정보를 불러오지 못했습니다</p>
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--b-text-soft)" }}>{error}</p>
        <button onClick={reload} className="mt-4 rounded-2xl px-5 py-3 font-bold text-white" style={{ background: "var(--b-navy)" }}>다시 시도</button>
      </div>
    );
  }
  return <>{children}</>;
}
