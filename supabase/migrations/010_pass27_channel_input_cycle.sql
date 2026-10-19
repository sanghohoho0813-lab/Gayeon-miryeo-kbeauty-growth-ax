-- 010 PASS 27 — 채널별 판매 입력 주기 (R-24, D-086)
-- 도매·수출처럼 판매를 주·월 단위로 몰아 올리는 채널은 그 채널의 마지막 입력 기준으로 '최근 4주'를 계산한다.
-- 001~009 적용 후 실행. 재실행 안전. 새 프로젝트는 supabase/setup_all.sql 한 번이면 포함된다.
-- 수정은 기존 channels_write 정책(OWNER·ADMIN)을 그대로 따른다. 기존 채널은 모두 'daily'(지금과 같은 계산).

alter table public.channels add column if not exists input_cycle text not null default 'daily';

alter table public.channels drop constraint if exists channels_input_cycle_check;
alter table public.channels add constraint channels_input_cycle_check check (input_cycle in ('daily', 'weekly', 'monthly'));

comment on column public.channels.input_cycle is '판매 입력 주기 (PASS 27): daily 매일(기본) · weekly 주 1회 몰아서 · monthly 월 1회 몰아서 — 채널별 최근 4주 기준일 (src/lib/channel-cycle.ts)';
