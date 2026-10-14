# PROJECT_STATE — MIRYEO K-Beauty Growth AX

LAST UPDATED: 2026-10-14 (PASS 19 — 고객 플랫폼 UI/UX 리디자인(개인화 뷰티 앱) · 실사 제품 사진 · Business AX 기본 테마 오닉스 골드 · 소개 영상 V3)
DELIVERY STAGE: 계약 제11조 2단계 개발 완료(1차 보고·5영업일 확인 대기) + **3단계 일부 개발 착수**(사용자 지시 2026-10-09: "3단계도 일부 개발, Supabase는 나중에 연동")
CURRENT PASS: 19 — **고객 플랫폼 리디자인 + 고객 앱 사진 + 기본 테마 + 영상 V3**(사용자 요청 2026-10-14): 고객 플랫폼을 '개인화 뷰티 앱'으로 — 카드 대신 구분선·여백·타이포, 개인화 홈·상담형 Finder·루틴 우선 결과·추천 근거 시트·'왜 나에게' 상세·Passport 강화·모바일 하단 탭(D-073, `CUSTOMER_UX_REDESIGN.md`). Google Drive 제품 사진 10장·카드 3장을 고객 앱(홈 첫 화면·제품 카드·상세·Finder·Passport·추천 방식 카드)과 AX 상품 목록에 배치(D-071), Business AX 기본 테마 = 오닉스 골드(저장된 선택은 유지, D-071), 소개 영상 V3 — 실제 화면 재캡처(오닉스 골드·실사 사진) + 'AX 활용 예시 ① 재고와 생산시점 판단 / ② 조건이 바뀌면 판단도 다시 계산' 상단 고정 제목·4단계 표시(D-072), `_v3` 교체·`_v2` 삭제. 이전 PASS 18 — **소개 영상 V2 교체**(사용자 요청 2026-10-14, D-070): 새 TTS·대본 그대로 29장면(실제 매장 5장·중국 온라인 매장·박람회, 데모에 실제 MIRYEO 제품 사진 + '시연용' 수치, 재고 95일 → 생산 검토 D-4 → 추천 생산량 1,750개 강조, 고객관심 간결 흐름, 한국어 5단계 순환, 'AI 분석·예측 솔루션 도입·검증 중' + 현재 구현/도입·검증 중/향후 고도화) → 같은 세 곳에 `_v2` 파일로 교체, V1 삭제. 이전 PASS 17: **AX Sprint II 담당자용 소개 영상**(사용자 요청 2026-10-14, D-069): 제공 음성 + 스타일 가이드 v4.1로 26장면 영상(세로·가로 1080p, 자막 포함) 제작 → `/review/ax-sprint2/video`(비율 전환·속도·영상 흐름·내려받기) + 심사 페이지 '소개 영상' 섹션 + 홈(`/`) 섹션. 제작 원본·장면표 `video/ax-sprint2/`. 이전 PASS 16: **AX Sprint II Reviewer Experience Page**(사용자 요청 2026-10-14): 심사위원 전용 공개 페이지 `/review/ax-sprint2` — 내부 AX와 분리된 Public Read-only Demo Surface(D-068), 원고·기준 `AX_SPRINT2_REVIEW_SOURCE.md`. 이전 PASS 15: 다음 단계 고도화·UI/UX 대폭 개선(사용자 요청 2026-10-14 두 번째 "다음단계 고도화 및 uiux 대폭개선"). **운영 기준값**(조직별 안전일수·입고 후 일수·생산 단위·사후 성과 기간, migration 009, D-065), **대화상자·처리 창이 헤더 아래 깔리던 결함 수정**(D-064), 처리 창 '지금 다시 계산하면'·첫 단계 버튼 고정(D-066), 고객 앱 모바일 메뉴·Finder(D-067), 가져오기 단계 한글. 이전 PASS 14: **대표 보고 모드** `/ax/present`(R-01, D-061), 채널 순위 막대·모바일 카드(D-060), 실증·Evidence 한글 우선·12주 타임라인(D-062), 설정 바로가기, 주간 점검 품질 항목(R-22, D-063). 이전 PASS 13: UI/UX 개선·다음 단계 고도화("uiux개선, 다음단계 고도화"). 모바일에서 넓은 표 4개를 카드로(D-058), 월별 실적 '‹ 월 ›'·탭 가장자리 흐림·데이터 상태 1줄, **알림 센터**(종 아이콘 → 오늘 확인할 것 7종, 계산형 D-059). 다음 우선순위(3단계 보고 방식)는 사용자 결정 대기. **push = Production 배포**(D-040)

## 계약 별지 제1호 대조 (2026-09-30 기준)
| No | 핵심모듈 | 구현 | 화면 |
|---|---|---|---|
| 1 | 통합 경영 현황판 — 월별·채널별·제품별 매출, 이익, 재고, 받을 돈, 수출, B2B | ✅ 대시보드(4주 KPI + 이번 달 매출·매출총이익·받을 돈 + 목표 대비) + 월별 실적(12개월·채널별·제품별·**월 목표·달성률**) | `/ax`, `/ax/monthly` |
| 2 | 제품별 재고·생산 분석 — 원가·판매가·이익·재고·판매속도·소진일·OEM | ✅ **OEM 생산기간·최소 생산수량 반영**: 생산 착수 마감일·추천 생산량·착수 Action (PASS 10, 이전 틈 해소) | `/ax/products?tab=production` |
| 3 | 판매채널·B2B·수출 성과관리 — 실적 비교, 거래처·납품·정산 상태 | ✅ 채널 분석·B2B·수출 + 정산·미수금(청구·부분입금·연체) | `/ax/channels` |
| 4 | AI 성장 실행센터 — 행동 제안 + 대표자용 요약 | ✅ RULE 행동추천·Action 생애주기 + 대표 브리핑(RULE 요약). Claude 문장화 구현·숫자 검증 포함, 기본 꺼짐(READY — 고객사 승인·API 키) | `/ax/growth`, `/ax` |
| 5 | AI 제품·사용순서 추천 → 구매 결정 | ✅ Finder → 루틴 → 제품 상세 → 구매처 이동 | `/beauty/finder` |
| 6 | 고객 뷰티 기록·회원·재구매 — 고객계정·마이페이지·추천결과·구매이력·재구매 예상시점 | ✅ 회원가입(필수/선택 동의 분리)·마이페이지·추천 기록(가입 전 기록 연결)·구매 기록(고객/운영자)·재구매 예상일·탈퇴 | `/beauty/login`, `/beauty/me`, `/ax/customers#members` |

제5조 기본기능: 로그인·권한 ✅ · 검색·필터·등록·수정·조회·이력 ✅ · 반응형 ✅ · CSV·엑셀 입력 ✅ **및 내보내기 ✅**(`/ax/data?tab=export`) · AI 흐름 ✅ · 대표자 브리핑 ✅ · 추천→구매 흐름 ✅

완료·검수 기준 중 남은 것: **MVP 시험버전 공개 + 1차 완료 보고 전달**
- **공개 주소(DEMO) 있음**: https://gayeon-miryeo-kbeauty-growth-ax.vercel.app — Vercel이 push마다 자동 배포 (2026-10-07 확인, 전 화면 200). Live 시험버전은 USER ACTION(Supabase·환경변수) 후 같은 주소에서 전환
- Demo 주소를 시험버전으로 먼저 보고할지, Live 전환 후 보고할지는 **사용자 결정** (보고서 초안에 두 경우 모두 표기)
계약 2단계 중 개발 외 결과물(특허기술자료, 벤처/기업정비 기초자료)은 이 저장소 범위 밖.

