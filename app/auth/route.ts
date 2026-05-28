import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID    = process.env.SHOPIFY_CLIENT_ID!;
const REDIRECT_URI = `${process.env.APP_URL}/callback`;
const SCOPES       = [
  'read_products','write_products',
  'read_orders','write_orders',
  'read_customers','write_customers',
  'read_inventory','write_inventory',
  'read_locations','write_locations',
  'read_shipping','write_shipping',
  'read_fulfillments','write_fulfillments',
  'read_draft_orders','write_draft_orders',
  'read_discounts','write_discounts',
  'read_themes','write_themes',
  'read_content','write_content',
  'read_metaobjects','write_metaobjects',
].join(',');

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop');
  if (!shop) {
    return NextResponse.json({ error: 'shop param required. Use: /auth?shop=your-store.myshopify.com' }, { status: 400 });
  }

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);

  return NextResponse.redirect(authUrl.toString());
}
