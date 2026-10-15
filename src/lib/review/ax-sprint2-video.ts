/* AX Sprint II 담당자·심사위원용 소개 영상 — V6 (PASS 23, D-078 'AX 활용 예시' 2초 안내 카드 · V5 PASS 22 D-077 배경음악 · V4 PASS 20 D-074 · V3 PASS 19 D-072 · V2 PASS 18 D-070 · V1 PASS 17 D-069)
   - 원본 1080p 두 가지 비율: 세로 9:16(1080×1920) · 가로 16:9(1920×1080), 자막은 영상 안에 들어 있다.
   - 파일은 public/media/ax-sprint2/ 에 둔다 (같은 주소에서 재생·내려받기, 외부 서비스 없음).
   - 제품 사진은 실제 MIRYEO 제품, 영상 속 재고·판매·생산 수치는 시연용(Demo·샘플) 자료다.
   - 파일 이름의 _v6 는 브라우저·CDN 캐시가 옛 영상을 보여 주지 않게 하려는 것 (바꿀 때 _v7 …). */

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
  durationSec: 219.03,
  files: {
    v: { src: "/media/ax-sprint2/gayeon-miryeo-ax-sprint2_9x16_v6.mp4", poster: "/media/ax-sprint2/poster_9x16_v6.jpg", downloadName: "가연인터내셔널_MIRYEO_AX소개_세로9x16.mp4", sizeMB: 36, width: 1080, height: 1920 },
    h: { src: "/media/ax-sprint2/gayeon-miryeo-ax-sprint2_16x9_v6.mp4", poster: "/media/ax-sprint2/poster_16x9_v6.jpg", downloadName: "가연인터내셔널_MIRYEO_AX소개_가로16x9.mp4", sizeMB: 39, width: 1920, height: 1080 },
  } as Record<VideoFormat, ReviewVideoFile>,
  /** 영상 흐름 — 누르면 그 장면부터 재생 (초, 장면 경계) */
  chapters: [
    { t: 0, label: "인사 · 이 영상을 만든 이유" },
    { t: 20.82, label: "회사 소개 · 매장·해외 판매" },
    { t: 35.25, label: "성장하며 생긴 고민" },
    { t: 53.19, label: "데이터를 한곳에 연결" },
    { t: 64.11, label: "실제 개발 중인 시험버전" },
    { t: 69, label: "AX 활용 예시 ① · 재고와 생산시점 판단" },
    { t: 76.53, label: "재고만 보면 95일, 함께 계산하면" },
    { t: 89.89, label: "생산 검토 D-4 · 추천 생산량" },
    { t: 96.69, label: "AX 활용 예시 ② · 조건이 바뀌면 다시 계산" },
    { t: 105.85, label: "핵심 — 미리 판단" },
    { t: 117.29, label: "고객 관심도 함께 판단" },
    { t: 136.03, label: "제안 → 확인·실행 → 다음 판단" },
    { t: 151.27, label: "AI 분석·예측 도입·검증 중" },
    { t: 168.85, label: "현재 구현 → 향후 고도화" },
    { t: 190.01, label: "AX 스프린트 II 신청 이유" },
    { t: 204.36, label: "확장 방향(검토) · 맺음말" },
  ],
  notes: [
    "회의실 화면·노트북은 가로(16:9), 휴대폰으로 보실 때는 세로(9:16)를 고르세요.",
    "자막이 영상 안에 들어 있어 소리 없이도 내용을 따라가실 수 있습니다.",
    "제품 사진은 실제 MIRYEO 제품이며, 화면 속 재고·판매·생산 등 분석 수치는 시연용 예시(Demo·샘플) 데이터로 실제 회사 실적이 아닙니다.",
    "현재 구현은 규칙·통계 기반 분석·예측이고, AI 분석·예측 솔루션은 도입·검증 중입니다. 시계열·머신러닝 예측은 실제 데이터를 쌓은 뒤 단계적으로 적용할 고도화 계획입니다.",
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