## 계약 별지 제2호 3단계 대조 (2026-10-09)
3단계 산출물: "실제 자료 적용·기능 보완, 벤처 신청/보완, 정책자금·보증용 사업화자료, 담당자 면담/현장확인 대비" (별지 제1호: "실제 자료 **또는 합리적인 샘플 자료**로 실제 업무에 쓸 수 있는지 확인")
| 산출물 | 개발 부분 | 상태 | 남은 것 (막힌 이유) |
|---|---|---|---|
| 실제 자료 적용 | 판매 파일 하나로 시작(**빈 조직에서도**, PASS 11): 미등록 상품·채널 즉시 등록(추정값 확인) + 자료 진단 + 상품 정보·**재고** 파일 + Demo에서 입력한 실데이터 백업·Live 이관 · **샘플 자료 전 과정 검증 완료**(PASS 11) | PILOT — 샘플 자료 VERIFIED · Demo·Live E2E VERIFIED | 실제 판매·상품 엑셀 (USER), Live 전환 (USER: Supabase), 보고 방식 결정 (USER) |
| 기능 보완 | 위 + 실데이터 시작 가이드·주간 운영 점검·공개 전 점검(PASS 5~6) + **생산 착수 일정·월 목표·Action 사후 성과·데이터 품질 점검(PASS 10)** | PILOT — Demo·Live E2E VERIFIED | 실사용 피드백 (Live 이후), 실제 생산기간·MOQ·월 목표 (USER) |
| 정책자금·보증용 사업화자료 | 사업화 실적 자료 — 기록만 집계(매출 추이·채널·B2B·수출·제품·고객 반응·AX 운영·출처), 인쇄/PDF·근거 CSV, Demo는 '제출 불가' | PILOT | 실데이터 (USER). 신청서 본문·재무·회사 개요는 개발 범위 밖 |
| 벤처 신청/보완 | 사업화 실적 자료 + 기술자산 상태 + 현장확인 Q&A(특허·기술은 '대표 답변 준비') | 일부 | 특허기술자료·신청서 (개발 범위 밖) |
| 담당자 면담/현장확인 대비 | 하루 전 점검·시연 순서 7단계(현재 근거 표시)·예상 질문 7개(시스템 사실만) + 샘플 자료 연습 모드로 리허설 가능 | PILOT | 실데이터로 리허설 (Live 이후) |

**3단계 보고서 초안**: `STAGE3_DELIVERY_REPORT.md` — 샘플 자료 검증 결과·발견 결함·실제 자료 적용에 필요한 것·보고 방식 결정(가/나/다). `[ ]` 칸은 발송 전 채움.

## REVIEW SURFACE (PASS 16, D-068 · 영상 PASS 17, D-069 → V2 PASS 18, D-070)
| 경로 | 상태 |
|---|---|
| `/review/ax-sprint2` — AX Sprint II 심사위원 페이지 | **Public Demo · No Live Data · No Internal Navigation · No Write** |
| `/review/ax-sprint2/video` — 소개 영상 페이지 (세로 9:16 / 가로 16:9 · 원본 1080p 내려받기) | **Public Demo · No Live Data · No Internal Navigation · No Write** |

- 대상: AX Sprint II 심사위원 (로그인 없음, 검색 노출 차단). 주소: https://gayeon-miryeo-kbeauty-growth-ax.vercel.app/review/ax-sprint2
- 구성 8개: HERO → 왜 AX인가 → **핵심 작동 방식(직접 눌러 보는 데모)** → 고객 신호 → Closed Loop → 개발 현황(구현 완료 / PILOT·실증 중 / 향후 고도화) → 확장 방향 → 마무리. 원고·금지 표현·영상 장면: `AX_SPRINT2_REVIEW_SOURCE.md`
- 데모: 샘플 제품 3개 × 상황 3개(현재 추세 · 최근 판매 30% 증가 · OEM 입고 예정 반영) → Business AX와 같은 계산 함수로 예측 판매·가용 재고·재고 소진 예상·생산 착수 마감·추천 생산량·실제 RULE Action. 기본 장면: 샘플 앰플 C — 재고 '안정'(약 95일분)이지만 OEM 45일 + 안전 14일 → **착수 D-4 · 1,750개**
- 데이터 경계: 공개 시연 데이터(`src/lib/review/ax-sprint2-demo.ts`)만 — 운영 DB·인증·저장소 쓰기·이벤트 저장·Action 생성 없음 (qa-review: 외부/API 요청 0, 저장소 새 키 0, 번들에 DB 클라이언트 없음)
- 2026-10-14 보완(사용자 요청, 2곳만): HERO에 작은 보조문구 "주식회사 가연인터내셔널 · AX Sprint II 심사용"(신청기업) → 프로젝트명 "MIRYEO K-Beauty Growth AX · PILOT" 위계, 데모 제목 아래 분석 방식 카드(현재 PILOT: 규칙·통계 기반 / 향후 고도화: 시계열·머신러닝) — 기존 칩 2개를 같은 내용의 2단 카드로 교체. 데모 수치·계산·섹션 내용 변경 없음
- 수정 시: 샘플 수치를 바꾸면 원고 2절 표 + `qa-review` 기대값을 함께 바꾼다. `/ax` 기기 보기 틀은 `/review`에서 꺼짐(`DeviceView.tsx`)

## PASS 19 변경 요약 (2026-10-14) — 고객 플랫폼 리디자인 · 실사 사진 · 기본 테마 오닉스 골드 · 영상 V3
| 항목 | 상태 |
|---|---|
| 고객 플랫폼 UI/UX 리디자인 (D-073): 홈(오늘의 메시지→상담→최근 루틴→나의 고민→추천 제품→Passport), Finder 상담형·결과 루틴 우선·근거 하단 시트, 제품 카드·상세('왜 나에게 추천됐나요?'), Passport 신분증형·기록 섹션, 모바일 하단 탭, 푸터 평면화 — 기능·데이터·추천 로직·이벤트 그대로 | VERIFIED (qa-photos·qa-pass15·qa-flow·qa-stage2·qa-pass3·qa-pass12) |
| 고객 앱 사진 (D-071): Drive「MIRYEO AI Beauty 이미지 작업물」제품 10장 → Demo 제품 A~J 1:1 (`ProductVisual` 제품 ID 연결, 사진 없는 제품은 SVG), 홈 첫 화면 4병(모바일 포함)·제품 카드·상세·Finder·Passport·루틴, 추천 방식 카드 3장·Passport 머리 이미지, AX 상품 목록 썸네일 | VERIFIED (qa-photos) |
| Business AX 기본 테마 오닉스 골드 (D-071): 처음 방문 = onyx-gold, 저장된 테마 유지, 고객 앱은 선택 테마 잉크 색을 따름 | VERIFIED (qa-photos · qa-boot) |
| 소개 영상 V3 (D-072): 실제 화면 재캡처, 'AX 활용 예시 ①/②' 상단 고정 제목 + ① 4단계 표시, 4단 요약(95일 → 판매속도+생산 45일+안전 14일 → 재판단 → D-4·1,750개), 음성·자막·계산 그대로 | VERIFIED (qa-video · qa-video-play) |

