"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Download, Gauge, ListVideo, Maximize, Monitor, Play, Smartphone } from "lucide-react";
import { formatClock, REVIEW_VIDEO, type VideoFormat } from "@/lib/review/ax-sprint2-video";

/* 소개 영상 플레이어 (PASS 17, D-069) — 세로/가로 전환·속도·전체 화면·장면 이동·내려받기
   심사 페이지(/review/ax-sprint2)·영상 페이지(/review/ax-sprint2/video)·홈(/)에서 같은 부품을 쓴다.
   재생 위치·속도는 비율을 바꿔도 이어진다. 저장·전송 없음 (같은 주소의 영상 파일만 읽음). */

const TOKENS: CSSProperties = {
  ["--vd-navy" as string]: "#0E1A33",
  ["--vd-ink" as string]: "#101828",
  ["--vd-soft" as string]: "#475467",
  ["--vd-line" as string]: "#E4E7EC",
  ["--vd-bg" as string]: "#F6F7F9",
  ["--vd-accent" as string]: "#0E7490",
  ["--vd-accent-soft" as string]: "#E6F4F7",
};

const SPEEDS = [1, 1.25, 1.5];

export function ReviewVideo({ idPrefix = "vd", showNotes = true }: { idPrefix?: string; showNotes?: boolean }) {
  const V = REVIEW_VIDEO;
  const ref = useRef<HTMLVideoElement>(null);
  const resume = useRef<{ t: number; play: boolean } | null>(null);
  const [fmt, setFmt] = useState<VideoFormat>("h");
  const [rate, setRate] = useState(1);
  const [now, setNow] = useState(0);

  // 휴대폰 폭이면 세로 영상으로 시작 (첫 화면은 서버와 같게 가로 → 화면 확인 후 한 번만 바꿈)
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setFmt("v");
  }, []);

  const switchTo = (f: VideoFormat) => {
    if (f === fmt) return;
    const v = ref.current;
    if (v) resume.current = { t: v.currentTime, play: !v.paused && !v.ended };
    setFmt(f);
  };

  const onLoaded = () => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = rate;
    if (resume.current) {
      v.currentTime = resume.current.t;
      if (resume.current.play) void v.play().catch(() => undefined);
      resume.current = null;
    }
  };

  const setSpeed = (r: number) => {
    setRate(r);
    if (ref.current) ref.current.playbackRate = r;
  };

  const seek = useCallback((t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t;
    setNow(t);
    void v.play().catch(() => undefined);
  }, []);

  const fullscreen = () => {
    const v = ref.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!v) return;
    if (v.requestFullscreen) void v.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.();
  };

  const active = V.chapters.reduce((k, c, i) => (now + 0.25 >= c.t ? i : k), 0);
  const file = V.files[fmt];

  return (
    <div style={TOKENS} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]" data-testid="review-video">
      {/* 플레이어 */}
      <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-5" style={{ borderColor: "var(--vd-line)" }}>
        <div className="flex justify-center">
          <div role="group" aria-label="영상 비율" className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--vd-line)", background: "var(--vd-bg)" }}>
            {([["v", "세로 9:16", Smartphone], ["h", "가로 16:9", Monitor]] as const).map(([f, label, Icon]) => (
              <button key={f} type="button" onClick={() => switchTo(f)} aria-pressed={fmt === f} data-fmt={f}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[0.92rem] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={fmt === f ? { background: "var(--vd-navy)", color: "#fff" } : { color: "var(--vd-soft)" }}>
                <Icon size={16} aria-hidden /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <video
            key={fmt}
            ref={ref}
            src={file.src}
            poster={file.poster}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={onLoaded}
            onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
            aria-label={`${V.title} — ${fmt === "v" ? "세로 9:16" : "가로 16:9"} (자막 포함)`}
            className={fmt === "v" ? "aspect-[9/16] h-auto max-h-[78vh] w-full max-w-[26rem] rounded-xl bg-black" : "aspect-video h-auto w-full rounded-xl bg-black"}
            data-testid="video-el"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-[0.86rem] font-semibold" style={{ color: "var(--vd-soft)" }}><Gauge size={15} aria-hidden /> 재생 속도</span>
          {SPEEDS.map((r) => (
            <button key={r} type="button" onClick={() => setSpeed(r)} aria-pressed={rate === r} data-rate={r}
              className="min-h-[44px] rounded-full border px-4 text-[0.92rem] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={rate === r ? { background: "var(--vd-navy)", color: "#fff", borderColor: "var(--vd-navy)" } : { borderColor: "var(--vd-line)", color: "var(--vd-ink)" }}>
              {r}배
            </button>
          ))}
          <button type="button" onClick={fullscreen} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[0.92rem] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: "var(--vd-line)", color: "var(--vd-ink)" }}>
            <Maximize size={15} aria-hidden /> 전체 화면
          </button>
        </div>

        <div className="mt-5 border-t pt-4 text-center" style={{ borderColor: "var(--vd-line)" }}>
          <p className="text-[0.86rem] font-semibold" style={{ color: "var(--vd-soft)" }}>파일로 받기 · 카카오톡으로 보낼 때</p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            {(["v", "h"] as const).map((f) => (
              <a key={f} href={V.files[f].src} download={V.files[f].downloadName} data-download={f}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[0.92rem] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "var(--vd-line)", color: "var(--vd-ink)" }}>
                <Download size={16} aria-hidden /> {f === "v" ? "세로 9:16" : "가로 16:9"} ({V.files[f].sizeMB}MB)
              </a>
            ))}
          </div>
          <p className="mt-2 text-[0.78rem]" style={{ color: "var(--vd-soft)" }}>원본 1080p · MP4 · 자막 포함</p>
        </div>
      </div>

      {/* 영상 흐름 · 안내 */}
      <div className="min-w-0 space-y-4">
        <nav aria-labelledby={`${idPrefix}-chapters`} className="rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: "var(--vd-line)" }}>
          <h3 id={`${idPrefix}-chapters`} className="flex items-center gap-2 text-[1.05rem] font-bold" style={{ color: "var(--vd-navy)" }}><ListVideo size={18} aria-hidden /> 영상 흐름</h3>
          <p className="mt-0.5 text-[0.84rem]" style={{ color: "var(--vd-soft)" }}>누르면 그 장면부터 재생합니다.</p>
          <ol className="mt-3 space-y-1" data-testid="video-chapters">
            {V.chapters.map((c, i) => (
              <li key={c.t}>
                <button type="button" onClick={() => seek(c.t)} aria-current={i === active ? "true" : undefined} data-t={c.t}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-[0.93rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                  style={i === active ? { background: "var(--vd-accent-soft)", color: "var(--vd-navy)" } : { color: "var(--vd-ink)" }}>
                  <span className="tabular w-10 shrink-0 font-mono text-[0.82rem] font-bold" style={{ color: "var(--vd-accent)" }}>{formatClock(c.t)}</span>
                  <span className="min-w-0 flex-1 font-semibold [word-break:keep-all]">{c.label}</span>
                  {i === active && <Play size={14} aria-hidden style={{ color: "var(--vd-accent)" }} />}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        {showNotes && V.notes.length > 0 && (
          <div className="rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: "var(--vd-line)" }}>
            <h3 className="text-[1.05rem] font-bold" style={{ color: "var(--vd-navy)" }}>보여드리기 전에</h3>
            <ul className="mt-2.5 space-y-2">
              {V.notes.map((n) => (
                <li key={n} className="flex gap-2 text-[0.9rem] leading-relaxed [word-break:keep-all]" style={{ color: "var(--vd-ink)" }}>
                  <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--vd-accent)" }} aria-hidden />{n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
