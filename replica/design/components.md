# Componentes de NoticeCAT

Valores en tokens (`tokens.json` / `tokens.css`), nunca hex ni px sueltos.
Iconos: Lucide (licencia ISC), 16 px en texto de interfaz, 18 px en barras, trazo 1.75.
Tipografías: Playfair Display, Source Serif 4 e Inter, las tres con licencia OFL (Google Fonts).
Estética: editorial, filetes de periódico en lugar de sombras, esquinas casi rectas
(`radius xs`), versalitas espaciadas (`eyebrow`) para etiquetas.

Reglas para todos:
- Foco visible: anillo de 2 px `focus` con 2 px de separación (`outline-offset`), solo en `:focus-visible`.
- Área táctil mínima: 44×44 px en móvil (el icono puede ser más chico, el botón no).
- `prefers-reduced-motion`: sin transiciones ni carrusel automático.
- Los textos de ejemplo son de NoticeCAT. Nada copiado de Diario Libre.

---

## Básicos

```
Button
  variants  primary (bg accent, text on-accent), secondary (border border, text text, bg raised),
            ghost (sin borde, text accent), danger (bg danger, text raised)
  sizes     sm 32px (ui-sm), md 40px (ui/600), lg 48px (ui/600)
  states    default, hover (primary -> accent-hover; secondary -> bg surface), active,
            focus-visible, disabled (opacidad 50%, cursor not-allowed), loading (spinner 16px + texto)
  tokens    radius xs, padding x 16px (md), gap 8px con icono
  a11y      <button> real (o <a> si navega), loading pone aria-busy y mantiene el texto,
            solo-icono lleva aria-label
  used on   S08, S09, S13, A01–A04

IconButton
  variants  ghost, secondary
  sizes     32px escritorio, 44px móvil
  states    default, hover (bg surface), focus-visible, pressed (aria-pressed), disabled
  a11y      aria-label obligatorio
  used on   header (menú, buscar, cuenta), ShareBar, Carousel

Input / Textarea / Select
  anatomy   label (ui-sm/600, text) arriba, campo, ayuda o error (caption) abajo
  size      40px de alto, padding 11px 12px, radius xs
  tokens    bg raised, borde 1px border-input, texto ui text, placeholder text-muted
  states    default, hover, focus-visible (borde accent + anillo), filled, disabled (bg surface),
            error (borde danger + mensaje danger con icono), read-only
  a11y      <label for>, error enlazado con aria-describedby y aria-invalid, nunca solo color
  used on   S08, S09, búsqueda, A02, A04

Checkbox / Radio
  size      18px, radius xs (checkbox), full (radio)
  states    off, on (bg accent), indeterminate, focus-visible, disabled
  a11y      input nativo oculto visualmente, label clicable
  used on   S13 (radio), A01 (selección de filas)

Chip de estado
  variants  publicado (success / success-bg), programado (warning / warning-bg),
            borrador (neutral / neutral-bg), error (danger / danger-bg)
  tokens    eyebrow, padding 4px 8px, radius xs, punto de 6px del color
  a11y      el texto dice el estado; el color nunca es lo único
  used on   A01, A02

Tag (tema)
  variants  link (eyebrow accent), pill (bg surface-tint, text text, ui-sm)
  states    default, hover (subrayado), focus-visible, siguiendo (con check)
  used on   S03, S05

Eyebrow / kicker de sección
  tokens    eyebrow, text accent, enlace a la sección
  states    default, hover (subrayado 1px)
  used on   todas las tarjetas, S03

Timestamp
  format    "25 oct. 2026 · 11:25 a. m."; la hora en semibold. Menos de 1 h: "hace 12 min"
  tokens    caption, text-muted
  a11y      <time datetime="ISO">, hora en la zona del medio
  used on   tarjetas, S03, S07

Rule (filete)
  variants  thin (1px border), thick (2px text) para encabezados de bloque, double (1px + 3px gap + 1px)
  used on   S01 bloques, S03 cuerpo, pie

Avatar
  sizes     24, 32, 48, 96 px, radius full
  states    con foto, sin foto (iniciales sobre surface-tint, text accent)
  a11y      alt con el nombre; decorativo (alt="") si el nombre está al lado
  used on   firma S03, S04, columnistas S01, A01

Spinner / Skeleton
  skeleton  bloques bg surface con brillo suave; misma forma que la tarjeta que reemplaza
  a11y      contenedor con aria-busy; skeleton aria-hidden
  used on   cargar más, A03, A02 autoguardado

Toast
  variants  info, success, error
  tokens    bg inverse, text on-inverse, radius sm, shadow pop
  states    entra, visible 5 s (error: hasta cerrar), sale
  a11y      role="status" (error: role="alert"), no roba foco
  used on   A02 (guardado / publicado), S03 (enlace copiado), S13

Modal
  tokens    bg raised, radius sm, shadow pop, padding 28px, fondo scrim al 60%
  states    abriendo, abierto, cerrando
  a11y      <dialog> o Radix Dialog: foco atrapado, Esc cierra, foco vuelve al disparador
  used on   A03, foto ampliada S03

---

## Navegación

```
Header
  desktop   fila 1: logo del medio, fecha del día, buscar, cuenta;
            fila 2: secciones principales (ui/600, eyebrow opcional) con filete abajo
  mobile    logo + IconButton menú + buscar; 56px de alto, pegajoso al hacer scroll
  states    normal, con sesión (avatar), menú abierto, sección actual marcada (aria-current="page")
  tokens    bg bg, filete thin border, contenido max-w content
  used on   todas las públicas

