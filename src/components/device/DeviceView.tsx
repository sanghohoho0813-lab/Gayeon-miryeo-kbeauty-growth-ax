"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns2, Monitor, Smartphone } from "lucide-react";

/* ==========================================================================
   Device View — Unified v4.1 P0
   - Desktop(≥1024px, iframe 밖)에서 [PC] [Mobile] [PC+Mobile]
   - Mobile = 동일 앱 / 동일 Route / 동일 Data를 390×844 iframe(?frame=mobile)으로 실제 렌더
   - Parent ↔ Frame postMessage Route Sync (origin + source 검증, 동일 경로 재이동 금지 → Loop 방지)
   - Frame 안에서는 Device View 재생성 금지 (window.self !== window.top)
   ========================================================================== */

export type DeviceMode = "pc" | "mobile" | "dual";
const MODE_KEY = "miryeo-device-view";
const MSG_ROUTE = "miryeo:route";       // frame → parent
const MSG_NAVIGATE = "miryeo:navigate"; // parent → frame
const FRAME_W = 390;
const FRAME_H = 844;
const BORDER = 10;

interface DeviceValue {
  mode: DeviceMode;
  setMode: (m: DeviceMode) => void;
  isFrame: boolean;
  /** Device Switch 노출 여부 (실제 Desktop + Frame 아님) */
  available: boolean;
}

const Ctx = createContext<DeviceValue>({ mode: "pc", setMode: () => undefined, isFrame: false, available: false });
export const useDeviceView = () => useContext(Ctx);

function detectFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin 부모 → 프레임으로 간주
  }
}

/** 현재 경로(pathname + search, frame 파라미터 제외) — Suspense 경계 안에서만 useSearchParams 사용 */
function PathWatcher({ onChange }: { onChange: (path: string) => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const p = new URLSearchParams(params.toString());
    p.delete("frame");
    const q = p.toString();
    onChange(q ? `${pathname}?${q}` : pathname);
  }, [pathname, params, onChange]);
  return null;
}

function withFrameFlag(path: string): string {
  return path.includes("?") ? `${path}&frame=mobile` : `${path}?frame=mobile`;
}

