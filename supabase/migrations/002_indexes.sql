-- 002 Indexes
create index if not exists idx_members_user on public.organization_members(user_id);
create index if not exists idx_products_org on public.products(organization_id);
create index if not exists idx_products_published on public.products(organization_id) where is_published;
create index if not exists idx_inventory_org on public.inventory(organization_id);
create index if not exists idx_production_org on public.production_plans(organization_id, product_id);
create index if not exists idx_channels_org on public.channels(organization_id);
create index if not exists idx_sales_org_date on public.sales_records(organization_id, sale_date desc);
create index if not exists idx_sales_product on public.sales_records(product_id, sale_date);
create index if not exists idx_events_org_time on public.customer_events(organization_id, created_at desc);
create index if not exists idx_events_product on public.customer_events(product_id, event_type, created_at);
create index if not exists idx_events_session on public.customer_events(session_id);
create index if not exists idx_actions_org_status on public.growth_actions(organization_id, status);
-- 같은 규칙의 "열린" Action은 하나만 (DONE/DISMISSED 이후 재발생 허용)
create unique index if not exists uq_actions_open_rule on public.growth_actions(organization_id, rule_key)
  where status not in ('DONE','DISMISSED');
create index if not exists idx_action_events_action on public.action_events(growth_action_id, created_at);
create index if not exists idx_proof_org_time on public.proof_events(organization_id, created_at desc);
