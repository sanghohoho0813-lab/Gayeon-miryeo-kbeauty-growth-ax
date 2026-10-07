/* 화면 설정 상수 — 서버(layout의 첫 화면 전 스크립트)와 클라이언트(SettingsProvider)가 함께 쓴다. React 의존 없음. */

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
export const LEGACY_THEME: Record<string, ThemeId> = {
  "burgundy-slate": "deep-navy",
  "plum-indigo": "deep-navy",
  "steel-platinum": "pure-white",
};

export function normalizeTheme(raw: string | null | undefined): ThemeId {
  if (!raw) return "deep-navy";
  if (AX_THEMES.some((t) => t.id === raw)) return raw as ThemeId;
  return LEGACY_THEME[raw] ?? "deep-navy";
}

export const SETTINGS_KEYS = { theme: "miryeo-ax-theme", font: "miryeo-ax-fontscale", motion: "miryeo-ax-motion", tutorial: "miryeo-ax-tutorial-v2" } as const;


/** 첫 화면 그리기 전에 저장된 테마·글자 크기·모션 줄이기를 <html>에 적용 (hydration 후 적용하면 기본 테마가 잠깐 보이고, 모션 줄이기 사용자에게 첫 애니메이션이 재생됨) */
export const SETTINGS_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage,ids=${JSON.stringify(AX_THEMES.map((t) => t.id))},leg=${JSON.stringify(LEGACY_THEME)};var t=s.getItem(${JSON.stringify(SETTINGS_KEYS.theme)});t=ids.indexOf(t)>=0?t:(leg[t]||"deep-navy");d.setAttribute("data-ax-theme",t);var f=s.getItem(${JSON.stringify(SETTINGS_KEYS.font)});if(f==="small"||f==="large")d.setAttribute("data-fontscale",f);if(s.getItem(${JSON.stringify(SETTINGS_KEYS.motion)})==="reduce")d.setAttribute("data-motion","reduce");}catch(e){}})();`;
