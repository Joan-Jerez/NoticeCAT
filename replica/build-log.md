# Registro de construcción

App: `web/` (Next.js 15.5, React 19, Tailwind 4, TypeScript). Rama `replica-build`.
Datos: capa falsa en `web/src/lib/data/` sobre `web/.data/db.json` (se crea sola con
`seed.ts`; borrarla reinicia los datos). Las firmas son las de la versión con Supabase.
Pruebas: `npx playwright test` (Edge instalado, 1440 y 390 px). Capturas:
`node scripts/screenshots.mjs` → `replica/clone-screens/`.

Desarrollo: `?org=costa` cambia de medio, `?como=user-redactor` cambia de usuario del panel.

| ID | fecha | estado | qué falta | más difícil de lo esperado |
| --- | --- | --- | --- | --- |
| shell | 2026-10-25 | hecho | — | Tailwind 4 solo emite variables usadas: `@theme static` en tokens. Fuentes con `next/font` vía `var(--font-nf-*)` en los tokens |
| slice | 2026-10-25 | hecho | — | e2e: la editora publica y la nota sale en portada, sección, última hora y RSS |
| S01 Portada | 2026-10-25 | hecho | en móvil los bloques de sección apilan tarjetas grandes (portada de ~7.000 px): pasar a variante `row` bajo `md` | elegir la destacada sin repetir notas entre bloques |
| S02 Sección | 2026-10-25 | hecho | — | — |
| S03 Artículo | 2026-10-25 | hecho | sitemaps y `news-sitemap.xml` | render del cuerpo con lista cerrada de nodos (sin HTML guardado) |
| S04 Autor | 2026-10-25 | hecho | — | — |
| S05 Tema | 2026-10-25 | hecho | seguir de verdad necesita cuentas | — |
| S06 Archivo día | 2026-10-25 | hecho | — | el día se calcula en la zona del medio, no en UTC |
| S07 Última hora | 2026-10-25 | hecho | — | — |
| S08/S09 Cuenta | 2026-10-25 | parcial | envío real con Supabase Auth, Google y Facebook | — |
| S10 RSS | 2026-10-25 | hecho | — | — |
| S11 Legal, S12 Contacto | 2026-10-25 | parcial | textos editables por el medio; formulario de contacto con Resend | — |
| S13 Encuesta | 2026-10-25 | hecho | voto único con `voter_hash` en la base real | — |
| S14 Archivo año | 2026-10-25 | hecho | — | — |
| Búsqueda | 2026-10-25 | hecho | `tsvector` en Postgres | — |
| A01 Dashboard | 2026-10-25 | hecho | paginación de la tabla con muchas notas | — |
| A02 Editor | 2026-10-25 | parcial | Tiptap (hoy: texto con marcas tipo Markdown), autoguardado, subir fotos, modal propio para "Borrar" (hoy `confirm()`) | detección de conflictos con `updatedAt` |
| A03/A04 Importar | 2026-10-25 | provisional | extracción Word/PDF en servidor | — |
| Gestión de secciones, autores y temas | — | no empezado | CRUD en el panel | — |

## Notas

- Todas las rutas son dinámicas: leen el dominio para saber el medio. Con Supabase,
  las páginas públicas pasan a caché (ISR 60 s + `revalidateTag` por medio).
- En desarrollo, React 19 manda las props de los componentes de servidor como
  información de depuración (por eso se ven cuerpos de notas en el HTML de dev).
  Verificado: en el build de producción no aparecen.
- En producción, un dominio que no es de ningún medio responde 404 (probado).
- No correr `next build` con `next dev` encendido: comparten `.next` y el dev pierde el CSS.

## /replica-backend (2026-10-25)

- Capa de datos Supabase con las mismas firmas; `lib/data/index.ts` elige por variables de entorno. Ninguna pantalla cambió de imports.
- Auth real (S08/S09 + Mi cuenta), panel con sesión, seguir tema, votos con voter_hash, límites por IP.
- **Más difícil de lo esperado:** probarlo. Supabase local necesita Docker y esta máquina tiene la virtualización desactivada; queda pendiente probar con el proyecto en la nube (`replica/backend.md`).
- Pendiente: subir imágenes desde el editor, Stripe (milestone 5), SMTP propio + digest de temas, jobs.

## Conexión a Supabase en la nube (2026-10-26)

- Proyecto creado y enlazado; migración aplicada, seed cargado, 17/17 reglas de acceso en "ok", la app lee de Supabase.
- Arreglo: con `SEED_PASSWORD=` vacío en `.env.local` los usuarios de prueba se creaban sin contraseña (`??` no cubre la cadena vacía). Ahora usa `||`.

## Rediseño "revista cálida" (2026-10-26)

- Para alejarse de Diario Libre: paleta crema y terracota (0 fallos de contraste AA), Fraunces + Literata + DM Sans, radios grandes y sombras suaves.
- Cabecera de una barra fija con secciones en píldoras; portada con apertura grande y titular sobre la foto, "Lo último" en panel, mosaico "Para leer hoy", opinión y encuesta en banda oscura, secciones en tarjetas.
- Artículo alineado a la izquierda, compartir en píldora bajo la firma (sin barra lateral), caja de autor con fondo.
- Animaciones: fundido al cambiar de página (`(public)/template.tsx`), tarjetas que se elevan, botones que se hunden al pulsar, icono que salta al votar o copiar el enlace, punto "en vivo" en Lo último.
- Ilustraciones de prueba regeneradas con la paleta nueva. Sin Python en la máquina: el generador de tokens se corrió con un port a Node (mismo resultado).
- 29/29 e2e en modo local. Ojo: Playwright reutiliza un servidor ya encendido; para no escribir en Supabase, apagar `npm run dev` antes de `npm run test:e2e`.