## PASS 18 변경 요약 (2026-10-14) — 소개 영상 V2 교체
| 항목 | 상태 |
|---|---|
| V2 제작 (D-070): 새 TTS 1.3배·쉼 축소(52곳 7.0초)·-14 LUFS, **사용자 대본 그대로** 자막 94조각(음성 시각 일치 98.5%), 29장면, 세로 1080×1920 · 가로 1920×1080, 217.03초(3분 37초) | DONE — 길이는 요청(약 3분)보다 37초 김: 대본 분량상 3:00은 1.6배 필요 → 3분 안쪽은 대본 15~20% 축소 후 재녹음 필요 |
| 바뀐 장면: 국내 실제 매장 5장, 해외 지도(중국)·박람회·중국 온라인 매장 화면, 제품 증가에 실제 제품 사진, '제품 이미지=실제 / 분석 숫자=시연용' 장면, 95일에 실제 제품 사진, **재고 95일 → 생산 검토 D-4 → 추천 생산량 1,750개** 금색 강조 장면, 고객관심 간결 흐름(표 제거), 한국어 5단계 순환, 'AI 분석·예측 솔루션 · 도입·검증 중', 현재 구현/도입·검증 중/향후 고도화(점선), '언젠가 AI' → 지금 만들고·쌓고·검증 중 | DONE (장면표 `video/ax-sprint2/README.md`) |
| 사이트 교체: `public/media/ax-sprint2/*_v2.mp4`·`poster_*_v2.jpg`, 영상 흐름 15개·길이·용량·안내 문구 갱신(`ax-sprint2-video.ts`), V1 mp4·포스터 삭제 | VERIFIED (qa-video·qa-video-play) |

## PASS 17 변경 요약 (2026-10-14) — AX Sprint II 담당자용 소개 영상 (V1, PASS 18에서 V2로 교체)
| 항목 | 상태 |
|---|---|
| 영상 제작 (D-069): 제공 음성 1.13배·쉼 축소·-14 LUFS, 음성 인식으로 자막 정렬(99.2%, 87조각), 26장면(회사소개서 사진·실제 Demo 화면·인포그래픽), 세로 1080×1920 · 가로 1920×1080, 230.87초 | DONE — 자막 글자는 대표 확인 필요(대본 파일 없이 음성 인식 기반) |
| 영상 페이지 `/review/ax-sprint2/video` + 심사 페이지 '소개 영상' 섹션 + 홈 섹션 (`ReviewVideo`: 비율 전환·위치/속도 유지·1/1.25/1.5배·전체 화면·영상 흐름 14개·내려받기) | VERIFIED (qa-video) |
| 제작 원본 `video/ax-sprint2/` (대본 chunks·자막 srt·장면 build.py·렌더 스크립트·장면표 README) | DONE |

## PASS 16 변경 요약 (2026-10-14) — AX Sprint II 심사위원 페이지
| 항목 | 상태 |
|---|---|
| `/review/ax-sprint2` 공개 읽기 전용 페이지 (D-068): 상단 고정 시연 표시·페이지 안 이동, 8개 섹션, 인터랙티브 데모(제품·상황 선택 → 실제 계산 함수 결과·시간선·8주 판매·계산 방법), 고객 신호(여정·최근 7일 신호·관심점수 표·결합 판단), Closed Loop, 3단 개발 현황, 확장 3단계 | VERIFIED (qa-review 80/80 · axe 0 · 8개 폭 가로 넘침 0 · 콘솔 오류 0) |
| 원고·기준 `AX_SPRINT2_REVIEW_SOURCE.md` (섹션 순서·핵심 메시지·현재/PILOT/향후·금지 표현·영상 장면 8컷·데모 숫자) | DONE |
| `/ax`·`/beauty`·`/login` 회귀 없음 (새 파일 위주, 기존 변경은 `DeviceView.tsx` 한 줄) | VERIFIED (전체 회귀) |

## PASS 15 변경 요약 (2026-10-14) — 고도화·UI/UX
| 항목 | 상태 |
|---|---|
| **운영 기준값** (R-21·R-23, D-065): 설정 > 운영 기준값 — 안전 재고일수·입고 후 판매 일수·생산 수량 단위·사후 성과 측정 기간, 대표만 수정, 저장 전 영향 미리보기(가장 급한 상품의 착수 마감·추천 생산량), 생산 판단·Action 문장·사후 성과·알림 센터에 반영, 백업 포함. **migration 009** `organizations.planning` (범위·키 CHECK, OWNER만 수정) | Demo VERIFIED · DB 135/135 · Live E2E |
| **결함 수정** (D-064): 대화상자·Action 처리 창이 헤더(제목·닫기 버튼 가림)·하단 메뉴 아래에 그려지던 문제 → body portal, 배경 막이 헤더까지 덮음 | VERIFIED (PC·모바일 위치 검증) |
| 처리 창 (D-066): 첫 단계 버튼 아래 고정, 추천 뒤 데이터·기준값이 바뀌면 '지금 다시 계산하면' 상자 (추천 당시 기록 보존) | VERIFIED |
| 고객 앱 모바일 (D-067): 상단 메뉴 4칸 한 줄(이전: '뷰티 패스포트' 잘림)·현재 화면 표시, Finder 단계 원 정렬·'질문 1 / 5'·고민 카드 줄바꿈 | VERIFIED |
| 판매 파일 가져오기 단계 한글 (파일 선택·열 확인·검사·저장, 현재 단계·지난 단계 ✓) | VERIFIED |

## PASS 14 변경 요약 (2026-10-14) — 고도화·UI/UX
| 항목 | 상태 |
|---|---|
| **대표 보고 모드** `/ax/present` (R-01, D-061): 데이터에서 자동 생성 9장(직원 6장) — 요약·4주 숫자·이번 달·제품·채널·고객·실행·결정 필요. ←/→·숫자키·Esc·좌우 밀기, 전체 화면, 인쇄(1장 = 가로 1쪽), 주소로 특정 장. 대시보드·주간 리포트·빠른 이동에서 열기 | VERIFIED (Demo, axe 0) |
| 채널 비교: 축 라벨이 겹치던 차트 → 순위 막대(이전 4주 세로선·증감) (D-060). 채널 상세·B2B·수출·정산 모바일 카드(정산 카드에서 입금 기록·수정), KPI 2열 | VERIFIED |
| 실증·Evidence: 내부 코드 노출 정리(DO NOT INVENT·NOT STARTED·RESULT CONFIRMED·eventType 영문) → 한글 우선 (D-062), '12주 실증 진행' 타임라인 카드(현재 단계·완료 단계), Before/After 접기 | VERIFIED |
| 고객 인사이트: 제목 정리, 관심점수 모바일 카드(제품명 잘림 없음), KPI 2열 | VERIFIED |
| 설정: 섹션 바로가기 6개(고정 헤더에 가리지 않게 이동), 테마 이름 3줄 줄바꿈 → 한 줄 + 색 띠, 데이터 항목 한글 | VERIFIED |
| 주간 운영 점검 7번째 항목 '데이터 품질 오류 정리' (R-22, D-063) | VERIFIED |