/* ---------- Frame 쪽: 부모와 Route 동기화 ---------- */
function FrameSync() {
  const router = useRouter();
  const current = useRef<string>("");

  const onPath = useCallback((path: string) => {
    current.current = path;
    window.parent.postMessage({ type: MSG_ROUTE, path }, window.location.origin);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-frame", "mobile");
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type !== MSG_NAVIGATE || typeof e.data.path !== "string") return;
      if (e.data.path !== current.current) router.push(e.data.path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <Suspense fallback={null}>
      <PathWatcher onChange={onPath} />
    </Suspense>
  );
}

/* ---------- Phone Frame (실제 iframe) ---------- */
function PhoneFrame({ path, onFramePath, frameRef }: { path: string; onFramePath: (p: string) => void; frameRef: React.RefObject<HTMLIFrameElement | null> }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [src] = useState(() => withFrameFlag(path)); // 최초 1회만 src 지정, 이후는 postMessage로 이동

  useEffect(() => {
    const el = wrapRef.current?.parentElement;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 32;
      setScale(Math.min(1, w / (FRAME_W + BORDER * 2), h / (FRAME_H + BORDER * 2)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === MSG_ROUTE && typeof e.data.path === "string") onFramePath(e.data.path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameRef, onFramePath]);

  return (
    <div
      ref={wrapRef}
      style={{ width: FRAME_W + BORDER * 2, height: FRAME_H + BORDER * 2, transform: `scale(${scale})`, transformOrigin: "top center" }}
      className="shrink-0"
    >
      <div
        className="h-full w-full overflow-hidden bg-black shadow-2xl"
        style={{ borderRadius: 40, border: `${BORDER}px solid #111318` }}
      >
        <iframe
          ref={frameRef}
          data-testid="device-frame"
          title="Mobile 390px 실제 화면"
          src={src}
          width={FRAME_W}
          height={FRAME_H}
          className="block bg-white"
          style={{ width: FRAME_W, height: FRAME_H, border: 0, borderRadius: 30 }}
        />
      </div>
    </div>
  );
}

/* ---------- Stage: 모드별 레이아웃 ---------- */
function Stage({ children, mode }: { children: ReactNode; mode: DeviceMode }) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [path, setPath] = useState<string | null>(null);
  const framePath = useRef<string>("");
  const parentPath = useRef<string>("");

  const onParentPath = useCallback((p: string) => {
    parentPath.current = p;
    setPath(p);
    if (framePath.current && framePath.current !== p) {
      frameRef.current?.contentWindow?.postMessage({ type: MSG_NAVIGATE, path: p }, window.location.origin);
    }
  }, []);

  const onFramePath = useCallback((p: string) => {
    const first = framePath.current === "";
    framePath.current = p;
    if (p === parentPath.current) return;
    // 첫 보고가 늦게 도착한 경우: 부모가 기준 → frame을 부모 경로로 이동
    if (first) frameRef.current?.contentWindow?.postMessage({ type: MSG_NAVIGATE, path: parentPath.current }, window.location.origin);
    else router.push(p);
  }, [router]);

  const watcher = (
    <Suspense fallback={null}>
      <PathWatcher onChange={onParentPath} />
    </Suspense>
  );

  if (mode === "mobile") {
    return (
      <div className="min-h-screen" style={{ background: "#E9ECF1" }}>
        {watcher}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-white/90 px-6 py-3 backdrop-blur" style={{ borderColor: "#DDE1E7" }}>
          <div className="min-w-0 text-[0.9rem] text-[#4A5361]">
            <span className="font-bold text-[#171B20]">Mobile 390px</span> · 동일 앱 / 동일 Route / 동일 Data
            <span className="ml-2 truncate font-mono text-[0.8rem]">{path}</span>
          </div>
          <DeviceSwitch />
        </div>
        <div className="flex justify-center p-4" style={{ height: "calc(100dvh - 64px)" }}>
          {path && <PhoneFrame path={path} onFramePath={onFramePath} frameRef={frameRef} />}
        </div>
      </div>
    );
  }

  // dual
  return (
    <div data-testid="dual-view">
      {watcher}
      <div className="min-w-0" style={{ marginRight: "33.333vw", overflowX: "clip" }}>
        {children}
      </div>
      <aside
        className="fixed right-0 top-0 z-[25] flex h-[100dvh] flex-col border-l"
        style={{ width: "33.333vw", background: "#E9ECF1", borderColor: "#DDE1E7" }}
        aria-label="Mobile 실제 화면 미리보기"
      >
        <div className="flex items-center justify-between px-4 py-2 text-[0.8rem] font-semibold text-[#4A5361]">
          <span>Mobile 390px · 같은 Route 동기화</span>
        </div>
        <div className="flex flex-1 justify-center overflow-hidden px-4 pb-4">
          {path && <PhoneFrame path={path} onFramePath={onFramePath} frameRef={frameRef} />}
        </div>
      </aside>
    </div>
  );
}

export function DeviceViewProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DeviceMode>("pc");
  const [isFrame, setIsFrame] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const frame = detectFrame();
    setIsFrame(frame);
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "mobile" || saved === "dual" || saved === "pc") setModeState(saved);
    } catch { /* noop */ }
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const setMode = useCallback((m: DeviceMode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* noop */ }
  }, []);

  const available = desktop && !isFrame;
  const effective: DeviceMode = available ? mode : "pc";

  return (
    <Ctx.Provider value={{ mode: effective, setMode, isFrame, available }}>
      {isFrame && <FrameSync />}
      {effective === "pc" ? children : <Stage mode={effective}>{children}</Stage>}
    </Ctx.Provider>
  );
}

const OPTIONS: { id: DeviceMode; label: string; icon: typeof Monitor }[] = [
  { id: "pc", label: "PC", icon: Monitor },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "dual", label: "PC+Mobile", icon: Columns2 },
];

export function DeviceSwitch({ tone = "light", labelClass = "inline" }: { tone?: "light" | "beauty"; labelClass?: string }) {
  const { mode, setMode, available } = useDeviceView();
  if (!available) return null;
  return (
    <div
      data-testid="device-switch"
      role="radiogroup"
      aria-label="화면 보기 방식"
      className="flex shrink-0 items-center gap-0.5 rounded-xl border p-0.5"
      style={{ borderColor: tone === "beauty" ? "var(--b-border)" : "var(--border, #E3E7EC)", background: tone === "beauty" ? "#fff" : "var(--surface, #fff)" }}
    >
      {OPTIONS.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => setMode(o.id)}
            title={`${o.label} 보기`}
            className="pressable flex h-9 items-center gap-1.5 rounded-[9px] px-2.5 text-[0.78rem] font-semibold transition-colors"
            style={active ? { background: tone === "beauty" ? "var(--b-navy)" : "var(--primary, #171B20)", color: "#fff" } : { color: "#4A5361" }}
          >
            <o.icon size={15} aria-hidden />
            <span className={`whitespace-nowrap ${labelClass}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
