# bonchona-chat

Worker independiente con el Durable Object del chat en vivo de la barra de música.

## Por qué va aparte

Igual que `workers/sampler`: `@opennextjs/cloudflare` genera su propio `worker.js`, y para
declarar una clase Durable Object habría que reexportarla desde ese artefacto de build, lo
que hace el build frágil. Como beneficio extra este worker lleva su propio
`compatibility_date` (2025-08-01), sin arrastrar el `2025-02-01` del worker principal.

## Cómo se autentica

Este worker **no conoce la sesión del sitio**. La cookie `bonchona_session` es host-only y
no viaja a otro hostname. En su lugar:

1. El navegador pide un ticket a `POST /api/chat/ticket` en el sitio (Next).
2. Next verifica Turnstile, valida el nick, resuelve el rol y firma un ticket HMAC de 60 s
   con `AUTH_SECRET` (ver `src/lib/chat.ts`).
3. El cliente abre `wss://…/ws?t=<ticket>`.
4. Aquí solo se verifica la firma: ni Turnstile, ni sesión, ni consultas de usuario.

Por eso **`AUTH_SECRET` debe ser exactamente el mismo** en los dos workers.

## Endpoints

| Ruta | Uso |
|---|---|
| `GET /ws?t=<ticket>` | Conexión WebSocket del chat |
| `GET /count` | Conectados. Lo consume `/api/now-playing` del sitio |
| `POST /reload` | Relee la configuración y expulsa a todos si el chat quedó cerrado |
| `GET /health` | Comprobación de vida |

## Desarrollo local

```bash
# 1. Secreto compartido con el sitio
echo "AUTH_SECRET=el-mismo-que-usa-el-sitio" > workers/chat/.dev.vars

# 2. Migración (una sola vez)
npx wrangler d1 execute bonchona-db --local --file=migrations/0007_chat.sql

# 3. Arrancar
npx wrangler dev -c workers/chat/wrangler.json --port 8788 --local \
  --persist-to .wrangler/state
```

**`--persist-to .wrangler/state` no es opcional.** Sin esa bandera, wrangler crea un estado
local propio en `workers/chat/.wrangler/` y el worker ve una base D1 vacía: la
configuración del chat no existe, `loadConfig()` falla y el chat se queda cerrado (que es
el comportamiento correcto, pero desconcierta un buen rato).

En el sitio, `CHAT_WORKER_URL` debe apuntar a `http://127.0.0.1:8788` durante el
desarrollo. El valor de producción está en el `wrangler.json` de la raíz.

## Deploy

```bash
npx wrangler deploy -c workers/chat/wrangler.json
npx wrangler secret put AUTH_SECRET -c workers/chat/wrangler.json
```

## Notas de coste

Todo el diseño gira alrededor de dos techos del plan gratuito de Cloudflare: **100.000
filas escritas al día** y **13.000 GB-s al día**.

- Los mensajes **nunca** tocan D1 ni se guardan uno a uno. Viven en un anillo de 100 en
  memoria y se vuelcan al almacenamiento del objeto como mucho una vez cada 5 s
  (`CHECKPOINT_MS`). El precio es perder unos segundos de historial si el objeto hiberna
  justo entre dos volcados, algo asumible en un chat efímero.
- El ping/pong se contesta con `setWebSocketAutoResponse`, sin despertar al objeto. Es la
  diferencia entre hibernar de verdad y pagar duración las 24 horas.
- Con el chat cerrado, `/api/now-playing` deja de pedir `/count`, así que el objeto se
  duerme del todo.
- Por encima de 150 conectados los mensajes se difunden en lotes de 200 ms en vez de uno a
  uno, para no hacer miles de `send()` por segundo.

Solo en D1 viven los moderadores (`chat_moderators`), la auditoría (`chat_audit`) y la
configuración (`settings`), que son pocas filas y tienen que durar.