## PASS 13 변경 요약 (2026-10-13) — UI/UX 개선·고도화
| 항목 | 상태 |
|---|---|
| 모바일 표 → 카드 (D-058): 상품·재고·생산 착수 일정·OEM 생산 현황 — 판단 숫자 2열, 재고 카드에 '재고 수정', 표와 카드 중 하나만 렌더(`useNarrow`). PC는 표 유지 | VERIFIED (390px 가로 넘침 0) |
| 월별 실적 모바일: 12개월 버튼 4줄 → '‹ 월 선택 ›' 한 줄(44px), 처음·마지막 달에서 버튼 비활성 | VERIFIED |
| 탭: 화면보다 넓으면 가려진 쪽 가장자리 흐림 + 선택된 탭 자동 스크롤(뒤쪽 탭으로 바로 들어와도 보임), 스크롤바 숨김 | VERIFIED |
| 데이터 상태 줄 모바일 한 줄(불러온 시각 숨김), 데이터 관리 DEMO 안내 짧게, 알림 패널 제목 줄바꿈 수정 | VERIFIED |
| **알림 센터** (D-059): 생산 착수 마감·연체 미수금·데이터 품질 오류·판매 입력 지연·새 Action·사후 성과 측정 완료·결과 확정 대기 — 위험순, 해당 화면 바로 이동, 역할 권한, 해결하면 자동으로 사라짐 | VERIFIED (axe 0) |

## PASS 12 변경 요약 (2026-10-13) — UI/UX
| 항목 | 상태 |
|---|---|
| 대시보드 재구성 (D-055): 핵심 숫자 → 오늘 먼저 할 일(컴팩트 행) + 대표 브리핑(위험·주의 5줄 우선, 펼치기) 나란히 → 분석 탭(제품 성장·재고 위험·채널 매출·고객 행동, 마지막 탭 기억). PC 4,060→2,314px, 모바일 8,874→3,937px, 모바일 첫 할 일 2,500→1,200px | VERIFIED |
| 빠른 이동 (D-056): Ctrl/⌘+K·/ — 화면·탭·상품(SKU·초성)·열린 Action, 권한 반영, 상품/Action 상세 바로 열기(`?p=`·`?a=`), 접근성(combobox·키보드·포커스 복귀) | VERIFIED (axe 0) |
| Growth Center: 상태 필터(개수 포함, 잘림 없음), 컴팩트 Action 행, 오늘의 Mission은 목록 맨 위 '오늘 먼저 #n'(중복 카드 제거), 카테고리 '정산' 추가, 처리 사이드 패널 | VERIFIED |
| 셸: 사이드바 밀도(높이 860에서도 메뉴 13개 전부, 이전엔 아래 2개가 잘림), 페이지 제목·카드 모바일 압축, KPI 카드 컴팩트(모바일 2열), 헤더 시계 줄바꿈 수정, 탭 키보드(←→ Home End) | VERIFIED |
| 차트 (D-057): 실선 헤어라인 격자, 선 2px·점 링, 막대 4px 둥글림, 움직임 줄이기 시 애니메이션 끔(인쇄·캡처 중 선 멈춤 방지) | VERIFIED |
| 고객 화면: '전체 보기 →' 줄바꿈·가격 옆 Demo 표시 줄바꿈 수정 | VERIFIED |

## PASS 11 변경 요약 (2026-10-13)
| 항목 | 상태 |
|---|---|
| 샘플 자료 연습 모드 (`/ax/start`, Demo 주소·대표만): 빈 Demo로 시작 → 오늘 기준 가상 파일 3개(판매 8주·상품 정보·재고·추가 1주, 실수 3종 포함) → 연습 순서 7단계 → 끝내기(시연 데이터 복원). 모든 화면·인쇄물에 연습 배너, 백업·이관 제외, Live 품질 점검 '샘플 자료 섞임' 오류 | Demo VERIFIED (리허설 51항목) · Live VERIFIED (혼입 경고) |
| **결함 수정**: 상품·채널 0개인 첫날 판매 화면이 '상품 먼저 등록'만 보여 판매 파일로 시작 불가 → 파일 가져오기 항상 표시 (D-054) | Demo·Live VERIFIED |
| **결함 수정**: 판매를 몰아 올리면 입력 전 날을 0으로 세어 판매속도·성장률 왜곡(+50% 상품이 −7%) → '최근 4주'를 마지막 판매일 기준, 2일 이상 늦으면 대시보드 안내 (D-053). 재고·착수 마감은 오늘 기준 | VERIFIED |
| 상품 파일 재고 열(현재·안전·입고예정) — 재고 현황 엑셀 한 번에, 재고현황 내보내기 파일 재업로드 가능 | Demo·Live VERIFIED |
| 시작 가이드 '다음 단계' 버튼 모바일 넘침 수정, 연습 상태·빈 상태 14화면 390px 점검 | VERIFIED |
| `STAGE3_DELIVERY_REPORT.md` 3단계 보고서 초안 | DRAFT (USER 결정 대기) |

## PASS 10 변경 요약 (2026-10-13)
| 항목 | 상태 |
|---|---|
| A. OEM 생산기간·최소 생산수량 (migration 008 `products.lead_time_days`·`moq`): 상품·재고·생산 > OEM 생산 '생산 착수 일정'(마감 가까운 순, 미입력 상품 안내), 재고 표 '생산 착수' 열, 추천 생산량 = 예측 일판매 × (생산기간+안전 14+42일) − 가용 재고(50개 단위·MOQ 이상), RULE '생산 착수'(마감 14일 이내·진행 중 생산 없을 때만, 일반 재고·생산 규칙과 중복 없음). 상품 폼·상품 파일(SKU+생산기간 두 열로도)·내보내기 | Demo VERIFIED · Live VERIFIED |
| B. 월 매출 목표 (`monthly_targets`, 대표만 입력·관리자 열람, 입력자=로그인 계정): 월별 실적 목표 카드(달성률·월 경과 비교·월말 '추정'), 차트 목표선, CSV 목표·달성률 열, 대시보드 '목표 대비 %', 백업·이관 포함 | Demo VERIFIED · Live VERIFIED (ADMIN API 입력 403) |
| C. Action 사후 성과: 완료 Action의 실행 전 14일 vs 완료 후 14일 일평균(상품=판매량·매출, 채널=매출, 완료 후는 어제까지·판매 기록이 있는 날까지만), '측정 중 n/14일', 인과 아님 고정 안내 — Action 상세·실증 결과 확정·주간 리포트 | Demo VERIFIED (계산값 대조) · Live VERIFIED (주간 리포트) |
| D. 데이터 품질 점검 (데이터 관리 > 품질 점검): 11개 점검(오류/확인), 고칠 화면 링크, 미래 날짜·중복 판매만 확인 후 삭제(대표·관리자) | Demo VERIFIED · Live VERIFIED (DB 삭제) |
| 상품 파일: SKU 열만 필수 (기존 상품 일부 열만 수정 가능), 새 SKU는 제품명·카테고리·판매가 없으면 그 행만 오류 | VERIFIED |
| DB: `008_pass10_leadtime_targets.sql` + `40_pass10_test.sql`, `setup_all.sql` 재생성(008 포함), 공개 전 점검에 m008 | VERIFIED (verify:db) |

