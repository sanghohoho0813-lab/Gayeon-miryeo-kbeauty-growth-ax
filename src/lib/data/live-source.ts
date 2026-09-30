"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataSnapshot, DataSource } from "./source";
import type {
  B2BAccount, Channel, CustomerEvent, CustomerProfile, ExportRecord, GrowthAction, ActionEvent,
  Inventory, KpiBaseline, Product, ProductionPlan, ProofEvent, SalesRecord, TechAsset,
} from "../types";

/* LIVE 저장소 — Supabase만 사용. 오류는 그대로 throw → 화면에서 Error State.
   비어 있으면 빈 배열 → 화면에서 Empty State. Demo 숫자로 fallback 하지 않는다. */

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

const toProduct = (r: Row): Product => ({
  id: r.id, sku: r.sku, name: r.name, nameEn: r.name_en ?? undefined, category: r.category, line: r.line ?? undefined,
  price: Number(r.price), cost: r.cost == null ? undefined : Number(r.cost), status: r.status, description: r.description ?? undefined,
  concerns: r.concerns ?? [], texture: r.texture ?? undefined, routineStep: r.routine_step ?? undefined, isNew: r.is_new, isBest: r.is_best,
  isPublished: r.is_published, purchaseLinks: r.purchase_links ?? [], mainChannelIds: r.main_channel_ids ?? [], featuredUntil: r.featured_until, isDemo: r.is_demo,
});
const fromProduct = (p: Product, org: string): Row => ({
  id: p.id, organization_id: org, sku: p.sku, name: p.name, name_en: p.nameEn ?? null, category: p.category, line: p.line ?? null,
  price: p.price, cost: p.cost ?? null, status: p.status, description: p.description ?? null, concerns: p.concerns, texture: p.texture ?? null,
  routine_step: p.routineStep ?? null, is_new: !!p.isNew, is_best: !!p.isBest, is_published: p.isPublished, purchase_links: p.purchaseLinks,
  main_channel_ids: p.mainChannelIds, featured_until: p.featuredUntil ?? null, is_demo: !!p.isDemo,
});
const toInventory = (r: Row): Inventory => ({ productId: r.product_id, currentStock: r.current_stock, safetyStock: r.safety_stock, incomingStock: r.incoming_stock, incomingDate: r.incoming_date, updatedAt: r.updated_at });
const toProduction = (r: Row): ProductionPlan => ({ id: r.id, productId: r.product_id, partner: r.partner, lastProducedAt: r.last_produced_at, quantity: r.quantity, expectedArrival: r.expected_arrival, status: r.status, nextRecommendedAt: r.next_recommended_at });
const toChannel = (r: Row): Channel => ({ id: r.id, name: r.name, type: r.type, avgDiscountRate: Number(r.avg_discount_rate), active: r.active });
const toSale = (r: Row): SalesRecord => ({ id: r.id, productId: r.product_id, channelId: r.channel_id, saleDate: r.sale_date, units: r.units, revenue: Number(r.revenue), source: r.source });
const toB2B = (r: Row): B2BAccount => ({ id: r.id, name: r.name, status: r.status, lastOrderAt: r.last_order_at, totalRevenue: Number(r.total_revenue), mainProductIds: r.main_product_ids ?? [], nextDelivery: r.next_delivery, note: r.note ?? undefined });
const toExport = (r: Row): ExportRecord => ({ id: r.id, region: r.region, channel: r.channel ?? undefined, totalRevenue: Number(r.total_revenue), mainProductIds: r.main_product_ids ?? [], lastOrderAt: r.last_order_at, growthRate: r.growth_rate == null ? null : Number(r.growth_rate) });
const toCustomer = (r: Row): CustomerProfile => ({ id: r.id, displayName: r.display_name ?? "고객", joinedAt: r.joined_at, lastOrderAt: r.last_order_at, orderCount: r.order_count, favoriteProductIds: r.favorite_product_ids ?? [], concerns: r.concerns ?? [] });
const toEvent = (r: Row): CustomerEvent => ({ id: r.id, sessionId: r.session_id, eventType: r.event_type, productId: r.product_id, payload: r.payload ?? {}, createdAt: r.created_at, origin: "live" });
const toAction = (r: Row): GrowthAction => ({
  id: r.id, ruleKey: r.rule_key, category: r.category, priority: r.priority, title: r.title, judgement: r.judgement, evidence: r.evidence ?? [],
  impact: r.impact ?? [], recommendation: r.recommendation, decisionMethod: r.decision_method, linkedProductId: r.linked_product_id ?? undefined,
  href: r.href ?? "/ax/growth", proofType: r.proof_type, snapshot: r.snapshot ?? [], status: r.status, assigneeName: r.assignee_name,
  approvedBy: r.approved_by, approvedAt: r.approved_at, executionNote: r.execution_note, resultNote: r.result_note, dismissReason: r.dismiss_reason,
  customerEffect: r.customer_effect, kpiBefore: r.kpi_before, kpiAfter: r.kpi_after, createdAt: r.created_at, updatedAt: r.updated_at,
});
const toActionEvent = (r: Row): ActionEvent => ({ id: r.id, growthActionId: r.growth_action_id, fromStatus: r.from_status, toStatus: r.to_status, note: r.note, actorName: r.actor_name ?? "-", createdAt: r.created_at });
const toProof = (r: Row): ProofEvent => ({
  id: r.id, growthActionId: r.growth_action_id, eventType: r.event_type, trigger: r.trigger, decision: r.decision, decisionMethod: r.decision_method,
  why: r.why ?? "", humanApproval: r.human_approval ?? "", action: r.action ?? "", result: r.result ?? "", kpiBefore: r.kpi_before ?? [], kpiAfter: r.kpi_after ?? [],
  dataSource: r.data_source, actorName: r.actor_name ?? "-", createdAt: r.created_at, resultConfirmedAt: r.result_confirmed_at, evidenceLink: r.evidence_link, status: r.status,
});
const toTech = (r: Row): TechAsset => ({ id: r.id, kind: r.kind, title: r.title ?? undefined, status: r.status, referenceNo: r.reference_no ?? undefined, note: r.note ?? undefined, updatedAt: r.updated_at });

