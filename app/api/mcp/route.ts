import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';
import {
  getStore,
  listBrands,
  shopifyGet,
  shopifyPost,
  shopifyPut,
  shopifyDelete,
  shopifyGraphQL,
} from '@/lib/shopify';

// ── Auth check ────────────────────────────────────────────────────────────────
const MCP_SECRET = process.env.MCP_SECRET;

// ── Shared param schemas ──────────────────────────────────────────────────────
const brandParams = {
  brand_id: z
    .string()
    .describe('Brand identifier — e.g. NeuroneSCF, DiamondDetails, VizosCosmetics'),
  store_type: z
    .enum(['b2c', 'b2b'])
    .describe('Store type: b2c (consumer storefront) or b2b (wholesale)'),
};

// ── Handler ───────────────────────────────────────────────────────────────────
const handler = createMcpHandler(
  async (server) => {

    // ── 1. list_brands ─────────────────────────────────────────────────────
    server.tool(
      'list_brands',
      'List all Shopify stores connected to Unrealville Studio. Returns brand_id, store_type, shop_domain and shop_name for each store. Use this first to know which brand_id values are available.',
      {},
      async () => {
        const brands = await listBrands();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(brands, null, 2),
            },
          ],
        };
      }
    );

    // ── 2. shopify_get ─────────────────────────────────────────────────────
    server.tool(
      'shopify_get',
      `Shopify REST API — GET any endpoint.
Examples:
  products.json?limit=10&fields=id,title,status
  products/10777103466823.json
  collections.json
  collections/672207995207/products.json
  pages.json?limit=50&fields=id,title,handle,published_at
  themes.json
  themes/THEME_ID/assets.json?asset[key]=layout/theme.liquid
  menus.json
  smart_collections.json
  custom_collections.json
  orders.json?limit=5&status=any
  inventory_levels.json?location_ids=LOCATION_ID`,
      {
        ...brandParams,
        path: z
          .string()
          .describe('Shopify Admin REST path (without /admin/api/VERSION/). E.g. products.json?limit=10'),
      },
      async ({ brand_id, store_type, path }) => {
        const store = await getStore(brand_id, store_type);
        const data = await shopifyGet(store, path);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );

    // ── 3. shopify_post ────────────────────────────────────────────────────
    server.tool(
      'shopify_post',
      `Shopify REST API — POST (create resources).
Examples:
  products.json  →  { product: { title, body_html, ... } }
  collections/ID/products.json  →  { product: { id } }
  custom_collections.json  →  { custom_collection: { title, ... } }`,
      {
        ...brandParams,
        path: z.string().describe('REST path, e.g. products.json'),
        body: z.record(z.unknown()).describe('Request body as JSON object'),
      },
      async ({ brand_id, store_type, path, body }) => {
        const store = await getStore(brand_id, store_type);
        const data = await shopifyPost(store, path, body);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );

    // ── 4. shopify_put ─────────────────────────────────────────────────────
    server.tool(
      'shopify_put',
      `Shopify REST API — PUT (update resources).
Examples:
  products/10777103466823.json  →  { product: { id, title, ... } }
  themes/THEME_ID/assets.json  →  { asset: { key: "layout/theme.liquid", value: "..." } }
  variants/VARIANT_ID.json  →  { variant: { price: "29.99" } }`,
      {
        ...brandParams,
        path: z.string().describe('REST path including resource ID, e.g. products/12345.json'),
        body: z.record(z.unknown()).describe('Request body as JSON object'),
      },
      async ({ brand_id, store_type, path, body }) => {
        const store = await getStore(brand_id, store_type);
        const data = await shopifyPut(store, path, body);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );

    // ── 5. shopify_delete ──────────────────────────────────────────────────
    server.tool(
      'shopify_delete',
      `Shopify REST API — DELETE a resource.
Examples:
  products/12345.json
  pages/67890.json`,
      {
        ...brandParams,
        path: z.string().describe('REST path of the resource to delete'),
      },
      async ({ brand_id, store_type, path }) => {
        const store = await getStore(brand_id, store_type);
        const data = await shopifyDelete(store, path);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );

    // ── 6. shopify_graphql ─────────────────────────────────────────────────
    server.tool(
      'shopify_graphql',
      `Shopify Admin GraphQL API — run any query or mutation.
Use for: SEO fields, metafields, translations (translationsRegister), product media, bulk operations.
IMPORTANT: Always pass translatableContentDigest when calling translationsRegister — without it Shopify accepts the write but does NOT persist it.
Model string: claude-sonnet-4-20250514`,
      {
        ...brandParams,
        query: z
          .string()
          .describe('GraphQL query or mutation string'),
        variables: z
          .record(z.unknown())
          .optional()
          .describe('GraphQL variables as JSON object (optional)'),
      },
      async ({ brand_id, store_type, query, variables }) => {
        const store = await getStore(brand_id, store_type);
        const data = await shopifyGraphQL(store, query, variables);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
    );

    // ── 7. shopify_get_store_info ──────────────────────────────────────────
    server.tool(
      'shopify_get_store_info',
      'Get connection details and brand context for a specific store. Useful to confirm which shop_domain and scopes are active before running operations.',
      {
        ...brandParams,
      },
      async ({ brand_id, store_type }) => {
        const store = await getStore(brand_id, store_type);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  brand_id: store.brand_id,
                  store_type: store.store_type,
                  shop_domain: store.shop_domain,
                  shop_name: store.shop_name,
                  brand_context: store.brand_context,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  },
  {
    // MCP server metadata
    capabilities: {
      tools: {},
    },
  },
  {
    // Vercel adapter options
    // Redis URL optional — enables stateful SSE sessions
    redisUrl: process.env.REDIS_URL,
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: false,
  }
);

export { handler as GET, handler as POST };
