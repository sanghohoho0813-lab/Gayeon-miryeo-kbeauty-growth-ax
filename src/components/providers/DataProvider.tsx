"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DataSnapshot, DataSource } from "@/lib/data/source";
import { buildModel, type AxModel } from "@/lib/model";
import { candidatesToMaterialize } from "@/lib/analytics";
import { useSession } from "./SessionProvider";

/* Business AX Data — Snapshot 로드 → Model 계산 → RULE 후보 Action 저장(materialize).
   Live 로드 실패 시 error 상태를 그대로 노출한다 (Demo fallback 없음).
   단, 이미 화면을 그린 뒤 다시 불러오기만 실패하면(잠깐 끊긴 연결 등) 마지막 자료를 그대로 두고 stale로 알린다 (PASS 29). */

type LoadStatus = "loading" | "ready" | "error";

interface DataValue {
  status: LoadStatus;
  error?: string;
  /** 마지막 다시 불러오기 실패 — 화면은 이전 자료 기준 (ConnectionBanner가 안내·재시도) */
  stale: boolean;
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
  const [stale, setStale] = useState(false);
  const materializing = useRef(false);
  const loadedFrom = useRef<DataSource | null>(null);

  const refresh = useCallback(async () => {
    if (!source) return;
    try {
      const snap = await source.loadAx();
      loadedFrom.current = source;
      setSnapshot(snap);
      setStatus("ready");
      setError(undefined);
      setStale(false);
    } catch (e) {
      if (loadedFrom.current === source) {
        console.warn("[AX] refresh failed — keeping last snapshot", e);
        setStale(true);
        return;
      }
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

  const value = useMemo<DataValue>(() => ({ status, error, stale, model, source, refresh, run }), [status, error, stale, model, source, refresh, run]);
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
