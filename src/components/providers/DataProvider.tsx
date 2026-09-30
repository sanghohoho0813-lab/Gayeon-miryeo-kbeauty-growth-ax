"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DataSnapshot, DataSource } from "@/lib/data/source";
import { buildModel, type AxModel } from "@/lib/model";
import { candidatesToMaterialize } from "@/lib/analytics";
import { useSession } from "./SessionProvider";

/* Business AX Data — Snapshot 로드 → Model 계산 → RULE 후보 Action 저장(materialize).
   Live 로드 실패 시 error 상태를 그대로 노출한다 (Demo fallback 없음). */

type LoadStatus = "loading" | "ready" | "error";

interface DataValue {
  status: LoadStatus;
  error?: string;
  model: AxModel | null;
  source: DataSource | null;
  refresh: () => Promise<void>;
  /** mutation 실행 후 자동 refresh. 오류는 throw → 호출 화면에서 Toast */
  run: <T>(fn: (s: DataSource) => Promise<T>) => Promise<T>;
}

const Ctx = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { source, status: sessionStatus } = useSession();
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>();
  const materializing = useRef(false);

  const refresh = useCallback(async () => {
    if (!source) return;
    try {
      const snap = await source.loadAx();
      setSnapshot(snap);
      setStatus("ready");
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [source]);

  useEffect(() => {
    if (sessionStatus !== "ready" || !source) return;
    refresh();
    return source.subscribe(() => void refresh());
  }, [sessionStatus, source, refresh]);

  const model = useMemo(() => (snapshot ? buildModel(snapshot) : null), [snapshot]);

  // RULE 감지 → Growth Action 저장 (감지 시각 = created_at, COST KPI 측정 기준)
  useEffect(() => {
    if (!model || !source || materializing.current) return;
    const toCreate = candidatesToMaterialize(model.candidates, model.snapshot.actions);
    if (toCreate.length === 0) return;
    materializing.current = true;
    source
      .createActions(toCreate)
      .then(() => refresh())
      .catch((e) => console.warn("[AX] action materialize failed", e))
      .finally(() => { materializing.current = false; });
  }, [model, source, refresh]);

  const run = useCallback(async <T,>(fn: (s: DataSource) => Promise<T>) => {
    if (!source) throw new Error("데이터 소스가 준비되지 않았습니다.");
    const result = await fn(source);
    await refresh();
    return result;
  }, [source, refresh]);

  const value = useMemo<DataValue>(() => ({ status, error, model, source, refresh, run }), [status, error, model, source, refresh, run]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used within DataProvider");
  return v;
}

/** 로드 완료된 Model만 필요한 화면용 (AxGate 안에서만 사용) */
export function useModel(): AxModel {
  const { model } = useData();
  if (!model) throw new Error("model not ready");
  return model;
}
