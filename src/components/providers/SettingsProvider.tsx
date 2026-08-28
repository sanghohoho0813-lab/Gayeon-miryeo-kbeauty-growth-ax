"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* Business AX 테마 + 글자 크기 설정 Provider
   localStorage에 저장하고 <html>의 data attribute로 즉시 반영한다. */

export const AX_THEMES = [
  { id: "deep-navy", name: "딥 네이비 블루", desc: "남색 · 차분 · 딜", colors: ["#14213d", "#1b3a6b", "#3a6ea5", "#d9a441"] },
  { id: "navy-gold", name: "네이비 골드", desc: "남색 · 앤티크 금", colors: ["#1a2438", "#1f3050", "#b8912f", "#d8c07a"] },
  { id: "emerald-gold", name: "에메랄드 골드", desc: "짙은 초록 · 섬세한 금", colors: ["#103524", "#14532d", "#2f8a55", "#b8912f"] },
  { id: "forest-sage", name: "포레스트 세이지", desc: "깊은 숲 · 세이지", colors: ["#2c3a24", "#3f5233", "#7d8f69", "#cdd6c0"] },
  { id: "deep-teal", name: "딥 틸", desc: "청록 · 테라코타", colors: ["#0c3b40", "#0f5e63", "#2b8a8f", "#d9a441"] },
  { id: "onyx-gold", name: "오닉스 골드", desc: "차콜 · 밝은 금빛", colors: ["#1c1c1a", "#2b2b28", "#b8912f", "#d8c07a"] },
  { id: "burgundy-slate", name: "버건디 슬레이트", desc: "슬레이트 · 다크 포인트", colors: ["#3a2229", "#6d2434", "#55606e", "#d0a25a"] },
  { id: "plum-indigo", name: "플럼 인디고", desc: "인디고 · 자줏빛 포인트", colors: ["#2c2044", "#4b2d73", "#6d5a9e", "#d9a441"] },
  { id: "steel-platinum", name: "스틸 플래티넘", desc: "스틸 그레이 · 은빛 블루", colors: ["#26333f", "#33475c", "#6b8299", "#c8d4de"] },
] as const;

export type ThemeId = (typeof AX_THEMES)[number]["id"];
export type FontScale = "small" | "default" | "large";

interface SettingsContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
  tutorialSeen: boolean;
  markTutorialSeen: () => void;
  resetTutorial: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const THEME_KEY = "miryeo-ax-theme";
const FONT_KEY = "miryeo-ax-fontscale";
const TUTORIAL_KEY = "miryeo-ax-tutorial-seen";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("deep-navy");
  const [fontScale, setFontScaleState] = useState<FontScale>("default");
  const [tutorialSeen, setTutorialSeen] = useState(true); // SSR 중에는 모달 미노출

  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as ThemeId | null;
      if (t && AX_THEMES.some((th) => th.id === t)) setThemeState(t);
      const f = localStorage.getItem(FONT_KEY) as FontScale | null;
      if (f && ["small", "default", "large"].includes(f)) setFontScaleState(f);
      setTutorialSeen(localStorage.getItem(TUTORIAL_KEY) === "1");
    } catch {
      /* localStorage 접근 불가 환경에서는 기본값 유지 */
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-ax-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (fontScale === "default") document.documentElement.removeAttribute("data-fontscale");
    else document.documentElement.setAttribute("data-fontscale", fontScale);
  }, [fontScale]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_KEY, t); } catch { /* noop */ }
  }, []);

  const setFontScale = useCallback((f: FontScale) => {
    setFontScaleState(f);
    try { localStorage.setItem(FONT_KEY, f); } catch { /* noop */ }
  }, []);

  const markTutorialSeen = useCallback(() => {
    setTutorialSeen(true);
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch { /* noop */ }
  }, []);

  const resetTutorial = useCallback(() => {
    setTutorialSeen(false);
    try { localStorage.removeItem(TUTORIAL_KEY); } catch { /* noop */ }
  }, []);

  return (
    <SettingsContext.Provider
      value={{ theme, setTheme, fontScale, setFontScale, tutorialSeen, markTutorialSeen, resetTutorial }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
