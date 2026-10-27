// Datos de prueba. Dos medios ficticios para probar que uno nunca ve lo del otro.
// Todo el texto está escrito para NoticeCAT; las noticias son inventadas.
import { textToDoc, docToPlain } from "../richtext";
import { readingMinutes, slugify } from "../format";
import type { Article, Author, Image, Organization, Poll, Section, StaffUser, Tag } from "../types";
import photos from "./seed-photos.json";
import { DEFAULT_THEME } from "../theme";

export interface DB {
  version: number;
  organizations: Organization[];
  sections: Section[];
  images: Image[];
  authors: Author[];
  tags: Tag[];
  articles: Article[];
  users: StaffUser[];
  polls: Poll[];
  counters: Record<string, number>; // próximo número de nota por medio
}

export const DB_VERSION = 2;

type SeedArticle = {
  title: string;
  dek: string;
  section: string; // "economia/vivienda" o "opinion"
  author: string;
  place?: string;
  tags: string[];
  body: string;
  hoursAgo: number;
  cover?: number;
  featured?: boolean;
  sponsored?: boolean;
  status?: Article["status"];
};

export function buildSeed(now = new Date()): DB {
  const db: DB = {
    version: DB_VERSION,
    organizations: [],
    sections: [],
    images: [],
    authors: [],
    tags: [],
    articles: [],
    users: [],
    polls: [],
    counters: {},
  };
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000).toISOString();

  // ------------------------------------------------------------ medio 1
  const gaceta: Organization = {
    id: "org-gaceta",
    name: "CatCoding",
    slug: "gaceta",
    tagline: "Noticias con calma, contadas con cuidado.",
    timezone: "America/Santo_Domingo",
    locale: "es-DO",
    hosts: ["localhost:3000", "127.0.0.1:3000", "gaceta.noticecat.app"],
    social: { instagram: "https://instagram.com/", facebook: "https://facebook.com/", x: "https://x.com/", youtube: "https://youtube.com/" },
    theme: { ...DEFAULT_THEME, accent: "#5A3D82", paper: "lila", showName: false },
    logo: { src: "/brand/catcoding.png", width: 710, height: 255 },
    contact: { about: "Periódico digital del valle. Contamos lo que pasa cerca, con calma y con datos.", email: "redaccion@gaceta.test", phone: "+1 809 555 0100", address: "Calle del Sol 12, La Vega" },
  };
  db.organizations.push(gaceta);
  db.counters[gaceta.id] = 1001;

  const sectionTree: [string, string[]][] = [
    ["País", ["Ciudad", "Educación", "Salud", "Justicia"]],
    ["Política", []],
    ["Economía", ["Vivienda", "Empleo", "Turismo"]],
    ["Mundo", []],
    ["Cultura", ["Música", "Cine", "Libros"]],
    ["Deportes", ["Béisbol", "Fútbol", "Baloncesto"]],
    ["Ciencia", []],
    ["Opinión", []],
  ];
  sectionTree.forEach(([name, children], i) => {
    const parent: Section = {
      id: `sec-${slugify(name)}`,
      orgId: gaceta.id,
      parentId: null,
      name,
      slug: slugify(name),
      position: i,
      inMenu: true,
      rssEnabled: true,
    };
    db.sections.push(parent);
    children.forEach((child, j) =>
      db.sections.push({
        id: `sec-${slugify(name)}-${slugify(child)}`,
        orgId: gaceta.id,
        parentId: parent.id,
        name: child,
        slug: slugify(child),
        position: j,
        inMenu: true,
        rssEnabled: false,
      }),
    );
  });
  const sectionId = (path: string) => `sec-${path.replace("/", "-")}`;

  // Fotos reales de Wikimedia Commons con licencia libre (CC0, CC BY, CC BY-SA);
  // autor y licencia van en el crédito. Las 17 y 18 son del segundo medio.
  for (const ph of photos) {
    if (ph.n === 17 || ph.n === 18) continue;
    db.images.push({ id: `img-cover-${ph.n}`, orgId: gaceta.id, src: `/seed/${ph.file}`, alt: ph.alt, caption: ph.caption, credit: ph.credit, width: ph.width, height: ph.height });
  }
  for (let i = 1; i <= 8; i++) {
    db.images.push({
      id: `img-person-${i}`,
      orgId: gaceta.id,
      src: `/seed/person-${String(i).padStart(2, "0")}.svg`,
      alt: "",
      caption: null,
      credit: null,
      width: 240,
      height: 240,
    });
  }

  const authors: [string, string, boolean, string | null][] = [
    ["Laura Méndez", "Periodista de economía. Cubre vivienda, transporte y empleo.", false, null],
    ["Andrés Peralta", "Reportero de la sección País. Escribe sobre educación y salud pública.", false, null],
    ["Carmen Ruiz Tavárez", "Editora de Cultura. Antes, crítica de cine durante diez años.", false, null],
    ["Julio Espaillat", "Periodista deportivo. Ha cubierto seis series del Caribe.", false, null],
    ["Mariela Soto", "Corresponsal de ciencia y medioambiente.", false, null],
    ["Rosa Valdez", "Urbanista y profesora universitaria.", true, "La ciudad que caminamos"],
    ["Tomás Herrera Lugo", "Economista. Escribe cada domingo sobre finanzas personales.", true, "Cuentas claras"],
  ];
  authors.forEach(([name, bio, isColumnist, columnName], i) =>
    db.authors.push({
      id: `aut-${slugify(name)}`,
      orgId: gaceta.id,
      name,
      slug: slugify(name),
      bio,
      photoImageId: i < 6 ? `img-person-${i + 1}` : null, // el último sin foto: prueba de iniciales
      isColumnist,
      columnName,
    }),
  );
  const authorId = (name: string) => `aut-${slugify(name)}`;

  const topics = ["Vivienda", "Transporte", "Puertos", "Educación", "Salud pública", "Lluvias", "Béisbol invernal", "Cine dominicano", "Empleo", "Energía", "Turismo", "Inteligencia artificial", "Agua potable", "Presupuesto"];
  const places = ["Santo Domingo", "Santiago", "La Romana", "Puerto Plata", "San Pedro de Macorís"];
  for (const name of topics) db.tags.push({ id: `tag-${slugify(name)}`, orgId: gaceta.id, name, slug: slugify(name), kind: "topic" });
  for (const name of places) db.tags.push({ id: `tag-${slugify(name)}`, orgId: gaceta.id, name, slug: slugify(name), kind: "place" });
  const tagId = (name: string) => `tag-${slugify(name)}`;

  const seedArticles: SeedArticle[] = [
    {
      title: "El puerto amplía su terminal y promete reducir a la mitad la espera de los contenedores",
      dek: "La obra, financiada en tres etapas, empieza en enero y debería estar lista antes de la temporada alta de 2028.",
      section: "economia",
      author: "Laura Méndez",
      place: "Santo Domingo",
      tags: ["Puertos", "Transporte", "Empleo"],
      hoursAgo: 0.2,
      cover: 1,
      featured: true,
      body: `La autoridad portuaria presentó este sábado el plan para ampliar la terminal de carga en **420 metros de muelle**, una obra que, según sus cálculos, bajará de seis a tres días el tiempo medio que un contenedor pasa en el puerto.

El proyecto se hará en tres etapas. La primera, que arranca en enero, incluye el dragado del canal y dos grúas nuevas. Las otras dos dependen de que se cierre el financiamiento con la banca local antes de junio.

## Qué cambia para los importadores

Los gremios de importadores llevan años quejándose de las demoras. Con la obra terminada, la terminal podría recibir dos buques grandes a la vez en lugar de uno.

- Muelle nuevo: 420 metros.
- Grúas: de 4 a 7.
- Espera media estimada: de 6 a 3 días.

> Si el cronograma se cumple, la próxima temporada alta será la primera sin filas de camiones en la avenida.

[[nota:related-1]]

Los vecinos de la zona, por su parte, piden que el plan incluya una vía de acceso separada para los camiones. La autoridad dijo que ese tramo se discutirá en una consulta pública en noviembre.`,
    },
    {
      title: "Abren la inscripción para las becas de verano en ciencias para estudiantes de secundaria",
      dek: "Hay 300 plazas. El plazo cierra el 15 de noviembre y la selección se hace por sorteo entre los que cumplen los requisitos.",
      section: "pais/educacion",
      author: "Andrés Peralta",
      place: "Santiago",
      tags: ["Educación", "Inteligencia artificial"],
      hoursAgo: 0.75,
      cover: 2,
      body: `El programa, que va por su cuarta edición, ofrece tres semanas de talleres de biología, robótica y programación en laboratorios universitarios.

Pueden aplicar estudiantes de cuarto a sexto de secundaria de escuelas públicas y privadas. La inscripción es en línea y no requiere carta de recomendación.

Este año se suma un módulo de introducción a la inteligencia artificial, con énfasis en cómo comprobar si una respuesta generada por una máquina es correcta.`,
    },
    {
      title: "Las lluvias del fin de semana dejan sin agua potable a doce barrios del norte de la ciudad",
      dek: "La empresa de aguas dice que el servicio volverá de forma gradual a partir del lunes por la tarde.",
      section: "pais/ciudad",
      author: "Andrés Peralta",
      place: "Santo Domingo",
      tags: ["Lluvias", "Agua potable"],
      hoursAgo: 1.5,
      cover: 3,
      body: `Las fuertes lluvias del sábado arrastraron sedimentos hasta la planta de tratamiento, que tuvo que detener el bombeo durante la noche.

Mientras tanto, la empresa enviará camiones cisterna a los puntos de mayor demanda. La lista de horarios se publica cada mañana en sus redes.

Los vecinos de los sectores afectados denunciaron que los camiones no llegaron a las calles más altas.`,
    },
    {
      title: "El Congreso aprueba en primera lectura el presupuesto del próximo año",
      dek: "El proyecto sube el gasto en salud y recorta la partida de publicidad oficial. La segunda lectura será el martes.",
      section: "politica",
      author: "Andrés Peralta",
      place: "Santo Domingo",
      tags: ["Presupuesto"],
      hoursAgo: 2.2,
      cover: 4,
      body: `La votación terminó pasada la medianoche, con el apoyo de tres bloques y la abstención de uno.

Entre los cambios introducidos en comisión está un aumento de la partida para atención primaria y la creación de un fondo para el mantenimiento de escuelas.

La oposición pidió que se publique el detalle de cada partida antes de la segunda lectura.`,
    },
    {
      title: "Alquilar un apartamento de dos habitaciones cuesta un 18 % más que hace un año",
      dek: "Un estudio de una asociación de corredores muestra que las subidas más fuertes se dan cerca de las universidades.",
      section: "economia/vivienda",
      author: "Laura Méndez",
      place: "Santiago",
      tags: ["Vivienda"],
      hoursAgo: 3,
      cover: 5,
      body: `El informe compara los precios publicados en el último trimestre con los del mismo periodo del año pasado.

Las zonas más cercanas a los campus universitarios registran subidas de hasta un 25 %, empujadas por la demanda de estudiantes del interior.

Los corredores recomiendan negociar contratos de dos años para fijar el precio.`,
    },
    {
      title: "Las Águilas ganan en extrainning y se ponen a un juego del primer lugar",
      dek: "Un doble en la undécima entrada decidió un partido que duró casi cinco horas.",
      section: "deportes/beisbol",
      author: "Julio Espaillat",
      place: "Santiago",
      tags: ["Béisbol invernal"],
      hoursAgo: 4,
      cover: 6,
      body: `El estadio estuvo lleno hasta el final, pese a la llovizna que obligó a parar el juego dos veces.

El abridor lanzó seis entradas sin permitir carreras, pero el bullpen dejó escapar la ventaja en la novena.

El equipo vuelve a jugar el martes en casa.`,
    },
    {
      title: "Un festival de cortometrajes llevará cine gratis a quince plazas del país",
      dek: "Las proyecciones serán al aire libre, de jueves a domingo, durante todo noviembre.",
      section: "cultura/cine",
      author: "Carmen Ruiz Tavárez",
      place: "Puerto Plata",
      tags: ["Cine dominicano"],
      hoursAgo: 5,
      cover: 7,
      body: `La selección incluye 40 cortos, la mitad de directores menores de 30 años.

Cada función termina con una conversación con parte del equipo de la película.

El programa completo está disponible en la web del festival.`,
    },
    {
      title: "Investigadores registran por primera vez una colonia de corales resistentes al calor en la costa este",
      dek: "El hallazgo podría servir para restaurar arrecifes dañados por el blanqueamiento.",
      section: "ciencia",
      author: "Mariela Soto",
      place: "La Romana",
      tags: ["Turismo"],
      hoursAgo: 6,
      cover: 8,
      body: `El equipo midió temperaturas de hasta 31 grados en la zona sin señales de blanqueamiento en la colonia.

Ahora tomarán fragmentos para cultivarlos en viveros y comprobar si la resistencia se mantiene.

El estudio se publicará en una revista científica a principios del próximo año.`,
    },
    {
      title: "Una caminata de quince minutos no debería ser una hazaña",
      dek: "Las aceras dicen mucho de quién importa en una ciudad.",
      section: "opinion",
      author: "Rosa Valdez",
      tags: ["Transporte"],
      hoursAgo: 7,
      body: `Hagan la prueba: salgan a pie a la farmacia más cercana y cuenten cuántas veces tienen que bajar a la calle.

Una ciudad que se puede caminar no es un lujo. Es la forma más barata de transporte público que existe.

Empezar es sencillo: aceras continuas, sombra y cruces seguros cerca de las escuelas.`,
    },
    {
      title: "Ahorrar el 10 % del sueldo no es una regla, es un punto de partida",
      dek: "Lo importante no es el porcentaje, sino que el ahorro salga antes que el gasto.",
      section: "opinion",
      author: "Tomás Herrera Lugo",
      tags: ["Empleo"],
      hoursAgo: 26,
      body: `Cada vez que alguien me pregunta cuánto debería ahorrar, respondo con otra pregunta: ¿cuándo ahorra usted?

Si el ahorro es lo que sobra a fin de mes, casi nunca sobra nada.

La solución es automática: una transferencia programada el mismo día que entra el sueldo.`,
    },
    {
      title: "El hospital regional abre una unidad de diálisis con capacidad para 60 pacientes",
      dek: "Los pacientes de la zona ya no tendrán que viajar a la capital tres veces por semana.",
      section: "pais/salud",
      author: "Andrés Peralta",
      place: "San Pedro de Macorís",
      tags: ["Salud pública"],
      hoursAgo: 9,
      cover: 9,
      body: `La unidad cuenta con 20 máquinas y funcionará en tres turnos.

Las familias de los pacientes celebraron la apertura, que llevaba dos años de retraso.

El hospital busca ahora contratar más personal de enfermería especializado.`,
    },
    {
      title: "La ocupación hotelera de octubre supera la de antes de la pandemia",
      dek: "El turismo de cruceros y los vuelos nuevos desde Sudamérica explican buena parte de la subida.",
      section: "economia/turismo",
      author: "Laura Méndez",
      place: "Puerto Plata",
      tags: ["Turismo"],
      hoursAgo: 11,
      cover: 10,
      body: `Los hoteles del norte reportan una ocupación media del 78 %, cinco puntos más que en octubre de 2019.

Las asociaciones del sector piden mejorar la carretera de acceso a los puertos de cruceros.

Para diciembre se esperan cifras aún mayores.`,
    },
    {
      title: "Cientos de jóvenes hacen fila para la feria de empleo tecnológico",
      dek: "Treinta empresas ofrecieron más de 800 puestos, la mayoría para trabajo remoto.",
      section: "economia/empleo",
      author: "Laura Méndez",
      place: "Santo Domingo",
      tags: ["Empleo", "Inteligencia artificial"],
      hoursAgo: 14,
      cover: 11,
      body: `La fila empezó a formarse antes del amanecer frente al centro de convenciones.

Los puestos más buscados fueron los de soporte técnico y desarrollo web.

Los organizadores repetirán la feria en Santiago en febrero.`,
    },
    {
      title: "La selección de fútbol cae ante su rival regional pero se mantiene en zona de clasificación",
      dek: "Un gol en el último minuto dejó el marcador 2 a 1.",
      section: "deportes/futbol",
      author: "Julio Espaillat",
      tags: [],
      hoursAgo: 20,
      cover: 12,
      body: `El equipo jugó con diez desde el minuto 60 tras una expulsión.

El técnico defendió el planteamiento y pidió paciencia a la afición.

El próximo partido será en casa dentro de tres semanas.`,
    },
    {
      title: "Las tarifas eléctricas no subirán en el primer trimestre",
      dek: "El regulador congela los precios mientras revisa el costo de generación.",
      section: "economia",
      author: "Laura Méndez",
      tags: ["Energía"],
      hoursAgo: 30,
      cover: 13,
      body: `La decisión se aplica a los hogares que consumen menos de 700 kilovatios hora al mes.

Los grandes consumidores sí verán un ajuste a partir de febrero.

El regulador publicará el estudio de costos en diciembre.`,
    },
    {
      title: "Un libro reúne cien años de fotografía de la vida cotidiana en el Cibao",
      dek: "Muchas de las imágenes fueron donadas por familias y nunca se habían publicado.",
      section: "cultura/libros",
      author: "Carmen Ruiz Tavárez",
      place: "Santiago",
      tags: [],
      hoursAgo: 48,
      cover: 14,
      body: `El volumen tiene 320 páginas y se presentará en la feria del libro.

Las fotografías muestran mercados, bodas, escuelas y fiestas patronales.

Los autores siguen recibiendo imágenes para una segunda edición.`,
    },
    {
      title: "La ONU advierte de una temporada de sequía más larga en el Caribe",
      dek: "El informe recomienda a los gobiernos invertir ya en almacenamiento de agua.",
      section: "mundo",
      author: "Mariela Soto",
      tags: ["Agua potable"],
      hoursAgo: 50,
      cover: 15,
      body: `El documento analiza datos de lluvia de los últimos 40 años.

Las islas más pequeñas son las más expuestas, según los autores.

Los ministros de la región se reunirán en enero para discutirlo.`,
    },
    {
      title: "Cinco rutas para un fin de semana en la montaña",
      dek: "Senderos para todos los niveles, a menos de tres horas de la capital.",
      section: "cultura",
      author: "Carmen Ruiz Tavárez",
      tags: ["Turismo"],
      hoursAgo: 52,
      cover: 16,
      sponsored: true,
      body: `Este contenido es patrocinado por una asociación de turismo de montaña.

Las rutas van desde paseos de una hora hasta travesías de dos días.

Lleve agua, protector solar y avise siempre a alguien de su recorrido.`,
    },
    {
      title: "El equipo de baloncesto juvenil gana el torneo regional sin perder un partido",
      dek: "La final terminó 78 a 64 ante un pabellón lleno.",
      section: "deportes/baloncesto",
      author: "Julio Espaillat",
      tags: [],
      hoursAgo: 72,
      body: `Es el primer título regional del equipo en once años.

El base del equipo fue elegido el mejor jugador del torneo.

El equipo viajará al campeonato del Caribe en marzo.`,
    },
    {
      title: "Este título tiene sesenta caracteres justos para probar diseño",
      dek: "Una nota de prueba con un titular de 60 caracteres y sin foto de portada.",
      section: "ciencia",
      author: "Mariela Soto",
      tags: [],
      hoursAgo: 96,
      body: `Sirve para comprobar que las tarjetas sin foto y los titulares largos se ven bien.`,
    },
    {
      title: "Comienza el horario de clases extendido en 200 escuelas más",
      dek: "La jornada pasa a terminar a las cuatro de la tarde e incluye almuerzo.",
      section: "pais/educacion",
      author: "Andrés Peralta",
      tags: ["Educación"],
      hoursAgo: -6, // programada: sale sola dentro de 6 horas
      cover: 19,
      status: "scheduled",
      body: `Nota programada para dentro de seis horas.`,
    },
    {
      title: "Borrador: entrevista con la nueva directora del museo",
      dek: "",
      section: "cultura",
      author: "Carmen Ruiz Tavárez",
      tags: [],
      hoursAgo: 1,
      cover: 20,
      status: "draft",
      body: `Pendiente de transcribir.`,
    },
  ];

  seedArticles.forEach((s, i) => {
    const doc = textToDoc(s.body);
    const plain = docToPlain(doc);
    const status = s.status ?? "published";
    db.articles.push({
      id: i === 1 ? "related-1" : `art-${i + 1}`,
      orgId: gaceta.id,
      number: db.counters[gaceta.id]++,
      slug: slugify(s.title),
      title: s.title,
      dek: s.dek || null,
      body: doc,
      bodyText: plain,
      readingMinutes: readingMinutes(plain),
      sectionId: sectionId(s.section),
      authorId: authorId(s.author),
      placeTagId: s.place ? tagId(s.place) : null,
      coverImageId: s.cover ? `img-cover-${s.cover}` : null,
      tagIds: s.tags.map(tagId),
      status,
      publishedAt: status === "draft" ? null : at(s.hoursAgo),
      isSponsored: !!s.sponsored,
      isFeatured: !!s.featured,
      createdBy: "user-editora",
      createdAt: at(Math.max(s.hoursAgo, 0) + 1),
      updatedAt: at(Math.max(s.hoursAgo, 0)),
    });
  });

  db.polls.push({
    id: "poll-1",
    orgId: gaceta.id,
    question: "¿Usas el transporte público al menos tres veces por semana?",
    options: [
      { id: "si", label: "Sí", votes: 412 },
      { id: "no", label: "No", votes: 251 },
    ],
    startsAt: at(48),
    endsAt: null,
  });

  // ------------------------------------------------------------ medio 2 (aislamiento)
  const costa: Organization = {
    id: "org-costa",
    name: "Diario Costa Norte",
    slug: "costa",
    tagline: "Lo que pasa en la costa.",
    timezone: "America/Santo_Domingo",
    locale: "es-DO",
    hosts: ["costa.localhost:3000", "costa.noticecat.app"],
    social: {},
    // otro aspecto para ver que cada medio tiene el suyo
    theme: { accent: "#0E7490", paper: "blanco", fonts: "moderno", corners: "rectas", showName: true },
    logo: null,
    contact: { email: "hola@costa.test" },
  };
  db.organizations.push(costa);
  db.counters[costa.id] = 1;
  db.sections.push(
    { id: "costa-sec-local", orgId: costa.id, parentId: null, name: "Local", slug: "local", position: 0, inMenu: true, rssEnabled: true },
    { id: "costa-sec-playas", orgId: costa.id, parentId: null, name: "Playas", slug: "playas", position: 1, inMenu: true, rssEnabled: true },
  );
  db.authors.push({ id: "costa-aut-1", orgId: costa.id, name: "Redacción Costa", slug: "redaccion", bio: null, photoImageId: null, isColumnist: false, columnName: null });
  for (const ph of photos.filter((p) => p.n === 17 || p.n === 18))
    db.images.push({ id: `img-cover-${ph.n}`, orgId: costa.id, src: `/seed/${ph.file}`, alt: ph.alt, caption: ph.caption, credit: ph.credit, width: ph.width, height: ph.height });
  for (const [title, sec, h, cover] of [
    ["El malecón estrena iluminación nueva", "costa-sec-local", 2, 17],
    ["Bandera verde en todas las playas este fin de semana", "costa-sec-playas", 5, 18],
  ] as const) {
    const doc = textToDoc("Nota de prueba del segundo medio. No debe aparecer en CatCoding.");
    db.articles.push({
      id: `costa-${slugify(title)}`,
      orgId: costa.id,
      number: db.counters[costa.id]++,
      slug: slugify(title),
      title,
      dek: null,
      body: doc,
      bodyText: docToPlain(doc),
      readingMinutes: 1,
      sectionId: sec,
      authorId: "costa-aut-1",
      placeTagId: null,
      coverImageId: `img-cover-${cover}`,
      tagIds: [],
      status: "published",
      publishedAt: at(h),
      isSponsored: false,
      isFeatured: false,
      createdBy: null,
      createdAt: at(h),
      updatedAt: at(h),
    });
  }

  // ------------------------------------------------------------ personal
  db.users.push(
    { id: "user-editora", email: "editora@gaceta.test", name: "Editora de turno", memberships: [{ orgId: gaceta.id, role: "editor" }] },
    { id: "user-redactor", email: "redactor@gaceta.test", name: "Redactor", memberships: [{ orgId: gaceta.id, role: "writer" }] },
    { id: "user-costa", email: "admin@costa.test", name: "Admin Costa", memberships: [{ orgId: costa.id, role: "owner" }] },
  );

  return db;
}
