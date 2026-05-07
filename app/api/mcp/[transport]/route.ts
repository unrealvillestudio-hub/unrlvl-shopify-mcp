import { NextRequest, NextResponse } from 'next/server';
import {
  getStore, listBrands,
  shopifyGet, shopifyPost, shopifyPut, shopifyDelete, shopifyGraphQL,
} from '@/lib/shopify';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'list_brands',
    description: 'List all Shopify stores connected to Unrealville Studio. Returns brand_id, store_type, shop_domain, shop_name.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'shopify_get_store_info',
    description: 'Get connection details and brand_context for a specific store.',
    inputSchema: {
      type: 'object',
      properties: {
        brand_id: { type: 'string', description: 'e.g. NeuroneSCF, DiamondDetails' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
      },
      required: ['brand_id', 'store_type'],
    },
  },
  {
    name: 'shopify_get',
    description: 'Shopify REST GET. path examples: products.json?limit=10 | products/ID.json | collections.json | pages.json | themes.json | orders.json?limit=5&status=any',
    inputSchema: {
      type: 'object',
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
        path: { type: 'string', description: 'REST path without /admin/api/VERSION/' },
      },
      required: ['brand_id', 'store_type', 'path'],
    },
  },
  {
    name: 'shopify_post',
    description: 'Shopify REST POST — create resources. path e.g. products.json',
    inputSchema: {
      type: 'object',
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
        path: { type: 'string' },
        body: { type: 'object' },
      },
      required: ['brand_id', 'store_type', 'path', 'body'],
    },
  },
  {
    name: 'shopify_put',
    description: 'Shopify REST PUT — update resources. path e.g. products/12345.json',
    inputSchema: {
      type: 'object',
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
        path: { type: 'string' },
        body: { type: 'object' },
      },
      required: ['brand_id', 'store_type', 'path', 'body'],
    },
  },
  {
    name: 'shopify_delete',
    description: 'Shopify REST DELETE. path e.g. products/12345.json',
    inputSchema: {
      type: 'object',
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
        path: { type: 'string' },
      },
      required: ['brand_id', 'store_type', 'path'],
    },
  },
  {
    name: 'shopify_graphql',
    description: 'Shopify GraphQL — queries & mutations. For translations: always pass translatableContentDigest.',
    inputSchema: {
      type: 'object',
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
        query: { type: 'string' },
        variables: { type: 'object' },
      },
      required: ['brand_id', 'store_type', 'query'],
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const bid = args.brand_id as string;
  const stype = args.store_type as 'b2c' | 'b2b';

  switch (name) {
    case 'list_brands':
      return await listBrands();

    case 'shopify_get_store_info': {
      const s = await getStore(bid, stype);
      return { brand_id: s.brand_id, store_type: s.store_type, shop_domain: s.shop_domain, shop_name: s.shop_name, brand_context: s.brand_context };
    }

    case 'shopify_get': {
      const s = await getStore(bid, stype);
      return await shopifyGet(s, args.path as string);
    }

    case 'shopify_post': {
      const s = await getStore(bid, stype);
      return await shopifyPost(s, args.path as string, args.body);
    }

    case 'shopify_put': {
      const s = await getStore(bid, stype);
      return await shopifyPut(s, args.path as string, args.body);
    }

    case 'shopify_delete': {
      const s = await getStore(bid, stype);
      return await shopifyDelete(s, args.path as string);
    }

    case 'shopify_graphql': {
      const s = await getStore(bid, stype);
      return await shopifyGraphQL(s, args.query as string, args.variables as Record<string, unknown> | undefined);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── JSON-RPC handler ──────────────────────────────────────────────────────────
async function handleRpc(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const id = body.id ?? null;
  const method = body.method as string;
  const params = (body.params ?? {}) as Record<string, unknown>;

  try {
    // initialize
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'unrlvl-shopify-mcp', version: '1.0.0' },
        },
      };
    }

    // tools/list
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    }

    // tools/call
    if (method === 'tools/call') {
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await callTool(name, args);
        return {
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        };
      } catch (err) {
        return {
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
            isError: true,
          },
        };
      }
    }

    // notifications — no response needed but return empty ok
    if (method.startsWith('notifications/')) {
      return { jsonrpc: '2.0', id, result: {} };
    }

    // ping
    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    return {
      jsonrpc: '2.0', id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  } catch (err) {
    return {
      jsonrpc: '2.0', id,
      error: { code: -32603, message: (err as Error).message },
    };
  }
}

// ── Route exports ─────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  return NextResponse.json(
    { status: 'ok', server: 'unrlvl-shopify-mcp', version: '1.0.0', protocol: 'mcp-2024-11-05' },
    { headers: CORS }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const response = await handleRpc(body);
    return NextResponse.json(response, { headers: CORS });
  } catch (err) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: `Parse error: ${(err as Error).message}` }, id: null },
      { status: 400, headers: CORS }
    );
  }
}

export async function DELETE() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
