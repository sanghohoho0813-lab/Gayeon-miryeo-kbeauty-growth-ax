# AX Sprint II 담당자용 소개 영상 — 제작 원본 (PASS 17, D-069)

- 결과물: 세로 9:16 `1080×1920` · 가로 16:9 `1920×1080`, 30fps, H.264 High CRF 18 + AAC 192k, 길이 **230.87초 (3분 51초)**, 자막은 영상 안에 그림
- 게시: `public/media/ax-sprint2/` → 영상 페이지 `/review/ax-sprint2/video` · 심사 페이지 `/review/ax-sprint2#video` · 홈 `/`
- 기준: 사용자 제공 `AX 영상 스타일 가이드 v4.1` (Deep Navy / Warm Ivory / Muted Slate · Gold + Secondary teal · 자막 52px · render(t) 결정적 렌더)
- 음성: 사용자 제공 TTS 원본(264.4초, 24kHz) — 저장소에 넣지 않음. 다시 만들 때 같은 파일을 `src.wav` 로 둔다
- 대본: 별도 대본 파일이 없어 **음성 인식(faster-whisper large-v3) 결과를 바탕으로 자막 대본(`chunks.txt`)을 만들고** 인식 오류만 고쳤다
  (`시현용→시연용`, `KBT→K-뷰티`, `AX 스프린트2→AX Sprint II`, `가연 인터내셔널→가연인터내셔널`). 끝의 0.18초 '감사합니다'는 무음 구간 인식 오류라 뺐다.
  → **대표님 확인 필요**: 자막 글자가 의도한 대본과 같은지 (`subs.srt`)

## 만드는 순서 (`scratchpad` 작업 폴더 기준)
```
python3 -m venv venv && venv/bin/pip install numpy faster-whisper imageio-ffmpeg pymupdf   # ffmpeg 정적 실행 파일 포함
ffmpeg -i src.wav -af atempo=1.13 -ac 1 -ar 48000 sped.wav          # ① 1.13배
venv/bin/python tighten.py                                          # ② 0.35초 넘는 쉼만 55% (47곳, 6.0초)
ffmpeg loudnorm 2-pass → +0.5dB → voice.wav                         # ③ -14.0 LUFS, 피크 -4.0 dBFS, 227.67초
venv/bin/python asr.py → asr.json                                   # ④ 최종 음성으로 단어 시각
venv/bin/python subs.py                                             # ⑤ chunks.txt 정렬 → subs.json/.srt (글자 일치 99.2%, 87조각)
node capture.mjs cap / capture2.mjs cap / capture3.mjs cap           # ⑥ Demo 빌드(:3100) 화면 캡처 @2x — 예시(Demo·샘플) 데이터만
venv/bin/python build.py v && venv/bin/python build.py h            # ⑦ 장면 → comp/comp_v.html, comp_h.html
bash render_all.sh v && bash render_all.sh h                        # ⑧ 4구간 병렬 렌더 → 이어 붙이기 → 음성(0.6초 여백·끝 1초 페이드)
node contact.mjs v cs.png 3,13,22,...  /  node frames.mjs h fr/h 100,145    # 시험 프레임 모음 · 자막 2줄 초과 검사
node poster.mjs v poster_9x16.jpg 6.5 && node poster.mjs h poster_16x9.jpg 6.5  # 자막 없는 포스터
```
회사 사진: 사용자 제공 「가연인터내셔널 회사소개서 2026」 PDF에서 제품·매장·수출·박람회 사진만 추출(`company/img/`).
**쓰지 않은 자료**: 사업자등록증, 대표자 신분증, 계약서, 세금계산서·재무제표 등 — 개인정보·거래 정보라 공개 영상에 넣지 않음. 연예인·인플루언서 얼굴 사진도 초상권 때문에 쓰지 않음.

