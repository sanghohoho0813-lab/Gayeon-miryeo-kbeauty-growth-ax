/* AX Sprint II 담당자·심사위원용 소개 영상 (PASS 17, D-069)
   - 원본 1080p 두 가지 비율: 세로 9:16(1080×1920) · 가로 16:9(1920×1080), 자막은 영상 안에 들어 있다.
   - 파일은 public/media/ax-sprint2/ 에 둔다 (같은 주소에서 재생·내려받기, 외부 서비스 없음).
   - 영상 속 앱 화면·숫자는 시연용(Demo·샘플) 자료다. */

export type VideoFormat = "v" | "h";

export interface ReviewVideoFile {
  src: string;
  poster: string;
  /** 내려받을 때 파일 이름 */
  downloadName: string;
  sizeMB: number;
  width: number;
  height: number;
}

export const REVIEW_VIDEO = {
  title: "MIRYEO K-Beauty Growth AX 소개 영상",
  company: "주식회사 가연인터내셔널",
  durationSec: 230.87,
  files: {
    v: { src: "/media/ax-sprint2/gayeon-miryeo-ax-sprint2_9x16_v1.mp4", poster: "/media/ax-sprint2/poster_9x16.jpg", downloadName: "가연인터내셔널_MIRYEO_AX소개_세로9x16.mp4", sizeMB: 35, width: 1080, height: 1920 },
    h: { src: "/media/ax-sprint2/gayeon-miryeo-ax-sprint2_16x9_v1.mp4", poster: "/media/ax-sprint2/poster_16x9.jpg", downloadName: "가연인터내셔널_MIRYEO_AX소개_가로16x9.mp4", sizeMB: 37, width: 1920, height: 1080 },
  } as Record<VideoFormat, ReviewVideoFile>,
  /** 영상 흐름 — 누르면 그 장면부터 재생 (초, 장면 경계) */
  chapters: [
    { t: 0, label: "인사 · 이 영상을 만든 이유" },
    { t: 24.4, label: "회사 소개 — K-뷰티 기획·유통" },
    { t: 44.6, label: "성장하며 생긴 고민" },
    { t: 66.6, label: "데이터를 한 곳에 연결하는 AX" },
    { t: 78.6, label: "실제 개발 화면 (시험 버전)" },
    { t: 86.3, label: "재고만 보면 95일, 함께 계산하면" },
    { t: 100.2, label: "약 4일 안에 생산 검토" },
    { t: 109.3, label: "상황이 바뀌면 결과도 바뀝니다" },
    { t: 118.8, label: "핵심 — 미리 판단" },
    { t: 131.6, label: "고객의 구매 전 관심신호" },
    { t: 154.9, label: "담당자 확인·실행 → 결과 기록" },
    { t: 172.1, label: "현재 단계 · 앞으로의 고도화" },
    { t: 193.2, label: "AX Sprint II 신청 이유" },
    { t: 211.7, label: "확장 방향 · 맺음말" },
  ],
  notes: [
    "회의실 화면·노트북은 가로(16:9), 휴대폰으로 보실 때는 세로(9:16)를 고르세요.",
    "자막이 영상 안에 들어 있어 소리 없이도 내용을 따라가실 수 있습니다.",
    "영상 속 앱 화면의 제품·수치는 시연용 예시(Demo·샘플) 데이터이며, 실제 회사 실적이 아닙니다.",
    "현재는 규칙·통계 기반 분석·예측이며, 시계열·머신러닝은 앞으로의 고도화 계획입니다.",
  ],
};

export function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDurationKR(sec: number) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}분 ${s % 60}초`;
}
