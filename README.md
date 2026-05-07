# UNRLVL Shopify MCP Server

MCP server multimarca para Unrealville Studio. Expone las Shopify Admin APIs de todas las marcas conectadas a través de un único endpoint MCP.

## Tools disponibles

| Tool | Descripción |
|---|---|
| `list_brands` | Lista todas las tiendas conectadas |
| `shopify_get_store_info` | Info de conexión + brand_context de una tienda |
| `shopify_get` | REST GET — lee cualquier endpoint |
| `shopify_post` | REST POST — crea recursos |
| `shopify_put` | REST PUT — actualiza recursos |
| `shopify_delete` | REST DELETE — elimina recursos |
| `shopify_graphql` | GraphQL — queries y mutations (SEO, metafields, translations) |

## Deploy

### 1. Crear proyecto en Vercel

```bash
vercel --name unrlvl-shopify-mcp
```

O conectar el repo desde vercel.com → New Project.

### 2. Variables de entorno en Vercel Dashboard

```
SUPABASE_URL         = https://amlvyycfepwhiindxgzw.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [copiar de unrlvl-tools — mismo proyecto]
```

### 3. Deploy

```bash
vercel --prod
```

URL resultante: `https://unrlvl-shopify-mcp.vercel.app`

### 4. Conectar en Claude.ai

1. Claude.ai → Settings → Connectors → Add MCP Server
2. URL: `https://unrlvl-shopify-mcp.vercel.app/api/mcp`
3. Nombre: `Shopify — Unrealville Studio`
4. Guardar

Claude verá los 7 tools disponibles automáticamente.

## Uso desde Claude

```
# Listar marcas disponibles
list_brands()

# Leer un producto
shopify_get(brand_id="NeuroneSCF", store_type="b2c", path="products/10777103466823.json")

# Leer colecciones
shopify_get(brand_id="NeuroneSCF", store_type="b2c", path="collections.json")

# GraphQL — SEO de productos
shopify_graphql(
  brand_id="NeuroneSCF",
  store_type="b2c",
  query="{ products(first:5) { edges { node { id title seo { title description } } } } }"
)

# Actualizar producto
shopify_put(
  brand_id="NeuroneSCF",
  store_type="b2c",
  path="products/10777103466823.json",
  body={ "product": { "id": 10777103466823, "title": "Nuevo título" } }
)
```

## Arquitectura

```
Claude (claude.ai) 
  → MCP protocol (SSE)
  → unrlvl-shopify-mcp.vercel.app/api/mcp
  → Supabase RPC get_shopify_store_full (credenciales)
  → Shopify Admin API 2025-01
```

## Multi-marca

Cada tool acepta `brand_id` y `store_type`. El servidor resuelve las credenciales desde Supabase automáticamente. Para añadir una nueva marca: registrar la tienda en la tabla `shopify_stores` de Supabase — sin cambios en el código.

## Notas técnicas

- Timeout: 60s (Vercel maxDuration)
- API version: 2025-01
- Redis opcional (Upstash) para sesiones SSE stateful
- Sin Redis: funciona en modo stateless (suficiente para uso normal)