## PASS 9 변경 요약 (2026-10-09)
| 항목 | 상태 |
|---|---|
| 작업 데이터 백업·이관 (데이터 관리 > 내보내기): 실데이터만(채널·상품·재고·판매·정산·Pilot 시작일·AX OWNER) JSON 백업 → Demo 복원 또는 Live 이관. 같은 SKU·채널명·정산·판매는 건너뜀(여러 번 가져와도 중복 없음), 기존 값 덮어쓰지 않음, 비UUID ID는 새 UUID. 고객 개인정보·행동·Action/Proof·Baseline 제외. 받기=대표·관리자, 가져오기=대표 | Demo VERIFIED (24/24) · Live VERIFIED (Demo 파일 → Live 이관·재가져오기 무변화) |
| 파일 검사: JSON·종류·버전, 항목별 형식(카테고리·날짜·수량·참조), 20만 행·50MB 상한, `javascript:` 링크 제거, 이름의 HTML은 글자로만 | VERIFIED |
| Demo 실데이터 백업 안내 배너 (데이터 관리) | VERIFIED |
| 사업화 실적 자료 기간: 최근 12개월·올해·작년 (CSV 파일명에 기간) | VERIFIED |
| 결함 수정: 판매 파일에서 등록하는 상품·채널 ID가 보안 컨텍스트가 아니면(사내 http 주소) UUID가 아니어서 Live 저장 실패 가능 → 항상 UUID | FIXED |

## PASS 8 변경 요약 (2026-10-09)
| 항목 | 상태 |
|---|---|
| 판매 파일 가져오기: 파일에만 있는 상품·채널을 그 자리에서 등록 (카테고리=상품명 추정, 판매가=파일 매출÷수량 추정, 채널 유형=채널명 추정 — 모두 '추정' 표시·확인 후 저장, 대표·관리자만), SKU 없으면 AUTO 코드, 등록 후 자동 재검증 | PILOT — Demo VERIFIED, Live VERIFIED(로컬 스택: 실제 인증·RLS) |
| 자료 진단 (파일 그대로 요약: 기간·행·상품·채널·수량·매출·해석 실패·4주 미만 경고) | Demo VERIFIED |
| 사업화 실적 자료 `/ax/business` (대표·관리자) — 최근 12개월, 증감은 **완료된 달만** 비교, Live는 Demo 표시 상품·시드 제외, 평가·전망 문장 없음 | Demo·Live VERIFIED |
| 면담·현장확인 대비 `/ax/business?tab=inspection` — Demo에서는 '현장확인에 Demo 숫자 사용 금지' 경고 | Demo·Live VERIFIED |
| 보안: Next.js 16.3.7 → **16.4.0** (high 6건: 이미지 최적화 SSRF·캐시 오염 등), 하한 `^16.4.0` | FIXED — audit 0, 전체 회귀 재실행 |
| 결함 수정: 판매 가져오기 검증이 새 채널 등록에 반응하지 않음(의존성 누락) | FIXED |
| 결함 수정(접근성, 잠복): 채널 도넛 조각이 이름 없는 이미지·빈 탭 정지점 — 이전 '0건'은 차트가 그려지기 전 검사 결과. 도넛 숨김(옆 목록이 같은 정보 제공)·탭 정지 제거, 검사는 차트 렌더 후 | FIXED + VERIFIED (28화면 0건) |

## PASS 7 변경 요약 (2026-10-07)
| 항목 | 상태 |
|---|---|
| 배포 상태 확인: Vercel 프로젝트 연결, 기본 브랜치 push마다 Production 자동 배포, 공개 주소 https://gayeon-miryeo-kbeauty-growth-ax.vercel.app = DEMO 모드·최신 커밋, 배포별 주소는 Vercel 로그인 보호 | VERIFIED (GitHub deployments API + curl) |
| 공개 주소 HTTP 점검: 23개 경로 200·DEMO 표기, AI 브리핑 POST → 503 AI_DISABLED(비용 없음), HSTS 있음 | VERIFIED |
| 결함(공개 사이트): 검색 노출 제어 없음(robots 404·noindex 없음), 보안 헤더 없음(nosniff·Referrer·Permissions·클릭재킹 차단) → D-039 | FIXED + 배포 확인 (커밋 5e02e0b, 공개 주소에서 robots·헤더 6종·noindex 확인) |
| 결함: 저장한 테마·글자 크기·모션 줄이기가 hydration 후에야 적용 → 매 진입 시 기본 테마 깜빡임, 모션 줄이기 사용자에게 첫 애니메이션 재생 → D-041 | FIXED + VERIFIED (JS 차단 상태에서도 첫 화면에 적용 3종·hydration 후 기본값으로 바뀌는 순간 없음) |
| 공개 주소 브라우저 자동 테스트 | NOT RUN — 작업 환경 프록시 인증서를 브라우저가 신뢰하지 않음. 인증서 검증 우회는 하지 않음. 같은 커밋의 로컬 빌드로 대신 검증 |

## PASS 6 변경 요약 (2026-10-07)
| 항목 | 상태 |
|---|---|
| 공개 전 점검 `/ax/system` (대표·관리자) — 연결·HTTPS, migration 001·005·006·007 설치, 익명 노출(RLS) 8개 테이블·비공개 상품, 고객 화면 조직 ID·공개 상품·구매 링크·처리방침, 관리 키 유효성, AI 설정 일치, 직접 확인 3항목, 조직 ID 복사 | PILOT — Demo VERIFIED, 로컬 Live VERIFIED(정상 판정 + RLS 해제 시 노출 탐지) |
| `/api/system/status` — 서버 설정 참/거짓만, Live는 대표·관리자, 비로그인 401 | VERIFIED (로컬 Live) |
| Supabase 일괄 설치 `supabase/setup_all.sql` (`npm run setup-sql`) — 한 트랜잭션, 004 제외 | VERIFIED — verify:db가 최신 여부·개별 적용과 스키마 동일(128 CREATE) 확인 |
| 주간 운영 점검 6항목 (판매 7일·재고 7일·미검토 Action 3일·진행 지연 14일·미확정 Proof·연체 미수금) — 시작 가이드 하단, 주간 리포트(인쇄), 가이드 완료 후 대시보드 배너 | PILOT (Demo VERIFIED) |
| 서버 인증 공통화 `src/lib/server/auth.ts` (AI 브리핑·점검 API) | 회귀 통과 |

## PASS 5 변경 요약 (2026-10-07)
| 항목 | 상태 |
|---|---|
| 실데이터 시작 가이드 `/ax/start` — Week 0~4 13단계 자동 판정(Demo 시드 제외), 대시보드 진행 배너(OWNER/ADMIN) | PILOT (Demo VERIFIED) |
| 대표 브리핑 AI 문장화 — `/api/ai/briefing`(서버 전용 키, OWNER/ADMIN, 시간당 20회, 입력은 RULE 문장만·개인정보 없음), 기록에 없는 숫자·거절 시 폐기하고 RULE 요약 유지 | READY (기본 꺼짐) — 가짜 API 서버로 11/11 VERIFIED, 실제 API NOT VERIFIED |
| 접근성 — axe-core WCAG 2.1 A/AA 25개 화면 × PC(1440)·모바일(390) | 위반 0건 (대비 토큰 `--success`·`--warning`·`--b-gold-ink`, 표 스크롤 키보드 접근, 버튼 이름) |
| 1차 완료 보고서 초안 | `STAGE2_DELIVERY_REPORT.md` — `[ ]` 칸(보고일·공개 URL·계정) 채워 발송 |
| 의존성 보안 업데이트 (sharp, source-map-js — npm audit 0건) | 전체 회귀 통과 |

