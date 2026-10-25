# Arquitectura: NoticeCAT (reconstrucción del núcleo lector de Diario Libre, como plataforma para varios medios)

Lee: `replica/recon.md`, `replica/features.csv`. Esquema: `replica/schema.sql`.
Fecha: 2026-10-25

Decisión de fondo: **multi-medio desde el día 1.** En la matriz es un "could",
pero añadir `org_id` a cada tabla después es reescribir el esquema, las
políticas de acceso y todas las consultas. Ponerlo ahora cuesta una columna y
un filtro. La interfaz para *gestionar* varios medios (alta, facturación,
dominios propios) sí va al final.

## Stack

| capa | elección | por qué |
| --- | --- | --- |
| web | Next.js 15 (App Router) + TypeScript | páginas de noticias renderizadas en servidor con caché (ISR) son SEO y velocidad gratis; el panel admin vive en la misma app |
| estilos | Tailwind 4 con tokens de `/replica-design` | ya usas Tailwind; pasa de CDN a build y los colores lila pasan a tokens |
| base de datos | Postgres en Supabase | una sola base, RLS para aislar medios, búsqueda en español incluida |
| ORM | Drizzle | SQL a la vista, tipos en TypeScript, migraciones en archivos |
| auth | Supabase Auth (email + contraseña, Google, Facebook) | personal y lectores en el mismo sistema, se integra con RLS (`auth.uid()`) |
| archivos | Supabase Storage, bucket `media/{org_id}/` + transformación de imágenes | portadas a varios tamaños sin un servicio aparte |
| editor de texto | Tiptap (JSON) | bloques propios: "Te puede interesar", figura con pie y crédito |
| importación | `mammoth` (Word), `pdfjs-dist` (PDF), lectura directa (TXT) | lo que ya diseñaste en A03/A04, todo en el servidor |
| pagos | Stripe Checkout + Billing + Customer Portal | cobrar a los medios que contratan NoticeCAT (milestone 5), no a los lectores |
| email | Resend | recuperar contraseña, invitaciones del personal, avisos de temas seguidos |
| jobs | Vercel Cron (1 por hora) | solo limpieza y avisos; las notas programadas **no** necesitan job (ver abajo) |
| hosting | Vercel | ISR, dominios propios por medio con su API, previews por PR |

Una base de datos, una app, sin microservicios.

## Esquema

Tablas: 16. Acceso: **row level security de Postgres** en todas.

| tabla | qué guarda |
| --- | --- |
| `organizations` | cada medio cliente: nombre, slug, zona horaria, ajustes de marca |
| `org_domains` | dominios del medio (`mimedio.com`, `mimedio.noticecat.app`) |
| `memberships` | personal por medio con rol: owner, admin, editor, writer |
| `images` | fotos con pie, crédito, alt y tamaño |
| `sections` | secciones con subsecciones (`parent_id`), orden y RSS |
| `authors` | firmas, columnistas, bio; pueden no tener cuenta |
| `tags` | temas y lugares (`kind`) |
| `articles` | la nota: número para la URL, bajada, cuerpo Tiptap + HTML + texto, estado, búsqueda |
| `article_tags` | temas de cada nota |
| `readers` | perfil del lector en un medio |
| `topic_follows` | lector sigue tema |
| `polls`, `poll_options`, `poll_votes` | encuestas; un voto por persona lo garantiza un índice único |
| `org_billing` | plan y suscripción de Stripe del medio |
| `stripe_events` | ids de eventos ya procesados (webhooks idempotentes) |

Restricciones que importan:
- `articles.number` (identity) da la URL corta `/.../{slug}/{number}` como el
  original; el slug puede cambiar sin romper enlaces porque se busca por número.
- Una nota es visible cuando `status in ('published','scheduled') and published_at <= now()`.
  La política RLS pública es exactamente eso, así que un borrador nunca se filtra
  aunque una consulta olvide el filtro.
- `published_needs_date`: no se puede publicar ni programar sin fecha.
- `poll_votes unique (poll_id, voter_hash)`: el voto doble falla en la base.
- `sections.parent_id on delete restrict`, `articles.section_id on delete restrict`:
  no se borra una sección con notas o subsecciones; primero se mueven.
- Redactor (`writer`): crea y edita sus notas pero la política no le deja
  ponerlas en `scheduled` ni `published`. Publica un editor.

## Rutas

Resolución del medio: `middleware.ts` lee el `Host`, lo busca en `org_domains`
(con caché) y pasa `org_id` a la petición. En desarrollo, `?org=slug`.

### Páginas públicas (todas ISR, `revalidate: 60`)

| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| GET `/` | portada: destacada + bloques por sección + opinión | cualquiera | — | S01 | F01 |
| GET `/{seccion}` y `/{seccion}/{sub}` | lista de la sección, 20 por página | cualquiera | `?cursor` | S02 | F03 |
| GET `/{seccion}/{sub}/{yyyy}/{mm}/{dd}/{slug}/{number}` | artículo; si el slug o la ruta no coinciden, 301 a la canónica | cualquiera | — | S03 | F01, F02, F06 |
| GET `/autor/{slug}` | autor + sus notas | cualquiera | `?cursor` | S04 | F02 |
| GET `/tema/{slug}` | notas de un tema | cualquiera | `?cursor` | S05 | F02 |
| GET `/archivo/{yyyy-mm-dd}` | notas de un día (en la zona horaria del medio) | cualquiera | — | S06 | F05 |
| GET `/archivo/{yyyy}` | meses del año con conteo | cualquiera | — | S14 | F05 |
| GET `/ultima-hora` | cronológico con bajada | cualquiera | `?cursor` | S07 | F04 |
| GET `/buscar` | búsqueda en español sin acentos | cualquiera | `?q&cursor` | nueva | — |
| GET `/rss` | directorio de feeds | cualquiera | — | S10 | F09 |
| GET `/rss/{seccion}.xml`, `/rss/portada.xml` | RSS 2.0 | cualquiera | — | XML | F09 |
| GET `/sitemap.xml`, `/news-sitemap.xml`, `/robots.txt` | SEO; el news sitemap con las notas de 48 h | bots | — | XML | — |
| GET `/legal/{pagina}`, `/contacto` | páginas del medio | cualquiera | — | S11, S12 | — |
| GET `/cuenta/entrar`, `/cuenta/registro`, `/cuenta/recuperar` | auth de lector | cualquiera | — | S08, S09 | F07 |
| GET `/cuenta` | mis temas seguidos | lector | — | nueva | F07 |

Rutas en español y más cortas que el original (`/tema/` en vez de `/tags/{slug}/{id}`):
las URLs son tuyas, no hace falta copiar las suyas.

### Server actions y API públicas

| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| GET `/api/secciones/{id}/notas` | "cargar más" | cualquiera | `cursor` (published_at, number) | tarjetas JSON | F03 |
| action `followTopic` / `unfollowTopic` | seguir tema | lector | `tagId` | estado | F07 |
| action `vote` | votar; calcula `voter_hash` en el servidor | cualquiera (o lector si `requires_login`) | `pollId, optionId` | resultados | F08 |
| action `signIn`, `signUp`, `resetPassword`, OAuth callback `/auth/callback` | auth | cualquiera | email, contraseña | sesión (cookie http-only) | F07 |
| action `deleteAccount` | borra lector y sus datos | lector | — | — | — |

### Panel admin (`/admin/*`, sin caché, requiere membership)

| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| GET `/admin` | dashboard: métricas + tabla de notas | staff | `?estado&seccion&q&page` | A01 | F10 |
| GET `/admin/notas/nueva`, `/admin/notas/{id}` | editor | staff | — | A02 | F10 |
| action `saveArticle` | guarda borrador (autoguardado cada 10 s) | staff (writer: solo las suyas) | campos + body Tiptap | nota | F10 |
| action `publishArticle` | publica o programa; renderiza `body_html`, calcula `body_text` y minutos de lectura, `revalidateTag` | owner, admin, editor | `id, published_at` | nota | F10 |
| action `unpublishArticle`, `archiveArticle`, `deleteArticle` | retirar | owner, admin, editor | `id` | — | F10 |
| POST `/admin/api/import` | extrae texto de Word/TXT/PDF y propone título, bajada, cuerpo y temas | staff | archivo ≤ 10 MB | campos JSON | F10 (A03→A04) |
| POST `/admin/api/upload` | URL firmada para subir una imagen a Storage | staff | tipo, tamaño | URL firmada | F10 |
| CRUD `/admin/secciones`, `/admin/autores`, `/admin/temas` | catálogo | owner, admin, editor | — | — | — |
| CRUD `/admin/encuestas` | encuestas | owner, admin, editor | — | — | F08 |
| CRUD `/admin/equipo` | invitar y cambiar roles (email de invitación) | owner | email, rol | — | — |
| GET/POST `/admin/ajustes` | marca, redes, dominios | owner, admin | — | — | — |
| action `startCheckout`, `openBillingPortal` | contratar y gestionar el plan | owner | plan | URL de Stripe | — |

Rutas: 17 páginas públicas, 7 acciones o API públicas, 13 del panel = **37**.

Webhooks de entrada: Stripe (`checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`) en `POST /api/webhooks/stripe`, con firma verificada
y deduplicados por `stripe_events.id`.
Webhooks de salida: ninguno al inicio. Más adelante, `article.published` para
que un medio conecte sus redes.