## 장면표 (26장면, 경계 = 자막 시작 시각, 0.25초 겹침)
| # | 시작 | 시퀀스 | 배경 | TYPE | 시선 중심 · 글자 외에 보여주는 것 | 내부 변화 |
|---|---|---|---|---|---|---|
| 1 | 0:00 | 인트로 | Navy | BIG STATEMENT | 회사명 + 제품(골드 크림) 사진 | 사진 → 회사명 → 'AX Sprint II 신청' |
| 2 | 0:07 | 목적 | Navy | SEQUENCE | 질문 2개 + 보조자료 문서 | 질문 1→2 (지난 것 흐리게) → 문서 등장 |
| 3 | 0:17 | 목적 | Navy | NUMBER | '3분' 큰 숫자 | 배속 1·1.25·1.5 → 흐름 막대 |
| 4 | 0:24 | 회사 | Ivory | CONCEPTUAL | 제품 라인업 사진 | 제목 → 국내·해외 유통 |
| 5 | 0:33 | 회사 | Ivory | CONCEPTUAL | 백화점 매장 사진 3장 | 사진 차례로 → 백화점·온라인 |
| 6 | 0:38 | 회사 | Ivory | CONCEPTUAL | 수출 국가 지도 + 중국 박람회 사진 | 수출·온라인·라이브 |
| 7 | 0:44 | 문제 | Navy | TRANSFORMATION | 늘어나는 제품(□)·채널(○) | 도형 증가 → '새로운 고민' (BIG) |
| 8 | 0:50 | 문제 | Slate | SEQUENCE | 매일의 판단 4가지 | 질문 1→4 |
| 9 | 1:00 | 문제 | Navy | CONCEPTUAL | 흩어진 자료 + 담당자 실루엣 | 자료 등장 → '경험' 원 |
| 10 | 1:06 | 해결 | Navy | TRANSFORMATION | 4개 데이터 → 허브 수렴 | 기존 방식 취소선 → 수렴 → 다음 행동 → 'AX 시스템' |
| 11 | 1:18 | 증거 | Ivory | PRODUCT PUSH | 실제 PC + 모바일 화면 | 기기 전진·스크롤 → 시험 버전 → 시연용 자료 |
| 12 | 1:26 | 증거 | Ivory | NUMBER | '95일' 카운트 | 숫자 → 재고 막대 → '충분해 보임' |
| 13 | 1:32 | 증거 | Ivory | INFOGRAPHIC | 막대가 줄고 생산·안전 블록이 붙음 | 판매속도↑(막대 짧아짐) → 생산 → 안전 → 착수 마감선 |
| 14 | 1:40 | 증거 | Ivory | PRODUCT | 실제 심사 페이지 데모 (4일 안에) | 스크롤 → 판단 상자 강조 → 추천 생산량 강조 |
| 15 | 1:49 | 증거 | Ivory | PRODUCT | 같은 화면 상황 3가지 | 판매 증가(마감 지남) → 입고 예정(생산 불필요) |
| 16 | 1:58 | 핵심 | Navy | BIG MOMENT | '미리 판단' | 취소선 → 과거·현재·앞으로 → 질문 2 → BIG |
| 17 | 2:11 | 고객 | Ivory | PRODUCT (모바일) | 실제 고객 앱 (제품·Finder·추천·Passport) | 화면 교체·스크롤 + 신호 점 → '관심신호' |
| 18 | 2:25 | 고객 | Slate | PC+모바일 | 모바일 → 신호 점 → PC 고객 인사이트 | 관심 변화 + 판매·재고 → 수요 ↑ 행 강조 |
| 19 | 2:34 | 실행 | Navy | PRODUCT | 실제 Action 처리 창 | 단계 표시 강조 → 스크롤 → '검토 완료' 버튼 |
| 20 | 2:44 | 실행 | Navy | INFOGRAPHIC | 순환도 4노드 + 도는 점 | 결과 기록 → 다음 판단 → '계속 발전' |
| 21 | 2:52 | 현재 | Ivory | SEQUENCE | 계산 카드 (규칙·통계) | 요소 3줄 → = 소진·생산 시점 → 분석·예측 |
| 22 | 3:00 | 향후 | Ivory | SEQUENCE | 단계 카드 + 정확도 계단 (계획 = 점선) | 지금 → 데이터 축적 → 시계열·ML(점선) → 계단 |
| 23 | 3:13 | 이유 | Navy | BIG MOMENT | '관리 프로그램' 취소선 | 취소선 |
| 24 | 3:18 | 이유 | Navy | TRANSFORMATION | Before → After 카드 | 과거 정리 회사 → 미리 판단 회사 → 신청 이유 |
| 25 | 3:31 | 확장 | Ivory | SEQUENCE | 3단계 + 중소기업 아이콘 (STEP 3 점선·검토) | 단계 차례로 |
| 26 | 3:45 | 마무리 | Navy | CLOSING | 로고 + 회사명 + 감사합니다 | — |

제품 화면 비중: 장면 11·14·15·17·18·19 ≈ 59초 / 231초 = 약 26% (가이드: 심사위원 대상 15~30%).

## 검수 (자동)
- 규격: 1080×1920 / 1920×1080 · 30fps · 230.87초 · -14 LUFS 근처 · 끝 2초 무음
- 자막: 2줄 초과 0 · 0.9초 미만 0 · 대본-음성 글자 일치 99.2%
- 사람 확인 필요: **최종 MP4를 휴대폰·PC에서 처음부터 끝까지 재생** (AI는 프레임 샘플·음량·길이만 확인)
