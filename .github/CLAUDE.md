# Claude Code -- reglas para este repo

## OBLIGATORIO antes de cualquier commit
- Trabajar siempre en una branch, nunca en main directamente
- Crear la branch con: `git checkout -b fix/descripcion` o `feat/descripcion`
- `tsc --noEmit` o `vite build` debe pasar antes de commitear
- Commit message descriptivo en ingles o espanol

## OBLIGATORIO antes de hacer push
- Confirmar que el build local pasa
- No incluir en el commit: tsconfig.tsbuildinfo, .next/, dist/, node_modules/

## Para mergear a main
- Push a la branch, no a main
- Verificar Vercel Preview URL
- **CC nunca mergea, en ningún repo.** CC publica la rama y abre el PR; **Sam** revisa,
  mergea y borra la rama por **GitHub Web UI** (`CC_PROTOCOL.md` §1). La redacción anterior
  —«solo entonces hacer merge o pedir merge»— dejaba la puerta abierta a que CC mergeara.

## ENTREGA Y VERIFICACIÓN — puntero
La forma de entregar y de verificar —bloques con destinatario (`PARA SAM` / `PARA CC`), idioma ES/EN
neutro **sin voseo**, etiqueta de evidencia `medido`/`reportado`/`deducido`, y las **cuatro QA**
`QA-ENCARGO` → `QA-OBJETIVO` → `QA-INFO` → `QA-PROP`, donde `QA-INFO` es un **bloqueo**— vive en
`unrlvl-context/protocols/DELIVERY_AND_VERIFICATION_RULE.md`. **Se carga en la apertura de sesión**,
no cuando surja la duda. El resumen operativo está en el `CLAUDE.md` de la raíz de este repo; este
archivo **sólo apunta**, para no crear una segunda fuente.