## PASS 3 변경 요약
| 항목 | 상태 |
|---|---|
| 로컬 Supabase 호환 스택: Supabase Auth(소스 빌드) + PostgREST 호환 게이트웨이 + SMTP 수신 | 구축 (`supabase/tests/live-e2e/`) |
| Live 모드 브라우저 E2E 45단계 (로그인·조직 생성·실데이터·익명 고객·Action·Proof·Baseline·초대 메일·역할별 화면·장애) | **VERIFIED (로컬 스택)** |
| 결함 수정: 익명 고객 Finder 결과 저장이 RLS로 거부 (insert+select) | FIXED + VERIFIED |
| 결함 수정: 역할 확인 전 대표가 '직원'으로 보이고 메뉴가 줄어듦 | FIXED + VERIFIED |
| 결함 수정: Live에서 구매 링크 미등록 안내에 'Demo' 표기 | FIXED |
| DB 장애 시: 자동 재시도(~15초) 중 안내 → Error 화면, Demo 대체 없음 | VERIFIED |
| migration 006: 익명 이벤트 한도·서버 시각 강제·크기 제한 | VERIFIED (DB 10개 시나리오) |
| 상품 일괄 등록 CSV/XLSX (SKU upsert, 빈 칸 유지) | Demo·Live VERIFIED |
| Next.js 16.3.7 업그레이드 (npm audit 0건) | 전체 회귀 통과 |

## PASS 2 변경 요약
| 항목 | 상태 |
|---|---|
| migration 001~005 + RLS 55개 시나리오 (로컬 Postgres 16 + Supabase auth stub) | VERIFIED — `npm run verify:db` |
| 결함 수정: 003의 익명 고객 이벤트 insert가 항상 거부됨 → 005에서 수정 (D-019) | FIXED + VERIFIED |
| Action 상태 전이·승인 권한 DB 강제, Proof 직접 확정 차단 (D-015) | VERIFIED (DB) |
| Realtime publication 등록 (customer_events, growth_actions) | VERIFIED (DB) |
| Baseline Lock (KPI별 기준값·기간·방법·출처, 이력 보존) + Baseline 대비 변화 | PILOT (Demo VERIFIED) |
| AX OWNER 지정 | PILOT (Demo VERIFIED) |
| 주간 Evidence 리포트 `/ax/reports/weekly` (주 이동, 인쇄·PDF) | PILOT (Demo VERIFIED) |
| 판매 파일 가져오기: CSV/XLSX, 한글 열 자동 인식·매핑, 날짜/금액 정규화, EUC-KR, 중복 의심 | PILOT (Demo VERIFIED) |
| 구성원 관리: 초대·역할 변경·제거 (Live: 서버 API, Demo: 브라우저) + 초대 수락 시 비밀번호 설정 | Demo VERIFIED / Live READY (NOT VERIFIED) |
BRANCH: `claude/miryeo-kbeauty-growth-ax-9urrn9`

> 다음 세션 시작 순서: PROJECT_SPEC → PROJECT_STATE(이 파일) → DECISIONS → EVIDENCE_PLAN → QA_REPORT → 아래 NEXT PRIORITY부터.

## 0. Audit 결과 (PASS 1 시작 시점, 1차 MVP 기준)
| 항목 | 이전 상태 | PILOT V2 조치 |
|---|---|---|
| Data Mode | README는 "Supabase 연결 시 자동 Live"였으나 코드는 항상 Demo | `NEXT_PUBLIC_DATA_MODE` 명시 전환, Live 실패 시 Error (fallback 금지) |
| Schema / RLS | 없음 | migration 001~004 |
| Auth / Role | 없음 | Supabase Auth + organization_members, Demo Role Switcher |
| 실데이터 입력 | 없음 | 데이터 관리(단건 + CSV Preview/Validation/Confirm) |
| 고객 → AX 연결 | Passport localStorage만 | customer_events Bridge + Interest Rule → Growth Action |
| Action 상태 | 화면 버튼만 | NEW→REVIEWED→IN_PROGRESS→DONE/DISMISSED + action_events 이력 |
| Proof | 없음 | proof_events (DRAFT→CONFIRMED/REJECTED, OWNER 확정) |
| Device View | 없음 | PC / Mobile / PC+Mobile, 같은 앱 iframe + Route Sync |
| Theme | 6개 비표준 | Canonical 7 (v4.1 Hex) + legacy migration |
| 허위 가능 데이터 | 평점·리뷰수·효능 문구 | 제거, Demo 표기 익명 제품 |

## 1. BUSINESS AX (`/ax`)
| 화면 | 상태 | 비고 |
|---|---|---|
| 대시보드 | PILOT | KPI drill-down, 오늘의 Mission, 고객행동 피드, Matrix, 랭킹, 채널(권한) |
| Growth Center | PILOT | Action 생애주기 Drawer, KPI before/after, 고객 노출 반영 |
| 고객 인사이트 | PILOT | 이벤트 집계, 관심 점수, 실시간 피드 |
| 제품·재고 | PILOT | 재고일수·추천발주(RULE/STAT) |
| 채널·B2B·수출 | PILOT (OWNER/ADMIN) | 입력 기반 |
| 데이터 관리 | PILOT | 단건 + 파일(CSV/XLSX, 열 매핑·검증·중복 감지, 자료 진단, 미등록 상품·채널 즉시 등록), 샘플 템플릿 `public/samples/` |
| 실증·Evidence | PILOT | Money KPI 3 + Baseline Lock·대비 변화, Proof 확정/반려, 수동 Proof, 12주 계획 |
| 주간 Evidence 리포트 | PILOT | `/ax/reports/weekly`, 인쇄·PDF |
| 설정 | PILOT | 7 Theme·글자·모션·역할매트릭스·Demo Reset·Pilot 시작일·AX OWNER·AI 상태·기술자산·구성원 |
| 도입 배경(Why) | DEMO→설명 | 문서형 |
| 실데이터 시작 가이드 | PILOT | `/ax/start`, 13단계 자동 판정 + 매주 운영 점검 7항목 (PASS 14: 데이터 품질 오류 추가) |
| 공개 전 점검 | PILOT | `/ax/system`, Live에서 DB·RLS·설정 자동 점검 |
| 사업화·현장확인 | PILOT | `/ax/business` — 사업화 실적 자료(인쇄·CSV) / 면담·현장확인 대비 (대표·관리자) |
| AI 요약(LLM) | READY | 대표 브리핑 Claude 문장화 구현·기본 꺼짐 (D-012, D-034) |

## 2. CUSTOMER FRONT (`/beauty`)
| 기능 | 상태 |
|---|---|
| 홈 / 지금 주목받는 제품(AX featured 반영) | PILOT |
| AI Finder (RULE 추천) | PILOT |
| 제품 목록·상세 | PILOT (Live는 is_published 상품만) |
| 구매 링크(outbound) | READY — 링크 미등록 시 "연결 예정" 안내 + 이벤트 기록 |
| Beauty Passport | PILOT (브라우저 저장) |
| 결제/주문 | NOT BUILDING |

