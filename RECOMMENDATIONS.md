# RECOMMENDATIONS — 보류/제안 (PLUS·CONDITIONAL)

CORE 범위를 넘는 제안. 실사용 데이터로 필요성이 확인되면 PROJECT_SPEC에 승격한다.

| # | 제안 | 분류 | 이유 | 선행 조건 |
|---|---|---|---|---|
| R-01 | Presentation Mode (대표 보고용 전체화면 슬라이드) | PLUS | 월간 보고 시간 절감 | 실데이터 4주 이상 |
| R-02 | ~~Excel(.xlsx) 직접 업로드~~ | **DONE (PASS 2)** | 열 자동 인식 + 매핑 확인 | 실제 양식 수령 시 별칭 보강 |
| R-03 | ~~앱 내 구성원 초대~~ | **DONE (PASS 2)** | 서버 Route + service role | Live 실검증 필요 |
| R-04 | LLM 경영 요약 / Action 설명 문장 | CONDITIONAL | RULE 결과를 대표용 문장으로 | API 사용 승인, 비용 한도 |
| R-05 | ~~주간 Evidence PDF~~ | **DONE (PASS 2)** | 인쇄 → PDF 저장 | — |
| R-06 | 고객 로그인 + 재구매 알림 | CONDITIONAL | 재구매 Rule 정밀화 | 개인정보 처리방침 확정(법률 확인 필요) |
| R-07 | 외부 쇼핑몰 주문 연동 (스마트스토어 등) | NEXT | 수기 입력 제거 | 채널별 API 계약·권한 |
| R-08 | ~~Toast 중복 병합~~ | **DONE (PASS 2)** | 같은 문구 병합, 최대 3개 | — |
| R-10 | ~~Next.js 16 업그레이드~~ | **DONE (PASS 3)** | audit 0건, 전체 회귀 통과 | — |
| R-11 | ~~상품 CSV/XLSX 일괄 등록~~ | **DONE (PASS 3)** | SKU upsert, 열 자동 인식 | 실제 상품 목록으로 별칭 보강 |
| R-12 | ~~고객 이벤트 insert 속도 제한~~ | **DONE (PASS 3)** | DB 트리거 한도 + 서버 시각 강제 | 트래픽 규모에 맞게 한도 조정 |
| R-13 | Realtime 실검증 | Live | 로컬 스택은 Realtime 미포함 — 실제 Supabase에서 고객 이벤트 즉시 반영 확인 | Supabase 연결 |
| R-14 | 봇·스팸 방지 강화 (CAPTCHA/Turnstile 등) | 보안 | 세션 ID 교체형 남용은 조직 한도로만 제한됨 | 고객 화면 트래픽 발생 후 |
| R-09 | Demo seed 다양화 (B2B·수출 성장 시나리오) | 사소 | 데모 설득력 | — |

모두 **사업 방향 변경이 아닌** 범위 안의 제안이며, 실행 전 사용자 승인 필요.
