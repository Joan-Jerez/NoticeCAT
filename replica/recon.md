# Mapa de recon: Diario Libre (web)

Alcance: núcleo lector (portada, secciones, artículo, autores, etiquetas, archivo,
última hora, RSS, cuentas de lector) + el panel admin de NoticeCAT.
Para: NoticeCAT como producto para vender a otros medios (plataforma de noticias).
Fecha: 2026-10-25

Método: lectura de páginas públicas a ritmo humano, sin login, sin leer JS ni
llamadas de red. No se tomaron capturas de pantalla todavía (`replica/screens/`
vacío); hay que hacerlas a mano a 1440x900 y 390x844 antes de `/replica-diff`.

## Términos

El Aviso Legal (`/aviso-legal`) dice que el contenido y las marcas son propiedad
de GDL (Grupo Diario Libre), solo para uso personal y no comercial (II.1, II.2),
y prohíbe el acceso no autorizado a sus bases de datos y la sobrecarga de sus
sistemas (II.2, VI.4). No dice nada del diseño ni del layout. Por eso aquí se
toman solo patrones de estructura y flujos. Nada de textos, fotos, logos ni
nombres de columnas (Ágora, Noticiero Poteleche, MiDL, etc.). No es asesoría legal.

## Fuentes

| # | fuente | URL | notas |
| --- | --- | --- | --- |
| 1 | portada | https://www.diariolibre.com | estructura de bloques, menú completo, pie |
| 2 | sección | https://www.diariolibre.com/actualidad/nacional | lista + "Más historias" |
| 3 | artículo | https://www.diariolibre.com/economia/consumo/2026/10/25/cae-la-cantidad-de-tarjetas-de-credito-de-menor-limite/3698709 | anatomía del artículo |
| 4 | autor | https://www.diariolibre.com/autor/tomas-d-guzman-hernandez/306207 | cabecera de autor + lista |
| 5 | etiqueta | https://www.diariolibre.com/tags/dlpodcast/1320 | lista por tema |
| 6 | archivo por fecha | https://www.diariolibre.com/listado/2026-10-24 | listado diario |
| 7 | última hora | https://www.diariolibre.com/ultima-hora | cronológico con bajada |
| 8 | cuenta lector | https://www.diariolibre.com/mi-dl/acceder | login email / Google / Facebook |
| 9 | RSS | https://www.diariolibre.com/rss | 11 feeds por sección |
| 10 | aviso legal + privacidad | https://www.diariolibre.com/aviso-legal | términos, ver arriba |
| 11 | NoticeCAT actual | `index.html`, `articulo.html`, `admin-*.html` | diseño estático existente |

No consultadas: centro de ayuda (no existe para lectores), precios (el sitio es
gratis, sin muro de pago visible), changelog, API pública (no hay). Sin
búsqueda visible en el header.

## Ciclo central

Un lector entra a la portada o a un enlace compartido, abre un artículo, y la
página lo lleva a la siguiente nota (relacionados, temas, sección). Para el
producto que se vende: un editor publica una nota en el panel y aparece de
inmediato en portada, sección, etiquetas, última hora y RSS.

## Pantallas

| ID | pantalla | ruta | propósito | componentes clave | estados vistos |
| --- | --- | --- | --- | --- | --- |
| S01 | Portada | `/` | escaparate editorial | header, nota destacada, listas por sección, bloque opinión/columnistas, video, encuesta, patrocinado, especiales, servicios, pie | lleno |
| S02 | Sección | `/{seccion}/{subseccion}` | todas las notas de una sección | título "Reciente en X", lista de tarjetas, "Más historias" (cargar más) | lleno |
| S03 | Artículo | `/{seccion}/{sub}/{yyyy}/{mm}/{dd}/{slug}/{id}` | leer la nota | migas, tema con seguir, H1, bajada, firma con foto, ciudad + fecha + tiempo de lectura, barra de compartir, foto con pie y crédito, cuerpo (H2, listas, negritas, caja "Te puede interesar"), temas con seguir, caja de autor | lleno |
| S04 | Autor | `/autor/{slug}/{id}` | notas de un autor | foto circular, nombre, bio de 1 línea, lista | lleno |
| S05 | Etiqueta / tema | `/tags/{slug}/{id}` | notas de un tema | título "Reciente en X", lista | lleno |
| S06 | Archivo por fecha | `/listado/{yyyy-mm-dd}` | todas las notas de un día | título con fecha larga, lista | lleno |
| S07 | Última hora | `/ultima-hora` | flujo cronológico | lista con fecha + hora en negrita, sección, titular, bajada, miniatura | lleno |
| S08 | Login / registro lector | `/mi-dl/acceder` | cuenta del lector | email+contraseña, Google, Facebook, recuperar contraseña, registrarse | vacío, error ("llenar todos los campos") |
| S09 | Recuperar cuenta | dentro de S08 | restablecer contraseña | campo email, cargando | cargando |
| S10 | Directorio RSS | `/rss` | feeds | lista de feeds por sección | lleno |
| S11 | Aviso legal / privacidad | `/aviso-legal` | legal | texto largo | lleno |
| S12 | Contacto | `/contactanos` | contacto | (no visitada) | — |
| S13 | Encuesta | bloque en S01, `/encuestas` | votar | pregunta, SÍ/NO, botón Votar | sin votar |
| S14 | Archivo histórico por año | enlaces 2004–2024 en el pie | archivo antiguo | (no visitada) | — |
| A01 | Admin: dashboard | `admin-dashboard.html` (NoticeCAT) | métricas + tabla de artículos | métricas, tabla con estado | lleno |
| A02 | Admin: editor | `admin-editor.html` | crear o editar una nota | título, categoría, estado, fecha, resumen, contenido, portada, etiquetas | lleno |
| A03 | Admin: importar archivo | `admin-subir-archivo.html` | subir Word/TXT/PDF | zona de arrastre, progreso | cargando |
| A04 | Admin: texto importado | `admin-texto-importado.html` | revisar lo extraído | campos ya rellenos | lleno |

