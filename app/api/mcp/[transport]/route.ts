import { NextRequest, NextResponse } from 'next/server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  getStore,
  listBrands,
  shopifyGet,
  shopifyPost,
  shopifyPut,
  shopifyDelete,
  shopifyGraphQL,
} from '@/lib/shopify';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

const TOOLS = [
  {
    name: 'list_brands',
    description: 'List all Shopify stores connected to Unrealville Studio.',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'shopify_get_store_info',
    description: 'Get connection details for a specific store.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
      },
      required: ['brand_id', 'store_type'],
    },
  },
  {
    name: 'shopify_get',
    description: `Shopify REST GET. Examples: products.json?limit=10, products/ID.json, collections.json, pages.json, themes.json, orders.json`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        brand_id: { type: 'string' },
        store_type: { type: 'string', enum: ['b2c', 'b2b'] },
        path: { type: 'string' },
      },
      required: ['brand_id', 'store_type', 'path'],
    },
  },
  {
    name: 'shopify_post',
    description: 'Shopify REST POST — create resources.',
    inputSchema: {
      type: 'object' as const,
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
    description: 'Shopify REST PUT — update resources.',
    inputSchema: {
      type: 'object' as const,
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
    description: 'Shopify REST DELETE.',
    inputSchema: {
      type: 'object' as const,
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
    description: 'Shopify GraphQL — queries and mutations. IMPORTANT: pass translatableContentDigest in translationsRegister.',
    inputSchema: {
      type: 'object' as const,
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

function buildServer(): Server {
  const server = new Server(
    { name: 'unrlvl-shopify-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const a = (args ?? {}) as Record<string, unknown>;
    try {
      let result: unknown;
      switch (name) {
        case 'list_brands':
          result = await listBrands(); break;
        case 'shopify_get_store_info': {
          const s = await getStore(a.brand_id as string, a.store_type as 'b2c'|'b2b');
          result = { brand_id: s.brand_id, store_type: s.store_type, shop_domain: s.shop_domain, shop_name: s.shop_name, brand_context: s.brand_context };
          break;
        }
        case 'shopify_get': {
          const s = await getStore(a.brand_id as string, a.store_type as 'b2c'|'b2b');
          result = await shopifyGet(s, a.path as string); break;
        }
        case 'shopify_post': {
          const s = await getStore(a.brand_id as string, a.store_type as 'b2c'|'b2b');
          result = await shopifyPost(s, a.path as string, a.body); break;
        }
        case 'shopify_put': {
          const s = await getStore(a.brand_id as string, a.store_type as 'b2c'|'b2b');
          result = await shopifyPut(s, a.path as string, a.body); break;
        }
        case 'shopify_delete': {
          const s = await getStore(a.brand_id as string, a.store_type as 'b2c'|'b2b');
          result = await shopifyDelete(s, a.path as string); break;
        }
        case 'shopify_graphql': {
          const s = await getStore(a.brand_id as string, a.store_type as 'b2c'|'b2b');
          result = await shopifyGraphQL(s, a.query as string, a.variables as Record<string,unknown>|undefined); break;
        }
        default: throw new Error(`Unknown tool: ${name}`);
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  });

  return server;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  return NextResponse.json(
    { status: 'ok', server: 'unrlvl-shopify-mcp', version: '1.0.0' },
    { headers: CORS }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    const server = buildServer();
    await server.connect(transport);
    const response = await transport.handleRequest(body, Object.fromEntries(req.headers));
    return NextResponse.json(response ?? {}, { headers: CORS });
  } catch (err) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: (err as Error).message }, id: null },
      { status: 500, headers: CORS }
    );
  }
}

export async function DELETE() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
