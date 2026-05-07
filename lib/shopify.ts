import { createClient } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────────────────────────
const supabaseUrl  = process.env.SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const sb = createClient(supabaseUrl, supabaseKey);

// ── Shopify credentials ───────────────────────────────────────────────────────
export interface ShopifyStore {
  shop_domain: string;
  access_token: string;
  store_id: string;
  brand_id: string;
  store_type: string;
  shop_name?: string;
  brand_context?: Record<string, unknown>;
}

export async function getStore(
  brand_id: string,
  store_type: 'b2c' | 'b2b'
): Promise<ShopifyStore> {
  const { data, error } = await sb.rpc('get_shopify_store_full', {
    p_brand_id: brand_id,
    p_store_type: store_type,
  });

  if (error) throw new Error(`Supabase RPC error: ${error.message}`);
  if (!data || data.length === 0)
    throw new Error(`No store found for brand_id=${brand_id} store_type=${store_type}`);

  return data[0] as ShopifyStore;
}

// ── Shopify REST helpers ──────────────────────────────────────────────────────
const API_VERSION = '2025-01';

function shopifyUrl(shop: string, path: string): string {
  // strip leading slash if present
  const cleanPath = path.replace(/^\//, '');
  return `https://${shop}/admin/api/${API_VERSION}/${cleanPath}`;
}

function headers(tok: string): Record<string, string> {
  return {
    'X-Shopify-Access-Token': tok,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export async function shopifyGet(
  store: ShopifyStore,
  path: string
): Promise<unknown> {
  const res = await fetch(shopifyUrl(store.shop_domain, path), {
    headers: headers(store.access_token),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Shopify GET ${path} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

export async function shopifyPost(
  store: ShopifyStore,
  path: string,
  payload: unknown
): Promise<unknown> {
  const res = await fetch(shopifyUrl(store.shop_domain, path), {
    method: 'POST',
    headers: headers(store.access_token),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Shopify POST ${path} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

export async function shopifyPut(
  store: ShopifyStore,
  path: string,
  payload: unknown
): Promise<unknown> {
  const res = await fetch(shopifyUrl(store.shop_domain, path), {
    method: 'PUT',
    headers: headers(store.access_token),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Shopify PUT ${path} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

export async function shopifyDelete(
  store: ShopifyStore,
  path: string
): Promise<unknown> {
  const res = await fetch(shopifyUrl(store.shop_domain, path), {
    method: 'DELETE',
    headers: headers(store.access_token),
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 200 || res.status === 204) {
    return { deleted: true, path };
  }
  const body = await res.json();
  throw new Error(`Shopify DELETE ${path} → ${res.status}: ${JSON.stringify(body)}`);
}

export async function shopifyGraphQL(
  store: ShopifyStore,
  query: string,
  variables?: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(
    `https://${store.shop_domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: headers(store.access_token),
      body: JSON.stringify({ query, variables: variables ?? {} }),
      signal: AbortSignal.timeout(25000),
    }
  );
  const body = await res.json() as { errors?: unknown; data?: unknown };
  if (!res.ok) throw new Error(`Shopify GraphQL → ${res.status}: ${JSON.stringify(body)}`);
  if (body.errors) throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
  return body.data;
}

// ── List all brands ───────────────────────────────────────────────────────────
export async function listBrands(): Promise<
  { brand_id: string; store_type: string; shop_domain: string; shop_name: string }[]
> {
  const { data, error } = await sb
    .from('shopify_stores')
    .select('brand_id, store_type, shop_domain, shop_name')
    .order('brand_id');

  if (error) throw new Error(`listBrands error: ${error.message}`);
  return data ?? [];
}