MegaMenu
  desktop   panel bajo la sección con sus subsecciones en columnas; abre con clic o Enter,
            hover con 150ms de retardo
  mobile    cajón a pantalla completa, secciones en acordeón
  states    cerrado, abierto, subsección actual
  a11y      botón con aria-expanded, Esc cierra, Tab recorre los enlaces, foco vuelve al botón
  used on   Header

Breadcrumb
  tokens    caption, text-muted, separador "/" , último elemento text
  a11y      <nav aria-label="Ruta">, aria-current en el último
  used on   S03, S02 (subsección)

LoadMore
  states    listo ("Ver más notas"), cargando (spinner), fin ("No hay más notas"), error (reintentar)
  a11y      botón real; las tarjetas nuevas se anuncian en una región aria-live; el foco pasa
            a la primera tarjeta nueva
  used on   S02, S04, S05, S07

Footer
  tokens    bg inverse, text on-inverse, enlaces on-inverse-muted, filetes inverse-border
  blocks    secciones en columnas, archivo por año, redes, RSS, legal, "Hecho con NoticeCAT"
  mobile    columnas en acordeón
  used on   todas las públicas

AdminSidebar
  tokens    240px, bg inverse, ítems ui on-inverse-muted con icono 18px, activo bg inverse-surface + text on-inverse
  states    default, hover, activo, colapsada (64px, solo iconos con tooltip)
  used on   A01–A04
```

---

## Noticias

```
StoryCard
  variants  lead (foto 16:9 a ancho completo, hero o headline, dek, firma),
            standard (foto 3:2 arriba, title, timestamp),
            row (miniatura 3:2 de 110px a la izquierda, title-sm, kicker, timestamp),
            compact (solo kicker + title-sm + timestamp, sin foto),
            opinion (avatar 48px, nombre del columnista, title-sm en cursiva),
            video (como standard con insignia ▶ y duración)
  states    default, hover (titular subrayado 1px, foto sin zoom), focus-visible (todo el bloque),
            sin foto (row/standard pasan a compact), titular largo (clamp a 3 líneas en row),
            patrocinado (eyebrow "Patrocinado" en neutral)
  a11y      un solo enlace por tarjeta en el titular, con el área clicable extendida a toda la
            tarjeta (::after); la imagen es decorativa si no aporta (alt="")
  tokens    gap 12px, filete thin entre rows
  used on   S01, S02, S04–S07

SectionBlock
  anatomy   encabezado (heading + filete thick + enlace "Ver todo" a la derecha), 1 lead + 4 rows,
            o grilla de 3 standard
  states    lleno, menos de 3 notas (se oculta), cargando (skeleton)
  used on   S01

Figure
  anatomy   imagen, pie (caption text-muted) y crédito (eyebrow text-muted) en la misma línea
  states    cargando (bg surface con proporción fija, sin salto), cargada, error (bg surface + icono),
            ampliable (IconButton expandir abre Modal)
  a11y      <figure>/<figcaption>, alt distinto del pie
  used on   S03, cuerpo de nota

Byline
  anatomy   avatar 32px, nombre (ui/600, enlace al autor), lugar (Tag link), Timestamp,
            "4 min de lectura"
  states    con autor, sin autor ("Redacción"), varios autores
  used on   S03

ShareBar
  items     WhatsApp, Facebook, X, Telegram, correo, copiar enlace; en móvil un botón "Compartir"
            con Web Share API y la lista como respaldo
  states    default, copiado (toast)
  a11y      cada IconButton con aria-label "Compartir en WhatsApp"
  used on   S03 (arriba y al final)

ArticleBody
  tokens    body (serif 17/30), ancho max article (760px), párrafos con 24px entre sí,
            H2 title (display 22/30), listas con viñeta accent, negritas 600
  blocks    párrafo, H2, H3, lista, cita destacada (title en cursiva display + filete izquierdo accent),
            Figure, RelatedInline, embed (video), separador
  used on   S03

