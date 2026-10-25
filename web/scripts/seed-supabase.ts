// Carga los dos medios de prueba (los mismos de src/lib/data/seed.ts) en Supabase.
//   npm run db:seed            contra el Supabase local (supabase start)
//   npm run db:seed -- --remoto  contra un proyecto en la nube: borra y recrea los datos de prueba
// Usa la service role key de .env.local. Solo datos inventados; ninguna persona real.
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildSeed } from "../src/lib/data/seed";
import type { RichNode } from "../src/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url);
if (!local && !process.argv.includes("--remoto")) {
  console.error(`${url} no es local. Si de verdad quieres sembrar ese proyecto, añade --remoto.`);
  process.exit(1);
}

const password = process.env.SEED_PASSWORD ?? "NoticeCAT-dev-2026";
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// ids del seed ("art-3", "sec-pais") -> uuid estable, para poder re-sembrar sin cambiar URLs
const ids = new Map<string, string>();
function uuid(id: string) {
  let v = ids.get(id);
  if (!v) {
    const h = createHash("sha1").update(`noticecat:${id}`).digest("hex");
    v = `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
    ids.set(id, v);
  }
  return v;
}
const maybe = (id: string | null) => (id ? uuid(id) : null);

function remap(node: RichNode): RichNode {
  if (node.type === "relatedArticle") return { ...node, attrs: { articleId: uuid(node.attrs.articleId) } };
  if ("content" in node && node.content) return { ...node, content: node.content.map(remap) } as RichNode;
  return node;
}

async function run<T>(what: string, p: PromiseLike<{ error: { message: string } | null; data?: T }>) {
  const { error, data } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data as T;
}

async function main() {
  const seed = buildSeed();
  const emails = new Set(seed.users.map((u) => u.email));

  // limpiar lo sembrado antes: medios de prueba (en cascada) y sus usuarios
  await run("borrar medios", db.from("organizations").delete().in("slug", seed.organizations.map((o) => o.slug)));
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email && emails.has(u.email)) await db.auth.admin.deleteUser(u.id);
    if (data.users.length < 200) break;
  }

  // personal: usuarios reales de Supabase Auth, ya confirmados
  const userIds = new Map<string, string>();
  for (const u of seed.users) {
    const { data, error } = await db.auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: { name: u.name } });
    if (error) throw new Error(`usuario ${u.email}: ${error.message}`);
    userIds.set(u.id, data.user.id);
  }

  await run(
    "medios",
    db.from("organizations").insert(
      seed.organizations.map((o) => ({ id: uuid(o.id), name: o.name, slug: o.slug, tagline: o.tagline, timezone: o.timezone, locale: o.locale, settings: { social: o.social } })),
    ),
  );
  await run(
    "dominios",
    db.from("org_domains").insert(
      seed.organizations.flatMap((o) => o.hosts.map((host, i) => ({ org_id: uuid(o.id), host, is_primary: i === 0, verified_at: new Date().toISOString() }))),
    ),
  );
  await run(
    "personal",
    db.from("memberships").insert(seed.users.flatMap((u) => u.memberships.map((m) => ({ org_id: uuid(m.orgId), user_id: userIds.get(u.id)!, role: m.role })))),
  );
  await run(
    "imágenes",
    db.from("images").insert(
      seed.images.map((i) => ({ id: uuid(i.id), org_id: uuid(i.orgId), storage_path: i.src, alt: i.alt, caption: i.caption, credit: i.credit, width: i.width, height: i.height })),
    ),
  );
  // secciones: primero las de arriba, luego las hijas (la fk parent_id lo exige)
  const sectionRow = (s: (typeof seed.sections)[number]) => ({
    id: uuid(s.id),
    org_id: uuid(s.orgId),
    parent_id: maybe(s.parentId),
    name: s.name,
    slug: s.slug,
    position: s.position,
    in_menu: s.inMenu,
    rss_enabled: s.rssEnabled,
  });
  await run("secciones", db.from("sections").insert(seed.sections.filter((s) => !s.parentId).map(sectionRow)));
  await run("subsecciones", db.from("sections").insert(seed.sections.filter((s) => s.parentId).map(sectionRow)));
  await run(
    "autores",
    db.from("authors").insert(
      seed.authors.map((a) => ({
        id: uuid(a.id),
        org_id: uuid(a.orgId),
        name: a.name,
        slug: a.slug,
        bio: a.bio,
        photo_image_id: maybe(a.photoImageId),
        is_columnist: a.isColumnist,
        column_name: a.columnName,
      })),
    ),
  );
  await run("temas", db.from("tags").insert(seed.tags.map((t) => ({ id: uuid(t.id), org_id: uuid(t.orgId), name: t.name, slug: t.slug, kind: t.kind }))));
  await run(
    "notas",
    db.from("articles").insert(
      seed.articles.map((a) => ({
        id: uuid(a.id),
        org_id: uuid(a.orgId),
        number: a.number,
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        body: remap(a.body),
        body_text: a.bodyText,
        reading_minutes: a.readingMinutes,
        section_id: uuid(a.sectionId),
        author_id: maybe(a.authorId),
        place_tag_id: maybe(a.placeTagId),
        cover_image_id: maybe(a.coverImageId),
        status: a.status,
        published_at: a.publishedAt,
        is_sponsored: a.isSponsored,
        is_featured: a.isFeatured,
        created_by: a.createdBy ? (userIds.get(a.createdBy) ?? null) : null,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      })),
    ),
  );
  await run(
    "temas de las notas",
    db.from("article_tags").insert(seed.articles.flatMap((a) => a.tagIds.map((t, position) => ({ article_id: uuid(a.id), tag_id: uuid(t), position })))),
  );
  for (const p of seed.polls) {
    await run("encuesta", db.from("polls").insert({ id: uuid(p.id), org_id: uuid(p.orgId), question: p.question, starts_at: p.startsAt, ends_at: p.endsAt }));
    await run("opciones", db.from("poll_options").insert(p.options.map((o, position) => ({ id: uuid(`${p.id}:${o.id}`), poll_id: uuid(p.id), label: o.label, position }))));
    // votos de ejemplo: anónimos, con un hash que no corresponde a nadie
    const votes = p.options.flatMap((o) => Array.from({ length: o.votes }, (_, n) => ({ poll_id: uuid(p.id), option_id: uuid(`${p.id}:${o.id}`), voter_hash: `seed:${o.id}:${n}` })));
    for (let i = 0; i < votes.length; i += 500) await run("votos", db.from("poll_votes").insert(votes.slice(i, i + 500)));
  }

  console.log(`Listo: ${seed.organizations.length} medios, ${seed.articles.length} notas, ${seed.users.length} usuarios.`);
  console.log(`Usuarios de prueba (contraseña: ${password}):`);
  for (const u of seed.users) console.log(`  ${u.email.padEnd(24)} ${u.memberships.map((m) => `${m.role} en ${seed.organizations.find((o) => o.id === m.orgId)!.slug}`).join(", ")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
