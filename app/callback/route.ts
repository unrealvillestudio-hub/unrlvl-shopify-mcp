import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { sb } from '@/lib/shopify';

const CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const shop  = searchParams.get('shop');
  const code  = searchParams.get('code');
  const hmac  = searchParams.get('hmac');

  if (!shop || !code || !hmac) {
    return NextResponse.json({ error: 'Missing required params (shop, code, hmac)' }, { status: 400 });
  }

  // ── Verify HMAC ────────────────────────────────────────────────────────────
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => { if (k !== 'hmac') params[k] = v; });
  const message  = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const computed = createHmac('sha256', CLIENT_SECRET).update(message).digest('hex');

  if (computed !== hmac) {
    return NextResponse.json({ error: 'HMAC validation failed' }, { status: 401 });
  }

  // ── Exchange code for access token ─────────────────────────────────────────
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ error: `Token exchange failed: ${err}` }, { status: 500 });
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // ── Upsert token into Supabase ─────────────────────────────────────────────
  // Update existing record by shop_domain (brand_id + store_type already set)
  const { error } = await sb
    .from('shopify_stores')
    .update({ access_token })
    .eq('shop_domain', shop);

  if (error) {
    return NextResponse.json({ error: `Supabase update failed: ${error.message}` }, { status: 500 });
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    shop,
    message: '✅ Token saved to Supabase. MCP is now operational for this store.',
  });
}