Estados no observados y que hay que construir igual: vacío (sección/tema/autor
sin notas), cargando "Más historias", 404 de artículo, error de red, móvil
(390px) de todo, sesión iniciada en S08. Las pantallas A01–A04 son de NoticeCAT;
el panel de Diario Libre es privado y no se estudia.

## Flujos

```
F01 Lector lee una nota desde la portada
    S01 -> S03
    clics en el camino feliz: 1
    borde: nota sin foto, nota muy larga, nota borrada (404), móvil

F02 Lector sigue leyendo dentro del sitio
    S03 -> (caja "Te puede interesar" | tema | autor | migas) -> S03 / S05 / S04 / S02
    clics: 1–2
    borde: tema sin más notas, autor con 1 nota

F03 Lector explora una sección
    S01 (menú) -> S02 -> "Más historias" -> S03
    clics: 2–3
    borde: subsección vacía, fin de la lista, menú en móvil (desplegable)

F04 Lector revisa lo último
    S01 -> S07 -> S03
    clics: 2
    borde: notas nuevas mientras lee (no hay auto-refresh en el original)

F05 Lector consulta un día pasado
    S03 (fecha) | pie (año) -> S06 / S14 -> S03
    clics: 2
    borde: día sin notas, fecha futura, fecha inválida en la URL

F06 Lector comparte una nota
    S03 -> barra de compartir (WhatsApp, Facebook, X, email, Telegram, nativo)
    clics: 1
    borde: navegador sin Web Share API

F07 Lector crea cuenta y sigue un tema
    S03 "Seguir tema +" -> S08 registro -> vuelve a S03 con el tema seguido
    clics: ~4
    borde: email ya registrado, contraseña olvidada (S09), OAuth cancelado
    nota: qué hace "seguir" después (feed propio, avisos) no es visible públicamente; suposición

F08 Lector vota en una encuesta
    S01 bloque encuesta -> SÍ/NO -> Votar -> resultados
    clics: 2
    borde: voto doble, encuesta cerrada

F09 Lector se suscribe por RSS
    pie -> S10 -> copia el feed
    clics: 2

F10 Editor publica una nota (NoticeCAT)
    A01 -> A02 (o A03 -> A04) -> publicar -> aparece en S01/S02/S05/S07/S10
    clics: ~5
    borde: programada a futuro, borrador, sin portada, slug duplicado, editar después de publicar
```

## Componentes

| componente | variantes | estados | usado en |
| --- | --- | --- | --- |
| Header | escritorio (2 filas de secciones), móvil (menú desplegable) | normal, menú abierto, con sesión | todas |
| Mega menú de secciones | sección con subsecciones y columnas | abierto, cerrado | todas |
| Tarjeta de nota | destacada (foto grande), lista (miniatura izq.), compacta (solo titular), opinión (foto del autor), video (icono ▶) | normal, hover, sin foto | S01, S02, S04–S07 |
| Etiqueta de sección (kicker) | enlace | normal, hover | tarjetas, S03 |
| Marca de tiempo | "Mes dd, aaaa \| hh:mm a. m." con hora en negrita | — | tarjetas, S03 |
| Migas de pan | — | — | S03 |
| Botón seguir tema | "+" | sin seguir, siguiendo, requiere login | S03 |
| Firma de autor | con foto, sin foto | — | S03 |
| Barra de compartir | iconos por red + nativo | — | S03 |
| Figura | foto a sangre con pie y crédito, ampliar | cargando, ampliada | S03 |
| Caja relacionada en el cuerpo | "Te puede interesar" | — | S03 |
| Lista de temas | con seguir por tema | — | S03 |
| Caja de autor | foto, nombre, bio | — | S03, S04 |
| Cargar más | botón | normal, cargando, fin | S02, S04, S05 |
| Encuesta | SÍ/NO | sin votar, votado, cerrada | S01 |
| Bloque patrocinado | etiqueta "contenido patrocinado" | — | S01 |
| Espacio de anuncio | por posición | vacío, lleno | S01 |
| Carrusel | con flechas | — | S01 (bloque Revista) |
| Formulario de login | email, OAuth | vacío, error, cargando | S08, S09 |
| Pie | secciones, servicios, archivo por año, apps, redes, legal | — | todas |
| Tabla admin, editor, zona de arrastre | (ya en NoticeCAT) | — | A01–A04 |