const toBaseline = (r: Row): KpiBaseline => ({
  id: r.id, kpiKey: r.kpi_key, value: Number(r.value), unit: r.unit, periodFrom: r.period_from, periodTo: r.period_to, method: r.method,
  source: r.source, note: r.note, lockedBy: r.locked_by ?? "-", lockedAt: r.locked_at, supersededAt: r.superseded_at,
});

const TECH_KINDS = ["특허", "벤처기업확인", "연구개발 조직", "기술인증", "실증자료"] as const;

export function createLiveSource(sb: SupabaseClient, orgId: string, userId: string | null): DataSource {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const salesSince = new Date(Date.now() - 70 * 86_400_000).toISOString().slice(0, 10);
  const org = orgId;

  return {
    mode: "live",
    async loadAx(): Promise<DataSnapshot> {
      const [o, products, inventory, production, channels, sales, b2b, exports, customers, events, actions, aevents, proofs, tech, baselines] = await Promise.all([
        sb.from("organizations").select("*").eq("id", org).single(),
        sb.from("products").select("*").eq("organization_id", org).order("created_at"),
        sb.from("inventory").select("*").eq("organization_id", org),
        sb.from("production_plans").select("*").eq("organization_id", org).order("created_at"),
        sb.from("channels").select("*").eq("organization_id", org).order("created_at"),
        sb.from("sales_records").select("*").eq("organization_id", org).gte("sale_date", salesSince),
        sb.from("b2b_accounts").select("*").eq("organization_id", org),
        sb.from("export_records").select("*").eq("organization_id", org),
        sb.from("customer_profiles").select("*").eq("organization_id", org),
        sb.from("customer_events").select("*").eq("organization_id", org).gte("created_at", since).order("created_at"),
        sb.from("growth_actions").select("*").eq("organization_id", org).order("created_at"),
        sb.from("action_events").select("*").eq("organization_id", org).order("created_at"),
        sb.from("proof_events").select("*").eq("organization_id", org).order("created_at"),
        sb.from("tech_assets").select("*").eq("organization_id", org),
        sb.from("kpi_baselines").select("*").eq("organization_id", org).order("locked_at"),
      ]);
      if (baselines.error) throw new Error(`${baselines.error.message} — supabase/migrations/005 적용 여부를 확인하세요`);
      if (o.error) throw new Error(o.error.message);
      const techRows = must<Row[]>(tech).map(toTech);
      const techAssets = TECH_KINDS.map((kind) => techRows.find((t) => t.kind === kind) ?? { id: `new-${kind}`, kind, status: "미확인" as const, updatedAt: new Date().toISOString() });
      return {
        org: { name: o.data.name, pilotStartedOn: o.data.pilot_started_on, axOwnerName: o.data.ax_owner_name ?? null },
        products: must<Row[]>(products).map(toProduct),
        inventory: must<Row[]>(inventory).map(toInventory),
        production: must<Row[]>(production).map(toProduction),
        channels: must<Row[]>(channels).map(toChannel),
        sales: must<Row[]>(sales).map(toSale),
        // B2B/수출/고객은 RLS상 STAFF에게 빈 배열 → 화면에서 권한 안내
        b2b: b2b.error ? [] : must<Row[]>(b2b).map(toB2B),
        exports: exports.error ? [] : must<Row[]>(exports).map(toExport),
        customers: customers.error ? [] : must<Row[]>(customers).map(toCustomer),
        customerEvents: must<Row[]>(events).map(toEvent),
        actions: must<Row[]>(actions).map(toAction),
        actionEvents: must<Row[]>(aevents).map(toActionEvent),
        proofEvents: must<Row[]>(proofs).map(toProof),
        techAssets,
        baselines: must<Row[]>(baselines).map(toBaseline),
        loadedAt: new Date().toISOString(),
      };
    },
    async loadPublicProducts() {
      return must<Row[]>(await sb.from("products").select("*").eq("organization_id", org).eq("is_published", true)).map(toProduct);
    },
    subscribe(cb) {
      const channel = sb
        .channel(`miryeo-${org}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "customer_events", filter: `organization_id=eq.${org}` }, cb)
        .on("postgres_changes", { event: "*", schema: "public", table: "growth_actions", filter: `organization_id=eq.${org}` }, cb)
        .subscribe();
      return () => void sb.removeChannel(channel);
    },
    async upsertProduct(p) {
      const row = fromProduct(p, org);
      if (p.id.startsWith("new-")) delete (row as Row).id;
      must(await sb.from("products").upsert(row).select());
    },
    async upsertInventory(i) {
      must(await sb.from("inventory").upsert({ organization_id: org, product_id: i.productId, current_stock: i.currentStock, safety_stock: i.safetyStock, incoming_stock: i.incomingStock, incoming_date: i.incomingDate ?? null }, { onConflict: "product_id" }).select());
    },
    async upsertChannel(c) {
      const row: Row = { organization_id: org, name: c.name, type: c.type, avg_discount_rate: c.avgDiscountRate, active: c.active };
      if (!c.id.startsWith("new-")) row.id = c.id;
      must(await sb.from("channels").upsert(row).select());
    },
    async upsertProduction(p) {
      const row: Row = { organization_id: org, product_id: p.productId, partner: p.partner, last_produced_at: p.lastProducedAt ?? null, quantity: p.quantity, expected_arrival: p.expectedArrival ?? null, status: p.status, next_recommended_at: p.nextRecommendedAt ?? null };
      if (!p.id.startsWith("new-")) row.id = p.id;
      must(await sb.from("production_plans").upsert(row).select());
    },
    async upsertB2B(b) {
      const row: Row = { organization_id: org, name: b.name, status: b.status, last_order_at: b.lastOrderAt ?? null, total_revenue: b.totalRevenue, main_product_ids: b.mainProductIds, next_delivery: b.nextDelivery ?? null, note: b.note ?? null };
      if (!b.id.startsWith("new-")) row.id = b.id;
      must(await sb.from("b2b_accounts").upsert(row).select());
    },
    async addSales(rows) {
      const payload = rows.map((r) => ({ organization_id: org, product_id: r.productId, channel_id: r.channelId, sale_date: r.saleDate, units: r.units, revenue: r.revenue, source: r.source }));
      must(await sb.from("sales_records").insert(payload).select("id"));
      return rows.length;
    },
    async createActions(cands) {
      for (const c of cands) {
        const res = await sb.from("growth_actions").insert({
          organization_id: org, rule_key: c.ruleKey, category: c.category, priority: c.priority, title: c.title, judgement: c.judgement,
          evidence: c.evidence, impact: c.impact, recommendation: c.recommendation, decision_method: c.decisionMethod, proof_type: c.proofType,
          snapshot: c.snapshot, linked_product_id: c.linkedProductId ?? null, href: c.href, status: "NEW",
        }).select("id").single();
        // 다른 사용자가 먼저 생성한 경우 unique 위반 → 무시
        if (res.error) { if (!res.error.message.includes("duplicate")) throw new Error(res.error.message); continue; }
        await sb.from("action_events").insert({ organization_id: org, growth_action_id: res.data.id, from_status: null, to_status: "NEW", note: "RULE 감지로 생성", actor_name: "시스템 (RULE)" });
      }
    },
    async updateAction(id, patch, t) {
      const map: Row = {};
      if (patch.status) map.status = patch.status;
      if ("assigneeName" in patch) map.assignee_name = patch.assigneeName;
      if ("approvedBy" in patch) map.approved_by = patch.approvedBy;
      if ("approvedAt" in patch) map.approved_at = patch.approvedAt;
      if ("executionNote" in patch) map.execution_note = patch.executionNote;
      if ("resultNote" in patch) map.result_note = patch.resultNote;
      if ("dismissReason" in patch) map.dismiss_reason = patch.dismissReason;
      if ("customerEffect" in patch) map.customer_effect = patch.customerEffect;
      if ("kpiBefore" in patch) map.kpi_before = patch.kpiBefore;
      if ("kpiAfter" in patch) map.kpi_after = patch.kpiAfter;
      must(await sb.from("growth_actions").update(map).eq("id", id).select("id"));
      if (t.from !== t.to || t.note) must(await sb.from("action_events").insert({ organization_id: org, growth_action_id: id, from_status: t.from, to_status: t.to, note: t.note ?? null, user_id: userId, actor_name: t.actorName }).select("id"));
    },
    async createProof(p) {
      must(await sb.from("proof_events").insert({
        organization_id: org, growth_action_id: p.growthActionId ?? null, event_type: p.eventType, trigger: p.trigger, decision: p.decision,
        decision_method: p.decisionMethod, why: p.why, human_approval: p.humanApproval, action: p.action, result: p.result,
        kpi_before: p.kpiBefore, kpi_after: p.kpiAfter, data_source: p.dataSource, user_id: userId, actor_name: p.actorName,
        evidence_link: p.evidenceLink ?? null, status: p.status,
      }).select("id"));
    },
    async updateProof(id, patch) {
      const map: Row = {};
      if (patch.status) map.status = patch.status;
      if ("resultConfirmedAt" in patch) map.result_confirmed_at = patch.resultConfirmedAt;
      if ("evidenceLink" in patch) map.evidence_link = patch.evidenceLink;
      must(await sb.from("proof_events").update(map).eq("id", id).select("id"));
    },
    async setProductFeatured(productId, until) {
      must(await sb.from("products").update({ featured_until: until }).eq("id", productId).select("id"));
    },
    async upsertTechAsset(t) {
      const row: Row = { organization_id: org, kind: t.kind, title: t.title ?? null, status: t.status, reference_no: t.referenceNo ?? null, note: t.note ?? null };
      if (!t.id.startsWith("new-")) row.id = t.id;
      must(await sb.from("tech_assets").upsert(row).select("id"));
    },
    async updateOrg(patch) {
      const map: Row = {};
      if ("name" in patch) map.name = patch.name;
      if ("pilotStartedOn" in patch) map.pilot_started_on = patch.pilotStartedOn;
      if ("axOwnerName" in patch) map.ax_owner_name = patch.axOwnerName;
      must(await sb.from("organizations").update(map).eq("id", org).select("id"));
    },
    async lockBaseline(b) {
      const { error } = await sb.rpc("lock_baseline", {
        org, p_kpi: b.kpiKey, p_value: b.value, p_unit: b.unit, p_from: b.periodFrom ?? null, p_to: b.periodTo ?? null,
        p_method: b.method, p_source: b.source, p_note: b.note ?? null, p_locked_by: b.lockedBy,
      });
      if (error) throw new Error(error.message);
    },
    async trackEvent(e) {
      const { error } = await sb.from("customer_events").insert({ organization_id: org, session_id: e.sessionId, event_type: e.eventType, product_id: e.productId ?? null, payload: e.payload ?? {} });
      if (error) throw new Error(error.message);
    },
    async saveBeautyResult(sessionId, profile, productIds, reasons) {
      const prof = await sb.from("beauty_profiles").insert({ organization_id: org, session_id: sessionId, concerns: profile.concerns, care_goal: profile.careGoal, texture: profile.texture, routine_level: profile.routineLevel, budget: profile.budget }).select("id").single();
      if (prof.error) throw new Error(prof.error.message);
      const { error } = await sb.from("beauty_recommendations").insert({ organization_id: org, session_id: sessionId, beauty_profile_id: prof.data.id, product_ids: productIds, reasons, saved_to_passport: true });
      if (error) throw new Error(error.message);
    },
    async reset() {
      throw new Error("Live 모드에서는 Demo 초기화를 사용할 수 없습니다.");
    },
  };
}