## 3. DATA BRIDGE
- 이벤트 8종: view_product, wishlist_add/remove, finder_start, finder_complete, recommendation_view, passport_save, outbound_click
- 익명 session_id, 개인정보 미수집 (D-006)
- Demo: localStorage + storage/custom 이벤트로 PC·Mobile 즉시 동기화 → **VERIFIED**
- Live: 익명 이벤트 기록 → 로컬 Supabase 호환 스택 브라우저 E2E **VERIFIED**, 한도(006) VERIFIED. 실제 Supabase·Realtime은 NOT VERIFIED

## 4. EVIDENCE / AX COACH
- Closed Loop: Customer Event → Interest Rule → Growth Action → Human 상태 전환 → Result(KPI after) → Proof Event → OWNER 확정 → 성과·증빙 → **Demo VERIFIED**
- Baseline Lock 기능: 구현 완료. 실제 기준값: **REQUIRED / UNKNOWN** (고객 입력 대기)
- TARGET: DO NOT INVENT
- AX OWNER 지정 기능: 구현 완료. 실제 담당자: **REQUIRED / UNASSIGNED**

## 5. SYSTEM CORE
- DataSource 인터페이스(Demo / Live) — Demo VERIFIED, Live 구현 완료·NOT VERIFIED
- Supabase migration 001~006 — 로컬 Postgres 16에서 적용·재실행·RLS·트리거 65개 시나리오 VERIFIED, Supabase Auth 실서버와 함께 E2E VERIFIED. 실제 Supabase 프로젝트 적용은 NOT VERIFIED
- RLS: STAFF의 B2B/수출/고객 차단, 승인·보류 OWNER/ADMIN(트리거), proof 확정 OWNER, baseline·tech_assets·조직설정 OWNER, anon은 이벤트 기록·공개 상품만
- SERVICE ROLE key: `/api/org/members` 서버 Route에서만 사용 (선택). 클라이언트 번들 검사: 키 값·서버 코드 없음

## 6. DEVICE VIEW
- PC / Mobile(390×844 iframe) / PC+Mobile — VERIFIED
- Route 양방향 동기화, 새로고침 유지, frame 내부 switch 숨김(중첩 없음) — VERIFIED
- 높이 < 약 880px이면 frame이 비율 축소 (내부 viewport 390 유지) — KNOWN

## 7. QA
- 2026-10-14 (PASS 15 고도화·UI/UX): typecheck / build / audit 0 PASS, **PASS15 41/41**, PASS14 57 · PASS13 55 · PASS12 46, 샘플 리허설 51, **DB 135/135**(009 운영 기준값 18개 추가, setup_all 동등), **Live E2E 96/96**(운영 기준값 저장·RLS·초기화 4항목 추가), Demo PASS10 42 · Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, Route 35×8 이상 0, 접근성 34화면 × 2폭 + 연습 상태 11화면 0건, 처리 창·대화상자 층 결함 1건(PILOT V2부터) 발견·수정 → `QA_REPORT.md`
- 2026-10-14 (PASS 14 고도화·UI/UX): typecheck / build / audit 0 PASS, **PASS14 57/57**(최종 빌드 재실행 포함 2회), PASS13 55 · PASS12 46, 샘플 리허설 51, **Live E2E 92/92**(보고 모드 Live 1항목 추가), Demo PASS10 42 · Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, Route 35×8 이상 0, 접근성 34화면(보고 모드 2·B2B·수출 추가) × 1440·390 + 연습 상태 11화면 0건, DB 변경 없음 → `QA_REPORT.md`
- 2026-10-13 (PASS 13 UI/UX·알림 센터): typecheck / build / audit 0 PASS, **PASS13 55/55**(2회 연속), PASS12 46, 샘플 리허설 51, **Live E2E 91/91**(알림 센터 Live 계산 1항목 추가), Demo PASS10 42 · Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, Route 34×8 이상 0, 접근성 30화면 + 연습 상태 11화면 0건 + 알림 패널 열린 상태 0건 (종 버튼 이름·보이는 숫자 불일치 1건 발견·수정), DB 변경 없음 → `QA_REPORT.md`
- 2026-10-13 (PASS 12 UI/UX): typecheck / build / audit 0 PASS, **PASS12 UI/UX 46/46**(3회 연속), 샘플 리허설 51, Live E2E 90/90, Demo PASS10 42 · Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, Route 34×8 이상 0, 접근성 30화면 + 연습 상태 11화면 0건 (상태 칩 개수 배지 대비 부족 1건 발견·수정), DB는 변경 없음(117 — PASS 11 결과) → `QA_REPORT.md`
- 2026-10-13 (PASS 11): typecheck / build / audit 0 PASS, DB 117/117, Live E2E 90/90, **샘플 자료 리허설 51/51**, 연습 상태 접근성 0건(11화면×2폭), Demo PASS10 42 · Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, Route 34×8 이상 0, 접근성 30화면 0건 (AI 11은 PASS 10 결과 — 이번 변경은 AI 경로 미변경, Demo 수치 동일) → `QA_REPORT.md`
- 2026-10-13 (PASS 10): typecheck / build / audit 0 PASS, DB 117/117 (001~008), Live E2E 85/85, Demo PASS10 42 · Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5 · AI 11, Route 34×8 이상 0, 접근성 30화면 0건 → `QA_REPORT.md`
- 2026-10-09 (PASS 9): typecheck / build PASS, Route QA 33×8 이상 0, Demo Flow 31 · PASS2 33 · PASS3 11 · Stage2 41 · PASS6 19 · PASS8 32 · PASS9 24 · boot 5, 접근성 28화면 0건(차트 렌더 후), Live E2E 77/77 → `QA_REPORT.md`