RelatedInline ("Lee además")
  anatomy   filetes thin arriba y abajo, eyebrow "Lee además" accent, titular title-sm enlazado
  used on   S03 cuerpo

TopicList
  anatomy   eyebrow "Temas", Tags pill con botón seguir
  used on   S03

FollowButton
  states    no sigue ("Seguir +"), sigue ("Siguiendo ✓", hover "Dejar de seguir"), cargando,
            sin sesión (abre login y vuelve)
  a11y      aria-pressed
  used on   S03, S05

AuthorBox
  anatomy   avatar 96px (S04) o 48px (S03), nombre heading, bio body-sm, columna si es columnista
  states    con bio, sin bio, sin foto
  used on   S03 final, S04 cabecera

PageHeader (listados)
  anatomy   eyebrow (tipo: "Sección", "Tema", "Autor", "Archivo"), heading-lg, descripción opcional,
            subsecciones como Tabs con scroll horizontal en móvil
  states    con subsecciones, sin ellas
  used on   S02, S04–S07

EmptyState
  anatomy   icono Lucide 32px text-muted, título title-sm, texto ui text-muted, acción opcional
  textos    "Todavía no hay notas en esta sección." / "No encontramos notas para «…»."
  used on   S02, S04–S06, búsqueda, A01

Poll
  states    sin votar (radios + botón Votar), enviando, votado (barras con % en accent,
            opción elegida marcada), cerrada (solo resultados), error
  a11y      <fieldset>/<legend>, barras con texto del %
  used on   S13 (bloque en S01)

AdSlot
  anatomy   eyebrow "Publicidad" text-muted centrado, caja de tamaño fijo (sin saltos de layout)
  states    vacío (se colapsa sin dejar hueco), lleno
  used on   S01, S03

Carousel
  anatomy   scroll horizontal con snap, IconButtons anterior/siguiente en escritorio
  states    al inicio (anterior deshabilitado), al final, sin desborde (sin flechas)
  a11y      región con aria-label, flechas con aria-controls, sin auto-avance
  used on   S01 bloque cultura
```

---

## Panel

```
StatCard
  anatomy   eyebrow etiqueta, número heading, variación caption (success o danger + flecha)
  tokens    bg raised, borde border, radius xs, padding 20px
  used on   A01

DataTable
  anatomy   cabecera eyebrow text-muted, filas ui con filete thin, columna título en title-sm,
            chip de estado, acciones al final
  states    lleno, cargando (skeleton de filas), vacío (EmptyState), fila hover (bg surface),
            seleccionada, ordenada (aria-sort)
  mobile    filas como tarjetas apiladas
  used on   A01

RichTextEditor (Tiptap)
  anatomy   barra (IconButtons: negrita, cursiva, H2, H3, lista, cita, enlace, imagen,
            "Lee además", deshacer), área con la misma tipografía que ArticleBody
  states    vacío (placeholder), escribiendo, guardando, guardado (hora), error al guardar,
            conflicto ("Otra persona cambió esta nota")
  a11y      barra con role="toolbar" y flechas para moverse, atajos Ctrl+B/I/K
  used on   A02, A04

Dropzone
  states    vacío, arrastrando (borde accent discontinuo, bg surface-tint), subiendo (barra de progreso),
            extrayendo texto, listo, error (tipo no permitido, más de 10 MB, PDF sin texto)
  a11y      también es un botón que abre el selector de archivos
  used on   A03, imagen de portada en A02
```

---

## Movimiento

Corto, de una sola dirección, sin rebotes. Tokens: `fast` 150ms, `base` 250ms,
`slow` 600ms, curva `ease-soft`, desplazamiento 8px. Con "reducir movimiento"
del sistema solo queda el cambio de opacidad, instantáneo.

```
Aparición (data-reveal)   bloques y tarjetas suben 8px y aparecen al entrar en pantalla,
                          escalonados 70ms; lo visible al cargar no se anima (sin parpadeo)
Subrayado (link-grow)     titulares: filete de 1px que crece desde la izquierda, 600ms
Foto (media-zoom)         escala 1.03 al pasar por la tarjeta, 600ms
Menú de secciones         subrayado que se abre desde el centro; panel con fundido de 8px
Barra compacta            escritorio: baja desde arriba al pasar los 260px de scroll
Cajón móvil               se desliza desde la izquierda
Lectura                   filete de 2px arriba que avanza con la nota
Encuesta                  las barras de resultados crecen desde cero
Botones                   bajan 1px al presionarlos
```

## Identidad editorial (distinta del original)

Cabecera de periódico con el nombre centrado entre filetes dobles; secciones en
versalitas; antetítulos en cursiva serif (no etiquetas en mayúsculas); portada
en tres columnas con filetes verticales (breves, principal, lo más reciente
numerado); bloques de sección alternados (foto grande + notas de texto);
artículo centrado con adorno y capitular.