## Modelo de datos inferido

```
Section      id, name, slug, parent_id (subsecciones), order, rss_enabled
             evidencia: menú de S01, rutas de S02, feeds de S10
             confianza: alta

Article      id (numérico, en la URL), slug, title, dek (bajada), body (rich text),
             section_id, author_id, city_tag_id, cover_image_id,
             published_at, status (draft | scheduled | published), reading_time_min,
             is_sponsored, is_video
             evidencia: S03 (URL, campos visibles), S01 bloque patrocinado, A02 estados
             confianza: alta (updated_at: no se muestra; suposición)

Author       id, slug, name, photo, bio_short, is_columnist, column_name
             evidencia: S04, caja de autor en S03, columnistas en S01
             confianza: alta

Tag          id, slug, name, kind (tema | ciudad)
             evidencia: S05, "TEMAS" y ciudad en S03
             confianza: alta (kind: suposición, la ciudad es un tag con la misma ruta)

ArticleTag   article_id, tag_id                      confianza: alta

Image        id, url, caption, credit, width, height
             evidencia: pie y crédito en S03, miniaturas 598x352 en S07
             confianza: alta

RelatedLink  article_id, related_article_id, position (dentro del cuerpo)
             evidencia: "Te puede interesar" en S03
             confianza: media (puede ser un bloque del rich text)

Reader       id, email, password_hash, oauth_provider, created_at
             evidencia: S08
             confianza: alta

TopicFollow  reader_id, tag_id, created_at
             evidencia: botón "Seguir tema +" en S03
             confianza: media

Poll         id, question, options[], starts_at, ends_at
PollVote     poll_id, option, voter (reader_id o huella anónima)
             evidencia: bloque encuesta en S01
             confianza: media (cómo evitan el voto doble: suposición)

User (staff) id, email, role (admin | editor | redactor)
             evidencia: panel NoticeCAT A01–A02
             confianza: suposición (roles)

Edition      id, name (RD | USA)  — fuera de alcance, ver abajo
```

Relaciones: Section 1-n Section (subsecciones), Section 1-n Article, Author 1-n
Article, Article n-n Tag, Article 1-1 Image (portada), Reader n-n Tag (seguir),
Poll 1-n PollVote.

## Matriz de funcionalidades

Ver `features.csv`. Must: 22, should: 14, could: 10, skip: 7.

## Fuera de alcance (no se puede o no se debe clonar)

- Todo el contenido: notas, fotos, videos, caricaturas, columnas. Es de GDL.
- La marca, el logo y los nombres de productos y columnas (Diario Libre, MiDL,
  Ágora, Noticiero Poteleche, Plaza Libre, Brandstories...).
- La redacción, los columnistas y la audiencia.
- Contenido patrocinado de anunciantes concretos (Grupo Puntacana, etc.). Se
  clona el *tipo* de bloque, no los acuerdos.
- La edición impresa / ePaper: no es software, es un producto de imprenta.
- Edición USA: una segunda edición es un caso multi-edición; para un producto
  vendible se modela como "multi-sitio", más adelante.
- Apps móviles: fuera por decisión de alcance (solo web).
- Servicios como efemérides, cumpleaños, resultados deportivos: dependen de datos
  propios o de terceros con licencia.

## Tamaño

Pantallas 14 públicas + 4 admin, flujos 10, entidades 11.

Partes difíciles:
1. Admin con varios medios (multi-tenant) y roles editoriales: es lo que lo hace
   vendible y no lo tiene la parte pública del original.
2. Publicación programada + caché/invalidación: la nota debe aparecer a la hora
   exacta en portada, sección, tema, última hora y RSS sin que el sitio se caiga
   con tráfico de noticia viral.
3. Editor de texto rico con bloques incrustados (relacionadas, imágenes con
   crédito) e importación de Word/PDF que ya diseñaste.

Tamaño: **M** (unas semanas) para el núcleo lector + admin de un solo medio.
Pasa a **L** con varios medios, seguir temas con avisos, encuestas y anuncios.
