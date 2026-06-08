# CLAUDE.md — unrlvl-shopify-mcp
_Contexto persistente para Claude Code. No editar manualmente._

---

## ⚠️ GOBERNANZA CC — NIVEL ESTÁNDAR + SEGURIDAD MCP (leer ANTES de tocar nada)

Antes de cualquier acción en este repositorio, Claude Code DEBE cargar y obedecer el protocolo central:
**`https://unrlvl-context.vercel.app/protocols/CC_PROTOCOL.md`** (cargar con `Vercel:web_fetch_vercel_url` o `curl`).

**Este repo es un MCP server — maneja credenciales y tokens de terceros. Reglas:**

1. **NUNCA commitear secretos.** Tokens (`shpat_`, system tokens de Meta, access tokens de Supabase, service_role keys), API keys o credenciales NUNCA van al repo. Viven SOLO en env vars de Vercel y en tablas de Supabase. Si hay que referenciarlos, usar `[token en Supabase/env — no exponer]`.

2. **CONTEXT FILES NUNCA SE REEMPLAZAN.** Se actualizan preservando historia: lo nuevo al tope, lo anterior archivado debajo, nunca borrado. Antes de commitear: verificar que el diff no BORRA historia.

3. **PUSH:** `unrlvl-context` → nunca push directo, nunca por CC (solo Sam vía GitHub Desktop). Este repo → branch + PR, nunca merge propio. CC nunca mergea por su cuenta. CC limpia sus worktrees al cerrar un PR.

4. **VERIFICAR ANTES DE ACTUAR:** mensaje corto a Sam con objetivo, pasos, archivos y repos afectados antes de cualquier escritura/commit/deploy. Reportar al final con el formato de CC_PROTOCOL (incluida PRESERVACIÓN DE CONTEXTO). Cambios en el manejo de credenciales o scopes requieren verificación explícita.

Ante cualquier duda → preguntar a Sam, no asumir.

---

## Qué es este repo
`unrlvl-shopify-mcp` es el MCP server multimarca de Shopify del ecosistema UNRLVL. Expone las Shopify Admin APIs de todas las tiendas conectadas a través de un único endpoint MCP, resolviendo credenciales por marca desde Supabase.

**Endpoint MCP:** `https://unrlvl-shopify-mcp.vercel.app/api/mcp/mcp`  
**Framework:** Next.js (App Router) en Vercel  
**Protocolo:** MCP 2024-11-05 (JSON-RPC)  
**Shopify API version:** `2025-01`

---

## Tools (7) — extraídos de `app/api/mcp/[transport]/route.ts`
| Tool | Args requeridos | Qué hace |
|---|---|---|
| `list_brands` | — | Lista tiendas activas (brand_id, store_type, shop_domain, shop_name) |
| `shopify_get_store_info` | brand_id, store_type | Info de conexión + `brand_context` de una tienda |
| `shopify_get` | brand_id, store_type, path | REST GET |
| `shopify_post` | brand_id, store_type, path, body | REST POST (crear) |
| `shopify_put` | brand_id, store_type, path, body | REST PUT (actualizar) |
| `shopify_delete` | brand_id, store_type, path | REST DELETE |
| `shopify_graphql` | brand_id, store_type, query | GraphQL (SEO, metafields, translations) |

`store_type` es enum `'b2c' | 'b2b'`. Para translations vía GraphQL, siempre pasar `translatableContentDigest`.

---

## Arquitectura (del código, no del README)
```
Claude → MCP (JSON-RPC) → /api/mcp/mcp (route.ts)
  → callTool() → getStore(brand_id, store_type)  [lib/shopify.ts]
  → Supabase: SELECT de tabla `shopify_stores` WHERE brand_id + store_type + active=true
  → fetch a https://{shop_domain}/admin/api/2025-01/{path} con header X-Shopify-Access-Token
```

- **Credenciales:** tabla `shopify_stores` (NO una VIEW) en Supabase `amlvyycfepwhiindxgzw`. Columnas leídas: `brand_id, store_type, shop_domain, shop_name, access_token, brand_context, active`.
- **OAuth:** además del pass-through, hay flujo OAuth en `app/auth/route.ts` (inicio) + `app/callback/route.ts` (intercambio de código → token).
- **Timeouts:** REST 20s, GraphQL 25s (`AbortSignal.timeout`).
- `store_id` se devuelve vacío (`''`) en `getStore` — no se usa actualmente.

---

## Variables de entorno (Vercel)
```
SUPABASE_URL                 ← https://amlvyycfepwhiindxgzw.supabase.co
SUPABASE_SERVICE_ROLE_KEY    ← service_role (lee shopify_stores con RLS bypass)
```

---

## Multimarca
Cada tool acepta `brand_id` + `store_type`; el servidor resuelve credenciales desde Supabase automáticamente. **Añadir una marca = INSERT en `shopify_stores`** — sin cambios de código.

---

## Estructura del repo
```
app/
  api/mcp/[transport]/route.ts  ← handler MCP (JSON-RPC, 7 tools)
  auth/route.ts                 ← inicio OAuth Shopify
  callback/route.ts             ← callback OAuth (código → token)
  layout.tsx, page.tsx          ← UI mínima
lib/
  shopify.ts                    ← getStore, listBrands, REST/GraphQL helpers
```

---

## Reglas de trabajo (del código)
1. **Solo tokens `shpat_` (OAuth) funcionan** — históricamente los `atkn_` no. La tabla `shopify_stores` debe tener el token correcto.
2. Las credenciales viven en Supabase, NUNCA en el repo. `SUPABASE_SERVICE_ROLE_KEY` solo en env var de Vercel.
3. Al añadir marca/tienda: INSERT en `shopify_stores` con `active=true`, no tocar código.
4. API version `2025-01` — si se actualiza, cambiar `API_VERSION` en `lib/shopify.ts`.

---

## Conexión con el ecosistema
- **Consumido por:** Claude.ai (MCP connector "Shopify — Unrealville Studio").
- **Lee de:** Supabase `shopify_stores`.
- **Llama a:** Shopify Admin API de cada marca (hoy: NeuroneSCF b2c, entre otras).
