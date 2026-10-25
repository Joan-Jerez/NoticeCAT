import "server-only";
import { randomUUID } from "node:crypto";
import { readDB, writeDB } from "./store";
import type { DB } from "./seed";
import { dateParts, dayKey, readingMinutes, slugify } from "../format";
import { docToPlain } from "../richtext";
import type { Article, ArticleStatus, ArticleView, Author, Image, Organization, Page, Poll, RichNode, Section, StaffUser, Tag } from "../types";

// Capa de datos. Todas las funciones reciben el medio (orgId) de forma
// explícita: es el equivalente de las políticas RLS de replica/schema.sql.
// Las firmas son las que mantendrá la versión con Supabase.

// ------------------------------------------------------------------ medios

export async function getOrgByHost(host: string): Promise<Organization | null> {
  return readDB().organizations.find((o) => o.hosts.includes(host)) ?? null;
}

export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  return readDB().organizations.find((o) => o.slug === slug) ?? null;
}

export async function getDefaultOrg(): Promise<Organization> {
  return readDB().organizations[0]!;
}

// ------------------------------------------------------------------ secciones

export async function listSections(orgId: string): Promise<Section[]> {
  return readDB()
    .sections.filter((s) => s.orgId === orgId)
    .sort((a, b) => a.position - b.position);
}

export type SectionNode = Section & { children: Section[] };

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

// ------------------------------------------------------------------ vistas de nota

function isVisible(a: Article, now = Date.now()) {
  return (a.status === "published" || a.status === "scheduled") && !!a.publishedAt && new Date(a.publishedAt).getTime() <= now;
}

function byNewest(a: Article, b: Article) {
  return (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt) || b.number - a.number;
}

function image(db: DB, id: string | null): Image | null {
  return id ? (db.images.find((i) => i.id === id) ?? null) : null;
}

export function articlePath(a: Pick<Article, "slug" | "number" | "publishedAt" | "updatedAt">, section: Section, parent: Section | null, org: Organization) {
  const { yyyy, mm, dd } = dateParts(a.publishedAt ?? a.updatedAt, org.timezone);
  const sec = parent ? `${parent.slug}/${section.slug}` : section.slug;
  return `/${sec}/${yyyy}/${mm}/${dd}/${a.slug}/${a.number}`;
}

function toView(db: DB, a: Article): ArticleView {
  const org = db.organizations.find((o) => o.id === a.orgId)!;
  const section = db.sections.find((s) => s.id === a.sectionId)!;
  const parentSection = section.parentId ? (db.sections.find((s) => s.id === section.parentId) ?? null) : null;
  const author = a.authorId ? (db.authors.find((x) => x.id === a.authorId) ?? null) : null;
  return {
    ...a,
    section,
    parentSection,
    author: author ? { ...author, photo: image(db, author.photoImageId) } : null,
    place: a.placeTagId ? (db.tags.find((t) => t.id === a.placeTagId) ?? null) : null,
    cover: image(db, a.coverImageId),
    tags: a.tagIds.map((id) => db.tags.find((t) => t.id === id)).filter((t): t is Tag => !!t),
    url: articlePath(a, section, parentSection, org),
  };
}

function encodeCursor(a: Article) {
  return Buffer.from(`${a.publishedAt}|${a.number}`).toString("base64url");
}

function afterCursor(cursor: string | null | undefined) {
  if (!cursor) return () => true;
  const [publishedAt, number] = Buffer.from(cursor, "base64url").toString().split("|");
  return (a: Article) => (a.publishedAt ?? "") < publishedAt! || (a.publishedAt === publishedAt && a.number < Number(number));
}

export interface ArticleFilter {
  sectionId?: string; // incluye sus subsecciones
  authorId?: string;
  tagId?: string; // tema o lugar
  day?: string; // "2026-10-25" en la zona del medio
  featured?: boolean;
  excludeIds?: string[];
}

export async function listArticles(orgId: string, filter: ArticleFilter = {}, opts: { limit?: number; cursor?: string | null } = {}): Promise<Page<ArticleView>> {
  const db = readDB();
  const org = db.organizations.find((o) => o.id === orgId);
  if (!org) return { items: [], nextCursor: null };
  const limit = opts.limit ?? 20;
  const sectionIds = filter.sectionId
    ? new Set([filter.sectionId, ...db.sections.filter((s) => s.parentId === filter.sectionId).map((s) => s.id)])
    : null;
  const after = afterCursor(opts.cursor);
  const rows = db.articles
    .filter((a) => a.orgId === orgId && isVisible(a))
    .filter((a) => !sectionIds || sectionIds.has(a.sectionId))
    .filter((a) => !filter.authorId || a.authorId === filter.authorId)
    .filter((a) => !filter.tagId || a.tagIds.includes(filter.tagId) || a.placeTagId === filter.tagId)
    .filter((a) => !filter.day || dayKey(a.publishedAt!, org.timezone) === filter.day)
    .filter((a) => filter.featured === undefined || a.isFeatured === filter.featured)
    .filter((a) => !filter.excludeIds?.includes(a.id))
    .sort(byNewest)
    .filter(after);
  const items = rows.slice(0, limit);
  return {
    items: items.map((a) => toView(db, a)),
    nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1]!) : null,
  };
}

