-- 009 PASS 15 — 운영 기준값 (R-21 생산 계획 안전일수·입고 후 판매 일수·생산 수량 단위, R-23 Action 사후 성과 측정 기간)
-- 001~008 적용 후 실행. 재실행 안전. 새 프로젝트는 supabase/setup_all.sql 한 번이면 포함된다.
-- 기본값과 다른 항목만 저장하고(null = 모두 기본값), 범위는 화면(src/lib/planning.ts)과 같다.
-- 수정은 기존 org_update 정책(대표 OWNER만)을 그대로 따른다.

alter table public.organizations add column if not exists planning jsonb;

alter table public.organizations drop constraint if exists organizations_planning_check;
alter table public.organizations add constraint organizations_planning_check check (
  planning is null or (
    jsonb_typeof(planning) = 'object'
    -- 정해진 4개 키만
    and (planning - array['safetyDays', 'coverDays', 'roundTo', 'outcomeDays']) = '{}'::jsonb
    -- 각 값은 범위 안의 정수
    and (not planning ? 'safetyDays' or (jsonb_typeof(planning -> 'safetyDays') = 'number' and (planning ->> 'safetyDays') ~ '^[0-9]+$' and (planning ->> 'safetyDays')::int between 0 and 60))
    and (not planning ? 'coverDays' or (jsonb_typeof(planning -> 'coverDays') = 'number' and (planning ->> 'coverDays') ~ '^[0-9]+$' and (planning ->> 'coverDays')::int between 7 and 180))
    and (not planning ? 'roundTo' or (jsonb_typeof(planning -> 'roundTo') = 'number' and (planning ->> 'roundTo') ~ '^[0-9]+$' and (planning ->> 'roundTo')::int between 1 and 1000))
    and (not planning ? 'outcomeDays' or (jsonb_typeof(planning -> 'outcomeDays') = 'number' and (planning ->> 'outcomeDays') in ('7', '14', '28')))
  )
);

comment on column public.organizations.planning is '운영 기준값 (PASS 15): safetyDays 0~60 · coverDays 7~180 · roundTo 1~1000 · outcomeDays 7/14/28. 없는 키는 기본값(14·42·50·14)';
