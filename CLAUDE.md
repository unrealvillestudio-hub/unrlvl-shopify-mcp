# CLAUDE.md — unrlvl-shopify-mcp
_Contexto persistente para Claude Code. No editar manualmente._

---

## ⚠️ GOBERNANZA CC — NIVEL ESTÁNDAR + SEGURIDAD MCP (leer ANTES de tocar nada)

Antes de cualquier acción en este repositorio, Claude Code DEBE cargar y obedecer el protocolo central:
**`https://unrlvl-context.vercel.app/protocols/CC_PROTOCOL.md`** (cargar con la tool `Vercel:web_fetch_vercel_url`; **nunca con `curl`** — ver la nota de abajo).

> **Orden de carga — la fuente canónica es el repo, Vercel es respaldo** (`CC_PROTOCOL.md` §0 bis).
> **(1)** `unrealvillestudio-hub/unrlvl-context` — working tree si está clonado, o `api.github.com` /
> `raw.githubusercontent.com`; **(2)** la URL de Vercel, **sólo si el repo no está disponible**, y
> declarándolo. El estático puede ir por detrás de `main` entre el merge y el deploy (`HRD-R09`, `HRD-R14`).
>
> **Cómo se alcanza esa URL de respaldo [medido 2026-08-29, `CC_PROTOCOL.md` §0 bis.1]:** con la tool
> **`Vercel:web_fetch_vercel_url`**, que devuelve **200**. **Nunca con `curl`**, que devuelve **403 en
> CONNECT** contra `*.vercel.app` — el proxy de egreso de CC lo bloquea. Son dos vías distintas y sólo
> una funciona; declarar Vercel inalcanzable tras probar sólo `curl` es afirmar sin medir.
>
> **Carga obligatoria además de `CC_PROTOCOL.md`:** `protocols/MULTIBRAND_RULE.md` y
> `protocols/DELIVERY_AND_VERIFICATION_RULE.md`. Esta última **se carga en la apertura de sesión**, no
> cuando surja la duda: gobierna **cómo se responde**, y una regla de forma que se consulta al final
> llega tarde porque el texto ya está escrito.

**Este repo es un MCP server — maneja credenciales y tokens de terceros. Reglas:**

1. **NUNCA commitear secretos.** Tokens (`shpat_`, system tokens de Meta, access tokens de Supabase, service_role keys), API keys o credenciales NUNCA van al repo. Viven SOLO en env vars de Vercel y en tablas de Supabase. Si hay que referenciarlos, usar `[token en Supabase/env — no exponer]`.

2. **CONTEXT FILES NUNCA SE REEMPLAZAN.** Se actualizan preservando historia: lo nuevo al tope, lo anterior archivado debajo, nunca borrado. Antes de commitear: verificar que el diff no BORRA historia.

3. **PUSH (redacción vigente — corregida 2026-08-29):**
   - **Este repo y demás repos de código** → **branch + PR**, nunca push directo a `main`, nunca merge propio. CC limpia sus worktrees al cerrar un PR (`CC_PROTOCOL.md` §7.2).
   - **`unrlvl-context`** → CC trabaja **igual: branch + PR**. CC **crea la rama, commitea y PUSHEA esa rama de PR**, y abre el PR contra `main`. Su restricción es **no pushear a `main` y no mergear** — nada más. Sam revisa, mergea y borra la rama **por GitHub Web UI**. CC **nunca crea worktrees** en ese repo (`CC_PROTOCOL.md` §7.1).
   - **CC nunca mergea un PR por su cuenta**, en ningún repo. El merge es decisión de Sam.

   > **⛔ NO OPERATIVO — redacción anterior, derogada.** Se conserva sólo por trazabilidad
   > (`CC_PROTOCOL.md` §0 y §6) y **no se obedece**:
   > *«`unrlvl-context` → nunca push directo, nunca por CC (solo Sam vía GitHub Desktop). Este repo → branch + PR, nunca merge propio. CC nunca mergea por su cuenta. CC limpia sus worktrees al cerrar un PR.»*
   >
   > Estaba **vencida desde el 2026-07-31**, cuando `CC_PROTOCOL.md` v2026-07-31 corrigió el punto de
   > push de CC según la instrucción de Sam del 29-jul, y arrastraba además que **Sam mergea por GitHub
   > Web UI** desde el 2026-07-29, **no por GitHub Desktop**. Este `CLAUDE.md` nunca se sincronizó, y
   > leer «nunca por CC» como imperativo vigente **traba a CC** — ya ocurrió en sesión. Fuente de verdad:
   > `CC_PROTOCOL.md` §1 + «Flujo de entrega de context files». Los `CLAUDE.md` de cada repo **sólo
   > apuntan** al protocolo; cuando duplican una regla, divergen — que es exactamente lo que pasó acá.

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

---

## ENTREGA Y VERIFICACIÓN — INVIOLABLE

**Destinatario declarado.** Todo lo que se entrega cae dentro de un bloque con
encabezado propio: `PARA SAM — [de qué va]` o `PARA CC — [asunto]`. El bloque termina
donde empieza el siguiente encabezado. Un párrafo fuera de un bloque no es una
instrucción: es contexto.

**El diferenciador visual es para que SAM lea, no para que CC ejecute.** La marca
depende de la superficie: en **chat**, cuadrado emoji (verde Sam / naranja CC) más
encabezado grande, porque el markdown no rinde color arbitrario; en **documento, HTML
o UI con estilos**, el carácter `●` con la línea completa en su hex (`#00FFD1` Sam /
`#FFB300` CC). El hex no se escribe dentro de la línea: es especificación.

**Briefs largos se entregan como archivo**, no pegados: un bloque se trunca al copiarlo
y el truncamiento no falla — CC ejecuta lo que le llegó.

**Idioma.** ES neutro internacional o EN neutro internacional, sin excepción, sin
regionalismos y **sin voseo** (el imperativo voseante y el pretérito son homógrafos:
"decidí" es a la vez una orden y un hecho consumado). Aplica a chat, briefs, PRs,
commits, comentarios de código, context files y plantillas de protocolo.

**Evidencia.** Toda afirmación de estado va etiquetada `medido` / `reportado` /
`deducido`. Sin etiqueta se lee como `medido`. Antes de asumir, se consulta.

**Las cuatro QA son HRD RULES, en este orden:**
`QA-ENCARGO` (confirmar que entendí el encargo) → `QA-OBJETIVO` (confirmar el objetivo
con Sam) → `QA-INFO` (**bloqueo**: sin información completa NO se responde; si no hay
forma de obtenerla, se entrega el plan para conseguirla vía Sam o CC) → `QA-PROP`
(comprobar que lo entregado apunta al objetivo validado; cinco preguntas respondidas
por escrito). Un brief sin `QA-PROP` respondida se devuelve.

Fuente única: `unrlvl-context/protocols/DELIVERY_AND_VERIFICATION_RULE.md`.
**No copiar la regla completa aquí: este bloque es un puntero, no una segunda fuente.**
