"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/* 화면 설정 — Theme(Canonical 7) / 글자 크기 / 모션 / 튜토리얼.
   localStorage 저장 + storage 이벤트로 PC 화면과 Mobile iframe 상태를 동일하게 유지한다. */

export const AX_THEMES = [
  { id: "deep-navy", no: "01", name: "딥 네이비 블루", colors: ["#0B1830", "#2457D6", "#1687A7", "#17A889", "#E7C873", "#DCE8F7"] },
  { id: "navy-gold", no: "02", name: "네이비 골드", colors: ["#111A2D", "#2847A7", "#A37A28", "#D0A84B", "#F0D995", "#EFE8D7"] },
  { id: "emerald-gold", no: "03", name: "에메랄드 골드", colors: ["#11332B", "#0E7663", "#2C9277", "#B4862A", "#E8CE88", "#E2F0EA"] },
  { id: "forest-sage", no: "04", name: "포레스트 세이지", colors: ["#17352C", "#356E58", "#73977E", "#A58E4D", "#D9D2AA", "#E5ECE5"] },
  { id: "deep-teal", no: "05", name: "딥 틸", colors: ["#08323A", "#087A83", "#1597A3", "#D2704C", "#E9B59B", "#DDEDEF"] },
  { id: "onyx-gold", no: "06", name: "오닉스 골드", colors: ["#15171C", "#343942", "#6A717C", "#B89032", "#E0C76F", "#E6E8EC"] },
  { id: "pure-white", no: "07", name: "퓨어 화이트", colors: ["#FFFFFF", "#171B20", "#343B44", "#6B7680", "#D47A4A", "#FAFAF8"] },
] as const;

export type ThemeId = (typeof AX_THEMES)[number]["id"];
export type FontScale = "small" | "default" | "large";

/** 구버전(9 Theme) ID → Canonical 7 (DECISIONS D-009) */
const LEGACY_THEME: Record<string, ThemeId> = {
  "burgundy-slate": "deep-navy",
  "plum-indigo": "deep-navy",
  "steel-platinum": "pure-white",
};

export function normalizeTheme(raw: string | null | undefined): ThemeId {
  if (!raw) return "deep-navy";
  if (AX_THEMES.some((t) => t.id === raw)) return raw as ThemeId;
  return LEGACY_THEME[raw] ?? "deep-navy";
}

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
const K = { theme: "miryeo-ax-theme", font: "miryeo-ax-fontscale", motion: "miryeo-ax-motion", tutorial: "miryeo-ax-tutorial-v2" };

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

  const load = useCallback(() => {
    const rawTheme = get(K.theme);
    const t = normalizeTheme(rawTheme);
    if (rawTheme && rawTheme !== t) set(K.theme, t); // legacy migration 저장
    setThemeState(t);
    const f = get(K.font) as FontScale | null;
    setFontScaleState(f === "small" || f === "large" ? f : "default");
    setReduceMotionState(get(K.motion) === "reduce");
    setTutorialSeen(get(K.tutorial) === "1");
  }, []);

  useEffect(() => {
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || Object.values(K).includes(e.key)) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  useEffect(() => { document.documentElement.setAttribute("data-ax-theme", theme); }, [theme]);
  useEffect(() => {
    if (fontScale === "default") document.documentElement.removeAttribute("data-fontscale");
    else document.documentElement.setAttribute("data-fontscale", fontScale);
  }, [fontScale]);
  useEffect(() => {
    if (reduceMotion) document.documentElement.setAttribute("data-motion", "reduce");
    else document.documentElement.removeAttribute("data-motion");
  }, [reduceMotion]);

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
