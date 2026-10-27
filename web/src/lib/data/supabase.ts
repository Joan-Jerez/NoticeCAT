import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";
import { publicClient, serviceClient, sessionClient } from "../supabase/server";
import { dayKey, readingMinutes, slugify, zonedLocalToUtc } from "../format";
import { docToPlain } from "../richtext";
import { articlePath, ConflictError, decodeCursor, encodeCursor, ForbiddenError, type ArticleFilter, type ArticleInput, type AuthorView, type ImageUpload, type SectionNode } from "./shared";
import { normalizeTheme } from "../theme";
import type { Article, ArticleStatus, ArticleView, Image, Organization, Page, Poll, RichNode, Role, Section, StaffUser, Tag } from "../types";

// Capa de datos con Supabase. Mismas firmas que fake.ts.
// Las lecturas públicas van con el cliente anónimo: RLS solo deja ver lo
// publicado aunque una consulta olvide el filtro. El panel usa la sesión
// del usuario, así que RLS aplica su rol en cada lectura y escritura.

/* eslint-disable @typescript-eslint/no-explicit-any -- filas de PostgREST sin tipos generados */
type Row = Record<string, any>;

const VISIBLE = ["published", "scheduled"];
const nowIso = () => new Date().toISOString();

function fail(error: { message: string } | null, what: string) {
  if (error) throw new Error(`Supabase (${what}): ${error.message}`);
}

// ------------------------------------------------------------------ mapeo de filas

function toOrg(r: Row): Organization {
  const settings = (r.settings ?? {}) as { social?: Organization["social"]; theme?: unknown; contact?: Organization["contact"] };
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    tagline: r.tagline ?? "",
    timezone: r.timezone,
    locale: r.locale,
    hosts: (r.org_domains ?? []).map((d: Row) => d.host),
    social: settings.social ?? {},
    theme: normalizeTheme(settings.theme),
    logo: r.logo ? { src: imageSrc(r.logo.storage_path), width: r.logo.width ?? 400, height: r.logo.height ?? 100 } : null,
    contact: settings.contact ?? {},
  };
}

function toSection(r: Row): Section {
  return { id: r.id, orgId: r.org_id, parentId: r.parent_id, name: r.name, slug: r.slug, position: r.position, inMenu: r.in_menu, rssEnabled: r.rss_enabled };
}