export async function getArticleByNumber(orgId: string, number: number): Promise<ArticleView | null> {
  const db = readDB();
  const a = db.articles.find((x) => x.orgId === orgId && x.number === number);
  return a && isVisible(a) ? toView(db, a) : null;
}

export async function getVisibleArticleById(orgId: string, id: string): Promise<ArticleView | null> {
  const db = readDB();
  const a = db.articles.find((x) => x.orgId === orgId && x.id === id);
  return a && isVisible(a) ? toView(db, a) : null;
}

// Para la vista previa del panel: no exige que esté publicada.
export async function getArticleViewForStaff(orgId: string, id: string): Promise<ArticleView | null> {
  const db = readDB();
  const a = db.articles.find((x) => x.orgId === orgId && x.id === id);
  return a ? toView(db, a) : null;
}

export async function countArticlesByDay(orgId: string, year: number): Promise<Record<string, number>> {
  const db = readDB();
  const org = db.organizations.find((o) => o.id === orgId)!;
  const out: Record<string, number> = {};
  for (const a of db.articles) {
    if (a.orgId !== orgId || !isVisible(a)) continue;
    const key = dayKey(a.publishedAt!, org.timezone);
    if (key.startsWith(`${year}-`)) out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export async function searchArticles(orgId: string, q: string, opts: { limit?: number; cursor?: string | null } = {}): Promise<Page<ArticleView>> {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return { items: [], nextCursor: null };
  const db = readDB();
  const limit = opts.limit ?? 20;
  const after = afterCursor(opts.cursor);
  const rows = db.articles
    .filter((a) => a.orgId === orgId && isVisible(a))
    .filter((a) => {
      const hay = norm(`${a.title} ${a.dek ?? ""} ${a.bodyText}`);
      return terms.every((t) => hay.includes(t));
    })
    .sort(byNewest)
    .filter(after);
  const items = rows.slice(0, limit);
  return { items: items.map((a) => toView(db, a)), nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1]!) : null };
}

// ------------------------------------------------------------------ autores, temas, encuestas

export type AuthorView = Author & { photo: Image | null };

export async function getAuthorBySlug(orgId: string, slug: string): Promise<AuthorView | null> {
  const db = readDB();
  const a = db.authors.find((x) => x.orgId === orgId && x.slug === slug);
  return a ? { ...a, photo: image(db, a.photoImageId) } : null;
}

export async function listAuthors(orgId: string): Promise<AuthorView[]> {
  const db = readDB();
  return db.authors.filter((a) => a.orgId === orgId).map((a) => ({ ...a, photo: image(db, a.photoImageId) }));
}

export async function getTagBySlug(orgId: string, slug: string): Promise<Tag | null> {
  return readDB().tags.find((t) => t.orgId === orgId && t.slug === slug) ?? null;
}

export async function listTags(orgId: string): Promise<Tag[]> {
  return readDB()
    .tags.filter((t) => t.orgId === orgId)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getActivePoll(orgId: string): Promise<Poll | null> {
  const now = new Date().toISOString();
  return readDB().polls.find((p) => p.orgId === orgId && p.startsAt <= now && (!p.endsAt || p.endsAt > now)) ?? null;
}

export async function votePoll(orgId: string, pollId: string, optionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = readDB();
  const poll = db.polls.find((p) => p.id === pollId && p.orgId === orgId);
  const option = poll?.options.find((o) => o.id === optionId);
  if (!poll || !option) return { ok: false, error: "Esa opción no existe." };
  if (poll.endsAt && poll.endsAt < new Date().toISOString()) return { ok: false, error: "La encuesta está cerrada." };
  option.votes++;
  writeDB(db);
  return { ok: true };
}

export async function listImages(orgId: string): Promise<Image[]> {
  return readDB().images.filter((i) => i.orgId === orgId && i.src.includes("cover"));
}

// ------------------------------------------------------------------ panel

export async function getStaffUser(userId: string): Promise<StaffUser | null> {
  return readDB().users.find((u) => u.id === userId) ?? null;
}

export async function listAdminArticles(orgId: string, filter: { status?: ArticleStatus; q?: string; sectionId?: string } = {}) {
  const db = readDB();
  const q = filter.q?.toLowerCase().trim();
  return db.articles
    .filter((a) => a.orgId === orgId && a.status !== "archived")
    .filter((a) => !filter.status || a.status === filter.status)
    .filter((a) => !filter.sectionId || a.sectionId === filter.sectionId)
    .filter((a) => !q || a.title.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((a) => toView(db, a));
}

export async function getAdminStats(orgId: string) {
  const db = readDB();
  const org = db.organizations.find((o) => o.id === orgId)!;
  const today = dayKey(new Date().toISOString(), org.timezone);
  const mine = db.articles.filter((a) => a.orgId === orgId);
  const scheduled = mine
    .filter((a) => a.status === "scheduled" && a.publishedAt && new Date(a.publishedAt).getTime() > Date.now())
    .sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!));
  return {
    publishedToday: mine.filter((a) => isVisible(a) && dayKey(a.publishedAt!, org.timezone) === today).length,
    scheduled: scheduled.length,
    nextScheduledAt: scheduled[0]?.publishedAt ?? null,
    drafts: mine.filter((a) => a.status === "draft").length,
    total: mine.filter((a) => isVisible(a)).length,
  };
}

