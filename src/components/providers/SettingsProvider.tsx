"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/* 화면 설정 — Theme(Canonical 7) / 글자 크기 / 모션 / 튜토리얼.
   localStorage 저장 + storage 이벤트로 PC 화면과 Mobile iframe 상태를 동일하게 유지한다. */

import { AX_THEMES, SETTINGS_KEYS as K, normalizeTheme, type FontScale, type ThemeId } from "@/lib/themes";

export { AX_THEMES, normalizeTheme };
export type { FontScale, ThemeId };

interface SettingsValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  tutorialSeen: boolean;
  markTutorialSeen: () => void;
  resetTutorial: () => void;
}

const Ctx = createContext<SettingsValue | null>(null);

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function set(key: string, v: string | null) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v); } catch { /* noop */ }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("deep-navy");
  const [fontScale, setFontScaleState] = useState<FontScale>("default");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true); // SSR 중 비노출
  // 저장값을 읽기 전에는 <html> 속성을 건드리지 않는다 — layout의 SETTINGS_BOOT_SCRIPT가 첫 화면 전에 이미 적용함 (기본 테마 깜빡임 방지)
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    const rawTheme = get(K.theme);
    const t = normalizeTheme(rawTheme);
    if (rawTheme && rawTheme !== t) set(K.theme, t); // legacy migration 저장
    setThemeState(t);
    const f = get(K.font) as FontScale | null;
    setFontScaleState(f === "small" || f === "large" ? f : "default");
    setReduceMotionState(get(K.motion) === "reduce");
    setTutorialSeen(get(K.tutorial) === "1");
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || (Object.values(K) as string[]).includes(e.key)) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  useEffect(() => { if (loaded) document.documentElement.setAttribute("data-ax-theme", theme); }, [loaded, theme]);
  useEffect(() => {
    if (!loaded) return;
    if (fontScale === "default") document.documentElement.removeAttribute("data-fontscale");
    else document.documentElement.setAttribute("data-fontscale", fontScale);
  }, [loaded, fontScale]);
  useEffect(() => {
    if (!loaded) return;
    if (reduceMotion) document.documentElement.setAttribute("data-motion", "reduce");
    else document.documentElement.removeAttribute("data-motion");
  }, [loaded, reduceMotion]);

  const value: SettingsValue = {
    theme,
    setTheme: (t) => { setThemeState(t); set(K.theme, t); },
    fontScale,
    setFontScale: (f) => { setFontScaleState(f); set(K.font, f); },
    reduceMotion,
    setReduceMotion: (v) => { setReduceMotionState(v); set(K.motion, v ? "reduce" : null); },
    tutorialSeen,
    markTutorialSeen: () => { setTutorialSeen(true); set(K.tutorial, "1"); },
    resetTutorial: () => { setTutorialSeen(false); set(K.tutorial, null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used within SettingsProvider");
  return v;
}
