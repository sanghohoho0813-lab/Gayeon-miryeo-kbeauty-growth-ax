-- 004 OPTIONAL — Live 환경 동작 확인용 최소 Demo Seed
-- 실제 운영 DB에는 실행하지 않아도 된다. 모든 행은 is_demo / source='seed'로 표시되어 실제 데이터와 구분된다.
-- 전제: bootstrap_organization()으로 조직이 1개 이상 생성된 상태. 가장 먼저 생성된 조직에 입력한다.

do $$
declare
  org uuid;
  ch_direct uuid; ch_online uuid;
  p1 uuid; p2 uuid;
begin
  select id into org from organizations order by created_at limit 1;
  if org is null then raise notice 'organization 없음 — bootstrap_organization() 먼저 실행'; return; end if;

  insert into channels(organization_id, name, type, avg_discount_rate) values (org, '직영몰 (Demo)', '직영몰', 0.05) returning id into ch_direct;
  insert into channels(organization_id, name, type, avg_discount_rate) values (org, '온라인 마켓 (Demo)', '온라인몰', 0.18) returning id into ch_online;

  insert into products(organization_id, sku, name, category, line, price, cost, status, description, concerns, texture, routine_step, is_published, is_demo)
    values (org, 'DEMO-ESS-01', 'MIRYEO Product 01 (Demo)', '에센스/앰플', 'Demo 라인', 52000, 14500, '안정', '실제 제품 자료 수령 전 Demo 항목', '{수분,피부결}', '가벼움', 2, true, true)
    returning id into p1;
  insert into products(organization_id, sku, name, category, line, price, cost, status, description, concerns, texture, routine_step, is_published, is_demo)
    values (org, 'DEMO-CRM-01', 'MIRYEO Product 02 (Demo)', '크림', 'Demo 라인', 38000, 10500, '안정', '실제 제품 자료 수령 전 Demo 항목', '{진정,수분}', '중간', 3, true, true)
    returning id into p2;

  insert into inventory(organization_id, product_id, current_stock, safety_stock) values (org, p1, 800, 300), (org, p2, 1200, 300);

  insert into sales_records(organization_id, product_id, channel_id, sale_date, units, revenue, source)
  select org, p, c, (current_date - (w * 7)), u, u * price, 'seed'
  from (values (p1, ch_direct, 52000), (p2, ch_online, 38000)) as t(p, c, price),
       generate_series(0, 7) as w,
       lateral (select 60 + (7 - w) * 5 as u) s;
end $$;