Jobs (Vercel Cron):
- `hourly-topic-digest` (cada hora): email a lectores que siguen un tema con notas nuevas, máximo uno al día por lector.
- `daily-cleanup` (03:00 UTC): borra imágenes huérfanas de más de 7 días y votos anónimos de encuestas cerradas hace 90 días.

Solo APIs oficiales con tus claves (Supabase, Stripe, Resend, Google, Meta, Vercel).
Nada de Diario Libre: ni sus feeds RSS como fuente de contenido ni sus endpoints.

## Las partes que muerden

- **Notas programadas:** no hay job que cambie `scheduled` a `published`. Las
  consultas usan `published_at <= now()` y las páginas se regeneran cada 60 s,
  así que una nota programada sale a su hora con un minuto de margen como mucho.
  Al publicar al instante, `revalidateTag('org:{id}')` la saca al momento.
- **Zonas horarias:** todo en `timestamptz` UTC. La hora que se muestra, la
  fecha de la URL y "las notas de este día" se calculan en `organizations.timezone`
  (Santo Domingo no tiene horario de verano; un medio en EE. UU. sí, y el
  archivo por día debe usar la zona del medio, no UTC).
- **Picos de tráfico:** una nota viral no debe tocar la base en cada visita. ISR
  sirve HTML cacheado; la base solo trabaja al regenerar. Nada de contadores de
  visitas escritos por petición (si hacen falta, después y en lote).
- **Varios medios:** cada consulta lleva `org_id` y RLS lo hace cumplir. Las
  claves de caché incluyen el `org_id` o un medio vería la portada de otro.
  Probarlo con dos medios desde el milestone 1.
- **Slugs y URLs:** la URL canónica se arma con la sección y la fecha *actuales*;
  si cambian, la vieja hace 301 por el `number`. Nunca 404 por editar un titular.
- **Rich text seguro:** `body_html` se genera en el servidor desde el JSON de
  Tiptap con una lista de nodos permitida. Nunca se guarda HTML pegado por el
  usuario sin limpiar (Word trae basura y `<script>` es posible).
- **Importación:** archivos de 10 MB como máximo, procesados en el servidor con
  tiempo límite; los PDF escaneados no tienen texto (avisar, no fallar en silencio).
- **Búsqueda:** `tsvector` español + `unaccent` ("educacion" encuentra
  "Educación"). Basta hasta cientos de miles de notas por medio.
- **Idempotencia:** webhooks de Stripe deduplicados; doble clic en "Publicar" no
  duplica (es un update, no un insert).
- **Carreras:** dos editores en la misma nota; guardar con `updated_at` como
  versión y avisar "otra persona cambió esta nota" en vez de pisarla.
- **Límites:** login, registro, recuperar contraseña y votar con límite por IP.
- **Borrado de datos:** el lector puede borrar su cuenta (cascada a `readers`,
  `topic_follows`; sus votos quedan anónimos). Un medio que se da de baja: export
  de sus notas y borrado en cascada desde `organizations`.
- **Email:** dominio de envío verificado (SPF, DKIM, DMARC) antes de mandar avisos.

## Orden de construcción

1. **Vertical slice: un editor publica y la nota sale en la portada.**
   - Pantallas: A02 (editor sin import, sin Tiptap avanzado), S01 (portada simple), S03 (artículo).
   - Tablas: `organizations`, `org_domains`, `memberships`, `sections`, `authors`, `images`, `articles`.
   - Rutas: middleware de medio, `/admin/notas/nueva`, `saveArticle`, `publishArticle`, `/`, ruta del artículo.
   - Prueba: dos medios sembrados; publicar en uno y verificar que no aparece en el otro.
2. **Must-haves, por área:**
   - Navegación: header, mega menú, menú móvil, pie (todas).
   - Sección y subsecciones con "cargar más" (S02); autor (S04); tema (S05); última hora (S07).
   - Artículo completo: migas, foto con pie y crédito, temas, compartir, cuerpo rico (S03).
   - SEO: URLs canónicas con 301, metadatos OG, sitemaps.
   - Admin: dashboard con estados (A01), subir imágenes, CRUD de secciones, autores y temas.
3. **Should-haves:** caja de autor, caja "Te puede interesar" (nodo Tiptap), ciudad
   en la línea de fecha, archivo por día (S06), RSS (S10), ampliar foto,
   bloque de columnistas, etiqueta patrocinado, cuentas de lector con email,
   Google y recuperar contraseña (S08, S09), importar Word/TXT/PDF (A03, A04).
4. **Could-haves:** búsqueda, seguir tema + digest, Facebook login, encuestas
   (S13), videos, carrusel, especiales, anuncios, archivo por año (S14).
5. **Producto vendible:** alta de un medio nuevo, invitar equipo, dominio
   propio vía API de Vercel, planes con Stripe (`org_billing`).
6. **Mejoras de `/replica-entrepreneur`**, cuando corra.