## 8. USER ACTION QUEUE
| # | 구분 | 작업 | 상태 |
|---|---|---|---|
| 1 | SUPABASE | Project 생성 | WAITING |
| 2 | SUPABASE | 새 프로젝트: **`supabase/setup_all.sql` 1회 실행** (또는 001→002→003→005→006→007→008→009 개별, 004 선택). 이미 008까지 적용한 DB면 009만 추가 | WAITING |
| 3 | SUPABASE | OWNER 계정 생성 → `/login` → 조직 만들기 | WAITING |
| 4 | ENV | `NEXT_PUBLIC_DATA_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | WAITING |
| 5 | ENV | `NEXT_PUBLIC_MIRYEO_ORG_ID` (조직 생성 후) | WAITING |
| 6 | VERCEL | 환경변수 반영 + Redeploy (프로젝트·자동 배포는 이미 연결됨 — DEMO 운영 중) | WAITING |
| 6-0 | CHECK | 재배포 후 대표 계정으로 `/ax/system` → "공개 가능 — 문제 없음" | WAITING |
| 6-1 | ENV (선택) | `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 앱 내 초대용) + Supabase Redirect URL에 `/login` 추가 | WAITING |
| 7 | DATA | 실제 상품 1~2개, 재고, 판매 샘플, 구매 링크 | WAITING |
| 8 | DATA | Pilot 시작일 + Money KPI 3 Baseline 잠금 (실측·자기기록 값) | WAITING |
| 8-1 | DATA | 실제 판매 엑셀 샘플 1개 (열 이름 별칭 보강용) | WAITING |
| 8-2 | LEGAL | **고객 개인정보 처리방침 URL·버전 확정** → `NEXT_PUBLIC_PRIVACY_POLICY_URL`, `NEXT_PUBLIC_PRIVACY_VERSION` (없으면 Live 회원가입 비활성), 별지 제6호 적용 여부 | WAITING |
| 8-3 | DATA | 제품별 사용기간(일) — 재구매 예상일 정확도 (미입력 시 종류별 추정) | WAITING |
| 8-4 | DATA | 거래처별 청구·입금 현황 (미수금 초기값) | WAITING |
| 8-5 | DATA | 제품별 OEM 생산기간(일)·최소 생산수량 — 생산 착수 마감일 계산 (미입력 시 기존 소진일 기준) | WAITING |
| 8-6 | DATA | 월 매출 목표 (대표 입력, 시스템이 만들지 않음) | WAITING |
| 8-6a | DATA (선택) | 운영 기준값 — OEM 계약서·실제 입고 주기 기준 안전 재고일수·입고 후 판매 일수·생산 수량 단위, 사후 성과 측정 기간 (설정 > 운영 기준값, 미입력 시 업계 일반값 14·42·50·14) | OPTIONAL |
| 8-7 | DECISION | 3단계 보고 방식 (샘플 자료 검증 / 실제 자료 적용 후 / 둘 다) — `STAGE3_DELIVERY_REPORT.md` §6 | WAITING |
| 8-8 | (선택) PRACTICE | 대표·AX OWNER가 Demo 주소 `/ax/start` > 샘플 자료로 연습하기 (약 30분, 이 브라우저만) | OPTIONAL |
| 9 | PEOPLE | AX OWNER 지정, ADMIN/STAFF 계정 목록 | WAITING |
| 9-1 | DECISION | 대표 브리핑 AI 문장화 사용 여부 (외부 AI 사용료 고객사 부담, 계약 제16조) → 사용 시 `ANTHROPIC_API_KEY`(서버 전용)·`AI_BRIEFING_ENABLED=true`·`NEXT_PUBLIC_AI_BRIEFING=on` | WAITING |
| 9-2 | REPORT | `STAGE2_DELIVERY_REPORT.md`의 `[ ]` 칸 확인 후 발송 (공개 URL 확보 후) | WAITING |
| 10 | FACT | 법인 관계(가연인터내셔널·MIRYEO·OEM), 기술자산 상태 확인 | WAITING |

## 9. KNOWN ISSUES
- Live 모드 전체 NOT VERIFIED (자격증명 없음)
- Demo seed 특성상 Rule Action이 다수(약 11건) 열림, B2B·수출 추세 음수 표시 가능
- 토스트가 연속 동작 시 여러 개 쌓임 (기능 영향 없음)
- 구성원 초대: Live 실검증 전 (Supabase 초대 메일·Redirect 설정 필요)
- Realtime(고객 이벤트 즉시 반영)은 로컬 스택에 없어 NOT VERIFIED — Live에서는 새로고침/재방문 시 반영은 확인됨
- 로컬 게이트웨이는 PostgREST 호환 최소 구현 — 실제 Supabase 연결 후 1회 재확인 필요
- Demo seed 고객 이벤트는 세션이 흩어져 있어 주간 REVENUE 전환율이 0%로 보일 수 있음 (Demo 한정)
- 기술자산 상태 기본값 "미확인"
- AI 문장화는 실제 Anthropic API로 호출해 본 적 없음 (가짜 서버로 요청 형식·검증·거절 처리만 확인). 켜는 날 1회 실호출 확인 필요
- AI 사용 한도(시간당 20회)는 서버 인스턴스 메모리 기준 — 서버리스 인스턴스가 여러 개면 합산되지 않음
- 생산 계획 상수(안전 14일·입고 후 42일·50개 단위)는 업계 일반값 — 실제 OEM 계약 조건(분할 입고·포장재 별도 리드타임)을 받으면 조정 (`PLANNING`)
- Action 사후 성과는 전후 비교(인과 아님). 판매가 적은 상품은 14일 일평균의 변동이 큼
- '최근 4주' 기준일은 조직 전체의 마지막 판매일 — 채널마다 입력 시점이 크게 다르면(예: 도매만 월 1회) 늦은 채널의 최근 매출이 낮게 보일 수 있음 (D-053)
- 샘플 연습 자료 수치는 실행일에 따라 행 수가 조금 달라짐(요일 패턴) — 보고서 §2의 숫자는 실행일 기준
- 품질 점검의 '단가 이상'(판매가 30% 미만·150% 초과) 기준은 휴리스틱 — 묶음·증정 판매가 많으면 '확인'이 자주 뜰 수 있음

## 10. NEXT PRIORITY
0-1. **3단계 보고 방식 결정** (USER): `STAGE3_DELIVERY_REPORT.md` §6 — 샘플 자료 검증으로 보고 / 실제 자료 적용 후 보고 / 둘 다. 실제 자료가 오면 Demo 주소 '샘플 자료로 연습하기'와 같은 순서로 적용하고 §2 표를 실제 숫자로 다시 채운다
0. **시험버전 공개 + 1차 완료 보고** (계약 제12조: 보고 후 5영업일 이의 없으면 2단계 진행 확인) — USER ACTION 1~6 후 공개 URL을 `STAGE2_DELIVERY_REPORT.md`에 채워 발송
1. (USER ACTION 1~6 완료 시) **실제 Supabase 연결 확인**: `/ax/system` 점검 결과 확인 → `e2e.mjs`와 같은 순서로 1회 (특히 Realtime, 초대·가입 메일 Redirect URL)
2. 실제 판매·상품 엑셀 수령 → 데이터 관리에 그대로 올려 자료 진단·미등록 상품 등록 확인 → 열 별칭 보강 (Week 0). Demo 주소에서도 미리 시험 가능(이 브라우저에만 저장)
2-0. Demo 주소에 실데이터를 넣었다면 **백업 파일을 주기적으로 받기** (브라우저에만 저장) → Live 전환 직후 대표 계정으로 데이터 관리 > 내보내기 > 백업 파일 가져오기
2-1. 실데이터가 들어오면 사업화 실적 자료·현장확인 가이드를 실제 숫자로 리허설 (3단계 완료 근거)
3. 고객 화면 공개 준비: 실제 제품 정보·구매 링크 확인, 봇 방지(R-14) 필요성 판단
3-1. 실데이터가 4주 이상 쌓이면 대표 보고 모드(`/ax/present`)로 첫 월간 보고 리허설 — 슬라이드 문장·순서가 실제 회의에 맞는지 대표 피드백 (PASS 14)
4. Week 1~4 운영 지원: 주간 운영 점검 7항목 기준값을 실제 입력 주기에 맞게 조정(`ROUTINE_RULES`), 운영 점검 알림(R-17 — 화면 안 알림 센터는 PASS 13 완료, 메일·메신저 발송) 필요성 판단
5. (승인 시) AI 문장화 켜기 + 실호출 1회 확인 — D-034
6. 실제 OEM 생산기간·MOQ·월 목표를 받으면 생산 착수 일정·목표 카드로 리허설, 설정 > 운영 기준값(PASS 15)에서 안전일수·입고 후 일수·생산 단위를 실제 계약 조건으로 조정 (상품별 다른 값이 필요하면 R-21 상품별 확장)
7. 실데이터 첫 업로드 직후 데이터 관리 > 품질 점검으로 원가 단위·중복·미래 날짜 정리 (Week 0)