function imageSrc(path: string) {
  // las imágenes del seed viven en /public; las subidas, en el bucket "media"
  return path.startsWith("/") ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

function toImage(r: Row | null): Image | null {
  if (!r) return null;
  return { id: r.id, orgId: r.org_id, src: imageSrc(r.storage_path), alt: r.alt ?? "", caption: r.caption, credit: r.credit, width: r.width ?? 1200, height: r.height ?? 675 };
}

function toTag(r: Row): Tag {
  return { id: r.id, orgId: r.org_id, name: r.name, slug: r.slug, kind: r.kind };
}

function toAuthor(r: Row): AuthorView {
  return {
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    slug: r.slug,
    bio: r.bio,
    photoImageId: r.photo_image_id,
    isColumnist: r.is_columnist,
    columnName: r.column_name,
    photo: toImage(r.photo ?? null),
  };
}

function toArticle(r: Row): Article {
  const tags = [...(r.article_tags ?? [])].sort((a: Row, b: Row) => a.position - b.position);
  return {
    id: r.id,
    orgId: r.org_id,
    number: Number(r.number),
    slug: r.slug,
    title: r.title,
    dek: r.dek,
    body: r.body as RichNode,
    bodyText: r.body_text,
    readingMinutes: r.reading_minutes,
    sectionId: r.section_id,
    authorId: r.author_id,
    placeTagId: r.place_tag_id,
    coverImageId: r.cover_image_id,
    tagIds: tags.map((t: Row) => t.tag_id ?? t.tag?.id),
    status: r.status,
    publishedAt: r.published_at,
    isSponsored: r.is_sponsored,
    isFeatured: r.is_featured,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Una nota con sus relaciones en una sola consulta.
const ARTICLE_VIEW =
  "*, cover:images!cover_image_id(*), author:authors!author_id(*, photo:images!photo_image_id(*)), place:tags!place_tag_id(*), article_tags(tag_id, position, tag:tags(*))";

async function toViews(orgId: string, rows: Row[]): Promise<ArticleView[]> {
  if (!rows.length) return [];
  const [org, sections] = await Promise.all([getOrgById(orgId), listSections(orgId)]);
  if (!org) return [];
  const byId = new Map(sections.map((s) => [s.id, s]));
  return rows.flatMap((r) => {
    const section = byId.get(r.section_id);
    if (!section) return [];
    const parentSection = section.parentId ? (byId.get(section.parentId) ?? null) : null;
    const a = toArticle(r);
    const tags = [...(r.article_tags ?? [])].sort((x: Row, y: Row) => x.position - y.position).flatMap((t: Row) => (t.tag ? [toTag(t.tag)] : []));
    return [
      {
        ...a,
        section,
        parentSection,
        author: r.author ? toAuthor(r.author) : null,
        place: r.place ? toTag(r.place) : null,
        cover: toImage(r.cover),
        tags,
        url: articlePath(a, section, parentSection, org),
      },
    ];
  });
}

// ------------------------------------------------------------------ medios

const ORG = "*, org_domains(host), logo:images!logo_image_id(storage_path, width, height)";

const getOrgById = cache(async (id: string): Promise<Organization | null> => {
  const { data, error } = await publicClient().from("organizations").select(ORG).eq("id", id).maybeSingle();
  fail(error, "medio");
  return data ? toOrg(data) : null;
});

export const getOrgByHost = cache(async (host: string): Promise<Organization | null> => {
  const { data, error } = await publicClient().from("org_domains").select(`org:organizations(${ORG})`).eq("host", host.toLowerCase()).maybeSingle();
  fail(error, "dominio");
  const org = (data as Row | null)?.org;
  return org ? toOrg(org) : null;
});

export const getOrgBySlug = cache(async (slug: string): Promise<Organization | null> => {
  const { data, error } = await publicClient().from("organizations").select(ORG).eq("slug", slug).maybeSingle();
  fail(error, "medio");
  return data ? toOrg(data) : null;
});

export async function getDefaultOrg(): Promise<Organization> {
  const { data, error } = await publicClient().from("organizations").select(ORG).order("created_at").limit(1).single();
  fail(error, "medio");
  return toOrg(data!);
}

// ------------------------------------------------------------------ secciones

export const listSections = cache(async (orgId: string): Promise<Section[]> => {
  const { data, error } = await publicClient().from("sections").select("*").eq("org_id", orgId).order("position");
  fail(error, "secciones");
  return (data ?? []).map(toSection);
});

export async function getSectionTree(orgId: string): Promise<SectionNode[]> {
  const all = await listSections(orgId);
  return all.filter((s) => !s.parentId).map((s) => ({ ...s, children: all.filter((c) => c.parentId === s.id) }));
}

export async function resolveSection(orgId: string, slugs: string[]): Promise<{ section: Section; parent: Section | null } | null> {
  const all = await listSections(orgId);
  const top = all.find((s) => !s.parentId && s.slug === slugs[0]);
  if (!top) return null;
  if (slugs.length === 1) return { section: top, parent: null };
  const child = all.find((s) => s.parentId === top.id && s.slug === slugs[1]);
  return child && slugs.length === 2 ? { section: child, parent: top } : null;
}

// ------------------------------------------------------------------ notas públicas

function dayRange(day: string, timezone: string) {
  const start = zonedLocalToUtc(`${day}T00:00`, timezone);
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = zonedLocalToUtc(`${next.toISOString().slice(0, 10)}T00:00`, timezone);
  return start && end ? { start, end } : null;
}

// PostgREST: los valores con ":" o "+" van entre comillas dentro de or()
const q = (v: string) => `"${v}"`;

async function pageOf(orgId: string, query: any, limit: number): Promise<Page<ArticleView>> {
  const { data, error } = await query.order("published_at", { ascending: false }).order("number", { ascending: false }).limit(limit + 1);
  fail(error, "notas");
  const rows = (data ?? []) as Row[];
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items: await toViews(orgId, items),
    nextCursor: rows.length > limit && last ? encodeCursor({ publishedAt: last.published_at, number: Number(last.number) }) : null,
  };
}

function visible(orgId: string, select = ARTICLE_VIEW) {
  return publicClient().from("articles").select(select).eq("org_id", orgId).in("status", VISIBLE).lte("published_at", nowIso());
}

function cursorGroup(cursor: string | null | undefined) {
  const c = decodeCursor(cursor);
  return c ? `published_at.lt.${q(c.publishedAt)},and(published_at.eq.${q(c.publishedAt)},number.lt.${c.number})` : null;
}

// Varios grupos "o" se combinan con "y" en un solo parámetro: PostgREST no admite dos or=.
function withOrGroups(query: any, groups: (string | null)[]) {
  const list = groups.filter((g): g is string => !!g);
  if (!list.length) return query;
  return query.or(list.length === 1 ? list[0] : `and(${list.map((g) => `or(${g})`).join(",")})`);
}

export async function listArticles(orgId: string, filter: ArticleFilter = {}, opts: { limit?: number; cursor?: string | null } = {}): Promise<Page<ArticleView>> {
  const org = await getOrgById(orgId);
  if (!org) return { items: [], nextCursor: null };
  const limit = Math.min(opts.limit ?? 20, 100);
  // el filtro puede venir del navegador ("cargar más"): ids mal formados no llegan a la base
  if ([filter.sectionId, filter.authorId, filter.tagId].some((v) => v !== undefined && !isUuid(v))) return { items: [], nextCursor: null };
  // tema o lugar: el tema llega por article_tags (embebido y filtrado), el lugar por place_tag_id
  let query = visible(orgId, filter.tagId ? `${ARTICLE_VIEW}, tagged:article_tags(tag_id)` : ARTICLE_VIEW);
  if (filter.sectionId) {
    const ids = [filter.sectionId, ...(await listSections(orgId)).filter((s) => s.parentId === filter.sectionId).map((s) => s.id)];
    query = query.in("section_id", ids);
  }
  if (filter.authorId) query = query.eq("author_id", filter.authorId);
  if (filter.tagId) {
    query = query.eq("tagged.tag_id", filter.tagId);
  }
  if (filter.featured !== undefined) query = query.eq("is_featured", filter.featured);
  const exclude = filter.excludeIds?.filter(isUuid) ?? [];
  if (exclude.length) query = query.not("id", "in", `(${exclude.join(",")})`);
  if (filter.day) {
    const range = dayRange(filter.day, org.timezone);
    if (!range) return { items: [], nextCursor: null };
    query = query.gte("published_at", range.start).lt("published_at", range.end);
  }
  query = withOrGroups(query, [cursorGroup(opts.cursor), filter.tagId ? `place_tag_id.eq.${filter.tagId},tagged.not.is.null` : null]);
  return pageOf(orgId, query, limit);
}

export async function getArticleByNumber(orgId: string, number: number): Promise<ArticleView | null> {
  if (!Number.isSafeInteger(number)) return null;
  const { data, error } = await visible(orgId).eq("number", number).maybeSingle();
  fail(error, "nota");
  return data ? ((await toViews(orgId, [data]))[0] ?? null) : null;
}

export async function getVisibleArticleById(orgId: string, id: string): Promise<ArticleView | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await visible(orgId).eq("id", id).maybeSingle();
  fail(error, "nota");
  return data ? ((await toViews(orgId, [data]))[0] ?? null) : null;
}

export async function countArticlesByDay(orgId: string, year: number): Promise<Record<string, number>> {
  const org = await getOrgById(orgId);
  if (!org) return {};
  const from = zonedLocalToUtc(`${year}-01-01T00:00`, org.timezone)!;
  const to = zonedLocalToUtc(`${year + 1}-01-01T00:00`, org.timezone)!;
  const out: Record<string, number> = {};
  // por tandas de 1000 (límite de PostgREST); solo la columna de fecha
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await publicClient()
      .from("articles")
      .select("published_at")
      .eq("org_id", orgId)
      .in("status", VISIBLE)
      .gte("published_at", from)
      .lt("published_at", to)
      .lte("published_at", nowIso())
      .order("published_at")
      .range(offset, offset + 999);
    fail(error, "archivo");
    for (const r of data ?? []) {
      const key = dayKey(r.published_at, org.timezone);
      out[key] = (out[key] ?? 0) + 1;
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function searchArticles(orgId: string, text: string, opts: { limit?: number; cursor?: string | null } = {}): Promise<Page<ArticleView>> {
  // el índice guarda el texto sin acentos (f_unaccent); la consulta también
  const query = text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().slice(0, 200);
  if (query.replace(/[^\p{L}\p{N}]/gu, "").length < 2) return { items: [], nextCursor: null };
  return pageOf(orgId, withOrGroups(visible(orgId).textSearch("search", query, { config: "spanish", type: "websearch" }), [cursorGroup(opts.cursor)]), Math.min(opts.limit ?? 20, 50));
}

// ------------------------------------------------------------------ autores, temas, encuestas

export async function getAuthorBySlug(orgId: string, slug: string): Promise<AuthorView | null> {
  const { data, error } = await publicClient().from("authors").select("*, photo:images!photo_image_id(*)").eq("org_id", orgId).eq("slug", slug).maybeSingle();
  fail(error, "autor");
  return data ? toAuthor(data) : null;
}

export async function listAuthors(orgId: string): Promise<AuthorView[]> {
  const { data, error } = await publicClient().from("authors").select("*, photo:images!photo_image_id(*)").eq("org_id", orgId).order("name");
  fail(error, "autores");
  return (data ?? []).map(toAuthor);
}

export async function getTagBySlug(orgId: string, slug: string): Promise<Tag | null> {
  const { data, error } = await publicClient().from("tags").select("*").eq("org_id", orgId).eq("slug", slug).maybeSingle();
  fail(error, "tema");
  return data ? toTag(data) : null;
}

export async function listTags(orgId: string): Promise<Tag[]> {
  const { data, error } = await publicClient().from("tags").select("*").eq("org_id", orgId);
  fail(error, "temas");
  return (data ?? []).map(toTag).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getActivePoll(orgId: string): Promise<Poll | null> {
  const now = nowIso();
  const { data, error } = await publicClient()
    .from("polls")
    .select("*, poll_options(id, label, position)")
    .eq("org_id", orgId)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${q(now)}`)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(error, "encuesta");
  if (!data) return null;
  const options = [...data.poll_options].sort((a: Row, b: Row) => a.position - b.position);
  const { data: results, error: e2 } = await publicClient().from("poll_results").select("option_id, votes").in("option_id", options.map((o: Row) => o.id));
  fail(e2, "resultados");
  const votes = new Map((results ?? []).map((r) => [r.option_id, r.votes as number]));
  return {
    id: data.id,
    orgId: data.org_id,
    question: data.question,
    options: options.map((o: Row) => ({ id: o.id, label: o.label, votes: votes.get(o.id) ?? 0 })),
    startsAt: data.starts_at,
    endsAt: data.ends_at,
  };
}

// voter_hash = hash(encuesta + IP + navegador + sal): el índice único para el voto doble
async function voterHash(pollId: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const salt = process.env.NOTICECAT_HASH_SALT ?? "";
  return createHash("sha256").update(`${pollId}|${ip}|${h.get("user-agent") ?? ""}|${salt}`).digest("hex");
}

export async function votePoll(orgId: string, pollId: string, optionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(pollId) || !isUuid(optionId)) return { ok: false, error: "Esa opción no existe." };
  const db = serviceClient();
  const { data: poll, error } = await db.from("polls").select("id, org_id, starts_at, ends_at, requires_login, poll_options(id)").eq("id", pollId).eq("org_id", orgId).maybeSingle();
  fail(error, "encuesta");
  if (!poll || !poll.poll_options.some((o: Row) => o.id === optionId)) return { ok: false, error: "Esa opción no existe." };
  const now = Date.now();
  if (new Date(poll.starts_at).getTime() > now || (poll.ends_at && new Date(poll.ends_at).getTime() <= now)) return { ok: false, error: "La encuesta está cerrada." };
  if (poll.requires_login) return { ok: false, error: "Entra con tu cuenta para votar." };
  const { error: insertError } = await db.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, voter_hash: await voterHash(pollId) });
  if (insertError?.code === "23505") return { ok: false, error: "Ya votaste en esta encuesta." };
  fail(insertError, "voto");
  return { ok: true };
}

// ------------------------------------------------------------------ panel (con la sesión del usuario)

export async function listImages(orgId: string): Promise<Image[]> {
  const db = await sessionClient();
  // los avatares de autores del seed no son fotos de galería
  const { data, error } = await db.from("images").select("*").eq("org_id", orgId).not("storage_path", "like", "/seed/person-%").order("created_at", { ascending: false }).limit(60);
  fail(error, "imágenes");
  return (data ?? []).map((r) => toImage(r)!);
}

export async function getStaffUser(userId: string): Promise<StaffUser | null> {
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.id !== userId) return null;
  const { data, error } = await db.from("memberships").select("org_id, role").eq("user_id", user.id);
  fail(error, "equipo");
  return {
    id: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.name as string | undefined) ?? user.email ?? "",
    memberships: (data ?? []).map((m) => ({ orgId: m.org_id, role: m.role as Role })),
  };
}

export async function getArticleViewForStaff(orgId: string, id: string): Promise<ArticleView | null> {
  if (!isUuid(id)) return null;
  const db = await sessionClient();
  const { data, error } = await db.from("articles").select(ARTICLE_VIEW).eq("org_id", orgId).eq("id", id).maybeSingle();
  fail(error, "nota");
  return data ? ((await toViews(orgId, [data]))[0] ?? null) : null;
}

export async function listAdminArticles(orgId: string, filter: { status?: ArticleStatus; q?: string; sectionId?: string } = {}) {
  const db = await sessionClient();
  let query = db.from("articles").select(ARTICLE_VIEW).eq("org_id", orgId).neq("status", "archived");
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.sectionId) query = query.eq("section_id", filter.sectionId);
  const text = filter.q?.trim();
  if (text) query = query.ilike("title", `%${text.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(200);
  fail(error, "notas del panel");
  return toViews(orgId, data ?? []);
}

export async function getAdminStats(orgId: string) {
  const org = await getOrgById(orgId);
  const db = await sessionClient();
  const now = nowIso();
  const today = dayRange(dayKey(now, org!.timezone), org!.timezone)!;
  const count = async (build: (b: any) => any) => {
    const { count: n, error } = await build(db.from("articles").select("id", { count: "exact", head: true }).eq("org_id", orgId));
    fail(error, "métricas");
    return n ?? 0;
  };
  const [publishedToday, scheduled, drafts, total, next] = await Promise.all([
    count((b) => b.in("status", VISIBLE).gte("published_at", today.start).lte("published_at", now)),
    count((b) => b.eq("status", "scheduled").gt("published_at", now)),
    count((b) => b.eq("status", "draft")),
    count((b) => b.in("status", VISIBLE).lte("published_at", now)),
    db.from("articles").select("published_at").eq("org_id", orgId).eq("status", "scheduled").gt("published_at", now).order("published_at").limit(1).maybeSingle(),
  ]);
  return { publishedToday, scheduled, nextScheduledAt: (next.data?.published_at as string | undefined) ?? null, drafts, total };
}

export async function getArticleForEdit(orgId: string, id: string): Promise<Article | null> {
  if (!isUuid(id)) return null;
  const db = await sessionClient();
  const { data, error } = await db.from("articles").select("*, article_tags(tag_id, position)").eq("org_id", orgId).eq("id", id).maybeSingle();
  fail(error, "nota");
  return data ? toArticle(data) : null;
}

// ------------------------------------------------------------------ escrituras

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

// La sesión manda: el userId que llega tiene que ser el de la cookie.
async function staffDb(orgId: string, userId: string, roles: Role[]) {
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.id !== userId) throw new ForbiddenError("Tu sesión expiró. Vuelve a entrar.");
  const { data } = await db.from("memberships").select("role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  const role = data?.role as Role | undefined;
  if (!role || !roles.includes(role)) throw new ForbiddenError("Sin permiso para esta acción.");
  return { db, role };
}

async function validateRefs(db: Awaited<ReturnType<typeof sessionClient>>, orgId: string, input: ArticleInput) {
  const ids = [input.sectionId, input.authorId, input.placeTagId, input.coverImageId, ...input.tagIds].filter((x): x is string => !!x);
  if (!ids.every(isUuid)) throw new ForbiddenError("Una referencia no pertenece a este medio.");
  const has = async (table: string, list: string[]) => {
    if (!list.length) return true;
    const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("org_id", orgId).in("id", list);
    return count === new Set(list).size;
  };
  const ok = (
    await Promise.all([
      has("sections", [input.sectionId]),
      has("authors", input.authorId ? [input.authorId] : []),
      has("tags", [...(input.placeTagId ? [input.placeTagId] : []), ...input.tagIds]),
      has("images", input.coverImageId ? [input.coverImageId] : []),
    ])
  ).every(Boolean);
  if (!ok) throw new ForbiddenError("Una referencia no pertenece a este medio.");
}

function columns(input: ArticleInput) {
  const plain = docToPlain(input.body);
  return {
    title: input.title,
    dek: input.dek,
    body: input.body,
    body_text: plain,
    reading_minutes: readingMinutes(plain),
    section_id: input.sectionId,
    author_id: input.authorId,
    place_tag_id: input.placeTagId,
    cover_image_id: input.coverImageId,
    is_featured: input.isFeatured,
    is_sponsored: input.isSponsored,
  };
}

async function writeTags(db: Awaited<ReturnType<typeof sessionClient>>, articleId: string, tagIds: string[]) {
  const { error } = await db.from("article_tags").delete().eq("article_id", articleId);
  fail(error, "temas de la nota");
  if (!tagIds.length) return;
  const { error: e2 } = await db.from("article_tags").insert([...new Set(tagIds)].map((tag_id, position) => ({ article_id: articleId, tag_id, position })));
  fail(e2, "temas de la nota");
}

// Guarda como borrador o actualiza. expectedUpdatedAt evita pisar cambios de otra persona.
export async function saveArticle(orgId: string, userId: string, id: string | null, input: ArticleInput, expectedUpdatedAt?: string | null): Promise<Article> {
  const { db, role } = await staffDb(orgId, userId, ["owner", "admin", "editor", "writer"]);
  await validateRefs(db, orgId, input);

  if (id) {
    const current = await getArticleForEdit(orgId, id);
    if (!current) throw new ForbiddenError("La nota no existe.");
    if (role === "writer" && current.createdBy !== userId) throw new ForbiddenError("Solo puedes editar tus notas.");
    let update = db
      .from("articles")
      .update({ ...columns(input), slug: current.status === "draft" ? slugify(input.title) || current.slug : current.slug })
      .eq("id", id)
      .eq("org_id", orgId);
    // la comparación la hace Postgres en el mismo update: sin carrera entre leer y escribir
    if (expectedUpdatedAt) update = update.eq("updated_at", expectedUpdatedAt);
    const { data, error } = await update.select("id");
    fail(error, "guardar nota");
    if (!data?.length) throw new ConflictError("Otra persona cambió esta nota mientras la editabas.");
    await writeTags(db, id, input.tagIds);
    return (await getArticleForEdit(orgId, id))!;
  }

  const { data, error } = await db
    .from("articles")
    .insert({ ...columns(input), org_id: orgId, slug: slugify(input.title) || "nota", status: "draft", created_by: userId })
    .select("id")
    .single();
  fail(error, "crear nota");
  await writeTags(db, data!.id, input.tagIds);
  return (await getArticleForEdit(orgId, data!.id))!;
}

// Publica ya (publishAt null) o programa. Un redactor no puede (y RLS tampoco lo deja).
export async function publishArticle(orgId: string, userId: string, id: string, publishAt: string | null): Promise<Article> {
  const { db } = await staffDb(orgId, userId, ["owner", "admin", "editor"]);
  const current = await getArticleForEdit(orgId, id);
  if (!current) throw new ForbiddenError("La nota no existe.");
  const when = publishAt ? new Date(publishAt) : new Date();
  if (Number.isNaN(when.getTime())) throw new Error("Fecha no válida.");
  const future = when.getTime() > Date.now() + 30_000;
  const isLive = VISIBLE.includes(current.status) && !!current.publishedAt && new Date(current.publishedAt).getTime() <= Date.now();
  // republicar no cambia la fecha (ni la URL) de una nota ya publicada
  const publishedAt = isLive && !publishAt ? current.publishedAt : when.toISOString();
  const { data, error } = await db
    .from("articles")
    .update({ status: future ? "scheduled" : "published", published_at: publishedAt })
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id");
  fail(error, "publicar");
  if (!data?.length) throw new ForbiddenError("Sin permiso para esta acción.");
  return (await getArticleForEdit(orgId, id))!;
}

export async function unpublishArticle(orgId: string, userId: string, id: string): Promise<void> {
  const { db } = await staffDb(orgId, userId, ["owner", "admin", "editor"]);
  if (!isUuid(id)) return;
  const { error } = await db.from("articles").update({ status: "draft" }).eq("id", id).eq("org_id", orgId);
  fail(error, "retirar");
}

export async function deleteArticle(orgId: string, userId: string, id: string): Promise<void> {
  const { db } = await staffDb(orgId, userId, ["owner", "admin", "editor"]);
  if (!isUuid(id)) return;
  const { error } = await db.from("articles").delete().eq("id", id).eq("org_id", orgId);
  fail(error, "borrar");
}

// ------------------------------------------------------------------ fotos

export async function getImageById(orgId: string, id: string): Promise<Image | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await publicClient().from("images").select("*").eq("org_id", orgId).eq("id", id).maybeSingle();
  fail(error, "foto");
  return toImage(data);
}

// Sube al bucket "media" con la sesión del usuario: RLS solo deja escribir
// en la carpeta del medio a su personal.
export async function createImage(orgId: string, userId: string, up: ImageUpload): Promise<Image> {
  const { db } = await staffDb(orgId, userId, ["owner", "admin", "editor", "writer"]);
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" }[up.file.type] ?? "jpg";
  const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: e1 } = await db.storage.from("media").upload(path, up.file, { contentType: up.file.type });
  if (e1) throw new ForbiddenError(`No se pudo subir la foto: ${e1.message}`);
  const { data, error } = await db
    .from("images")
    .insert({ org_id: orgId, storage_path: path, alt: up.alt, caption: up.caption, credit: up.credit, width: up.width, height: up.height, uploaded_by: userId })
    .select("*")
    .single();
  fail(error, "guardar la foto");
  return toImage(data)!;
}