export async function getArticleForEdit(orgId: string, id: string): Promise<Article | null> {
  return readDB().articles.find((a) => a.orgId === orgId && a.id === id) ?? null;
}

export interface ArticleInput {
  title: string;
  dek: string | null;
  body: RichNode;
  sectionId: string;
  authorId: string | null;
  placeTagId: string | null;
  coverImageId: string | null;
  tagIds: string[];
  isFeatured: boolean;
  isSponsored: boolean;
}

export class ConflictError extends Error {}
export class ForbiddenError extends Error {}

function assertRole(db: DB, userId: string, orgId: string, roles: StaffUser["memberships"][number]["role"][]) {
  const user = db.users.find((u) => u.id === userId);
  const role = user?.memberships.find((m) => m.orgId === orgId)?.role;
  if (!role || !roles.includes(role)) throw new ForbiddenError("Sin permiso para esta acción.");
  return role;
}

function validateRefs(db: DB, orgId: string, input: ArticleInput) {
  const ok =
    db.sections.some((s) => s.id === input.sectionId && s.orgId === orgId) &&
    (!input.authorId || db.authors.some((x) => x.id === input.authorId && x.orgId === orgId)) &&
    (!input.placeTagId || db.tags.some((t) => t.id === input.placeTagId && t.orgId === orgId)) &&
    (!input.coverImageId || db.images.some((i) => i.id === input.coverImageId && i.orgId === orgId)) &&
    input.tagIds.every((id) => db.tags.some((t) => t.id === id && t.orgId === orgId));
  if (!ok) throw new ForbiddenError("Una referencia no pertenece a este medio.");
}

// Guarda como borrador o actualiza. expectedUpdatedAt evita pisar cambios de otra persona.
export async function saveArticle(orgId: string, userId: string, id: string | null, input: ArticleInput, expectedUpdatedAt?: string | null): Promise<Article> {
  const db = readDB();
  const role = assertRole(db, userId, orgId, ["owner", "admin", "editor", "writer"]);
  validateRefs(db, orgId, input);
  const now = new Date().toISOString();
  const plain = docToPlain(input.body);
  if (id) {
    const a = db.articles.find((x) => x.id === id && x.orgId === orgId);
    if (!a) throw new ForbiddenError("La nota no existe.");
    if (role === "writer" && a.createdBy !== userId) throw new ForbiddenError("Solo puedes editar tus notas.");
    if (expectedUpdatedAt && a.updatedAt !== expectedUpdatedAt) throw new ConflictError("Otra persona cambió esta nota mientras la editabas.");
    Object.assign(a, input, {
      slug: a.status === "draft" ? slugify(input.title) || a.slug : a.slug,
      bodyText: plain,
      readingMinutes: readingMinutes(plain),
      updatedAt: now,
    });
    writeDB(db);
    return a;
  }
  const article: Article = {
    id: randomUUID(),
    orgId,
    number: db.counters[orgId]!++,
    slug: slugify(input.title) || "nota",
    ...input,
    bodyText: plain,
    readingMinutes: readingMinutes(plain),
    status: "draft",
    publishedAt: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  db.articles.push(article);
  writeDB(db);
  return article;
}

// Publica ya (publishAt null) o programa. Un redactor no puede.
export async function publishArticle(orgId: string, userId: string, id: string, publishAt: string | null): Promise<Article> {
  const db = readDB();
  assertRole(db, userId, orgId, ["owner", "admin", "editor"]);
  const a = db.articles.find((x) => x.id === id && x.orgId === orgId);
  if (!a) throw new ForbiddenError("La nota no existe.");
  const when = publishAt ? new Date(publishAt) : new Date();
  if (Number.isNaN(when.getTime())) throw new Error("Fecha no válida.");
  const future = when.getTime() > Date.now() + 30_000;
  a.status = future ? "scheduled" : "published";
  // republicar no cambia la fecha (ni la URL) de una nota ya publicada
  a.publishedAt = a.publishedAt && isVisible(a) && !publishAt ? a.publishedAt : when.toISOString();
  a.updatedAt = new Date().toISOString();
  writeDB(db);
  return a;
}

export async function unpublishArticle(orgId: string, userId: string, id: string): Promise<void> {
  const db = readDB();
  assertRole(db, userId, orgId, ["owner", "admin", "editor"]);
  const a = db.articles.find((x) => x.id === id && x.orgId === orgId);
  if (!a) return;
  a.status = "draft";
  a.updatedAt = new Date().toISOString();
  writeDB(db);
}

export async function deleteArticle(orgId: string, userId: string, id: string): Promise<void> {
  const db = readDB();
  assertRole(db, userId, orgId, ["owner", "admin", "editor"]);
  db.articles = db.articles.filter((x) => !(x.id === id && x.orgId === orgId));
  writeDB(db);
}
