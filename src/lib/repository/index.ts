import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { demoProducts } from "../demo/products";
import { demoSales } from "../demo/sales";
import { demoInventory, demoProduction } from "../demo/inventory";
import { demoB2B, demoChannels, demoExports } from "../demo/channels";
import { demoCustomerEvents, demoCustomers } from "../demo/customers";
import type {
  B2BAccount,
  Channel,
  CustomerEvent,
  CustomerProfile,
  ExportRecord,
  Inventory,
  Product,
  ProductionPlan,
  SalesRecord,
} from "../types";

/* ==========================================================================
   Data Repository Layer
   UI → repository → Supabase 또는 Demo Seed Data
   Supabase 환경변수가 없거나 테이블 조회가 실패하면 Demo Data로 fallback한다.
   ========================================================================== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(supabaseUrl!, supabaseKey!);
  return client;
}

export type DataSource = "demo" | "supabase";

async function fetchTable<T>(table: string, fallback: T[]): Promise<{ data: T[]; source: DataSource }> {
  const sb = getClient();
  if (!sb) return { data: fallback, source: "demo" };
  try {
    const { data, error } = await sb.from(table).select("*");
    if (error || !data || data.length === 0) return { data: fallback, source: "demo" };
    return { data: data as T[], source: "supabase" };
  } catch {
    return { data: fallback, source: "demo" };
  }
}

export const repository = {
  getProducts: () => fetchTable<Product>("products", demoProducts),
  getSales: () => fetchTable<SalesRecord>("sales_records", demoSales),
  getInventory: () => fetchTable<Inventory>("inventory", demoInventory),
  getProduction: () => fetchTable<ProductionPlan>("production_plans", demoProduction),
  getChannels: () => fetchTable<Channel>("channels", demoChannels),
  getB2BAccounts: () => fetchTable<B2BAccount>("b2b_accounts", demoB2B),
  getExports: () => fetchTable<ExportRecord>("export_records", demoExports),
  getCustomers: () => fetchTable<CustomerProfile>("customer_profiles", demoCustomers),
  getCustomerEvents: () => fetchTable<CustomerEvent>("customer_events", demoCustomerEvents),
};

/* 클라이언트 컴포넌트에서 동기적으로 쓰는 Demo 접근자.
   Supabase 연동 시 위 async repository로 교체 지점이 명확하도록 분리해 둔다. */
export const demoRepository = {
  products: demoProducts,
  sales: demoSales,
  inventory: demoInventory,
  production: demoProduction,
  channels: demoChannels,
  b2bAccounts: demoB2B,
  exports: demoExports,
  customers: demoCustomers,
  customerEvents: demoCustomerEvents,
};
