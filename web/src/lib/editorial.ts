import "server-only";
import { serviceClient, sessionClient, supabaseEnabled } from "./supabase/server";
import { slugify } from "./format";

// Gestión editorial del panel de cada medio: encuestas, autores, temas y
// lugares. Todo va con la sesión del usuario, así RLS decide qué rol puede
// tocar qué (autores y encuestas: edición o más; temas: también redacción).

export const editorialEnabled = supabaseEnabled;

export type PollAdmin = {
  id: string;
  question: string;
  startsAt: string;
  endsAt: string | null;
  options: { id: string; label: string; votes: number }[];
  total: number;
  state: "programada" | "abierta" | "cerrada";
};

export type AuthorAdmin = { id: string; name: string; slug: string; bio: string | null; isColumnist: boolean; columnName: string | null; photoImageId: string | null; photoSrc: string | null; articles: number };
export type TagAdmin = { id: string; name: string; slug: string; kind: "topic" | "place"; articles: number };

function imageSrc(path: string) {
  return path.startsWith("/") ? path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

function fail(what: string, error: { message: string } | null) {
  if (error) throw new Error(`Supabase (${what}): ${error.message}`);
}

// Un slug libre dentro del medio: "maria-perez", "maria-perez-2"…
async function freeSlug(table: "authors" | "tags", orgId: string, base: string, exceptId?: string) {
  const root = slugify(base) || "sin-nombre";
  const { data } = await serviceClient().from(table).select("id, slug").eq("org_id", orgId).like("slug", `${root}%`);
  const taken = new Set((data ?? []).filter((r) => r.id !== exceptId).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
}

// ------------------------------------------------------------------ encuestas

export async function listPollsAdmin(orgId: string): Promise<PollAdmin[]> {
  const db = await sessionClient();
  const { data, error } = await db.from("polls").select("id, question, starts_at, ends_at, poll_options(id, label, position)").eq("org_id", orgId).order("starts_at", { ascending: false }).limit(50);
  fail("encuestas", error);
  const optionIds = (data ?? []).flatMap((p) => p.poll_options.map((o) => o.id));
  const { data: results } = optionIds.length ? await db.from("poll_results").select("option_id, votes").in("option_id", optionIds) : { data: [] };
  const votes = new Map((results ?? []).map((r) => [r.option_id, r.votes as number]));
  const now = Date.now();
  return (data ?? []).map((p) => {
    const options = [...p.poll_options].sort((a, b) => a.position - b.position).map((o) => ({ id: o.id, label: o.label, votes: votes.get(o.id) ?? 0 }));
    const state = new Date(p.starts_at).getTime() > now ? "programada" : p.ends_at && new Date(p.ends_at).getTime() <= now ? "cerrada" : "abierta";
    return { id: p.id, question: p.question, startsAt: p.starts_at, endsAt: p.ends_at, options, total: options.reduce((n, o) => n + o.votes, 0), state };
  });
}

export async function createPoll(orgId: string, input: { question: string; options: string[]; startsAt: string; endsAt: string | null }) {
  const db = await sessionClient();
  const { data: poll, error } = await db.from("polls").insert({ org_id: orgId, question: input.question, starts_at: input.startsAt, ends_at: input.endsAt }).select("id").single();
  fail("crear encuesta", error);
  const { error: e2 } = await db.from("poll_options").insert(input.options.map((label, position) => ({ poll_id: poll!.id, label, position })));
  if (e2) {
    await db.from("polls").delete().eq("id", poll!.id);
    fail("opciones", e2);
  }
  return poll!.id as string;
}

export async function closePoll(orgId: string, id: string) {
  const db = await sessionClient();
  const { data, error } = await db.from("polls").update({ ends_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("org_id", orgId).eq("id", id).select("question").maybeSingle();
  fail("cerrar encuesta", error);
  return data?.question ?? null;
}

export async function deletePoll(orgId: string, id: string) {
  const db = await sessionClient();
  const { data, error } = await db.from("polls").delete().eq("org_id", orgId).eq("id", id).select("question").maybeSingle();
  fail("borrar encuesta", error);
  return data?.question ?? null;
}

// ------------------------------------------------------------------ autores

export async function listAuthorsAdmin(orgId: string): Promise<AuthorAdmin[]> {
  const db = await sessionClient();
  const [{ data, error }, { data: arts }] = await Promise.all([
    db.from("authors").select("id, name, slug, bio, is_columnist, column_name, photo_image_id, photo:images!photo_image_id(storage_path)").eq("org_id", orgId).order("name"),
    db.from("articles").select("author_id").eq("org_id", orgId).not("author_id", "is", null),
  ]);
  fail("autores", error);
  const count = new Map<string, number>();
  for (const a of arts ?? []) count.set(a.author_id, (count.get(a.author_id) ?? 0) + 1);
  return (data ?? []).map((a) => {
    const photo = a.photo as unknown as { storage_path: string } | null;
    return { id: a.id, name: a.name, slug: a.slug, bio: a.bio, isColumnist: a.is_columnist, columnName: a.column_name, photoImageId: a.photo_image_id, photoSrc: photo ? imageSrc(photo.storage_path) : null, articles: count.get(a.id) ?? 0 };
  });
}

export async function saveAuthor(orgId: string, id: string | null, input: { name: string; bio: string | null; isColumnist: boolean; columnName: string | null; photoImageId: string | null }) {
  const db = await sessionClient();
  const row = { name: input.name, bio: input.bio, is_columnist: input.isColumnist, column_name: input.isColumnist ? input.columnName : null, photo_image_id: input.photoImageId, updated_at: new Date().toISOString() };
  if (id) {
    const { error } = await db.from("authors").update(row).eq("org_id", orgId).eq("id", id);
    fail("guardar autor", error);
    return id;
  }
  const { data, error } = await db.from("authors").insert({ ...row, org_id: orgId, slug: await freeSlug("authors", orgId, input.name) }).select("id").single();
  fail("crear autor", error);
  return data!.id as string;
}

export async function deleteAuthor(orgId: string, id: string) {
  const db = await sessionClient();
  // sus notas quedan firmadas por "Redacción" (author_id pasa a null)
  const { data, error } = await db.from("authors").delete().eq("org_id", orgId).eq("id", id).select("name").maybeSingle();
  fail("borrar autor", error);
  return data?.name ?? null;
}

// ------------------------------------------------------------------ temas y lugares

export async function listTagsAdmin(orgId: string): Promise<TagAdmin[]> {
  const db = await sessionClient();
  const [{ data, error }, { data: links }, { data: places }] = await Promise.all([
    db.from("tags").select("id, name, slug, kind").eq("org_id", orgId),
    db.from("article_tags").select("tag_id, articles!inner(org_id)").eq("articles.org_id", orgId),
    db.from("articles").select("place_tag_id").eq("org_id", orgId).not("place_tag_id", "is", null),
  ]);
  fail("temas", error);
  const count = new Map<string, number>();
  for (const l of links ?? []) count.set(l.tag_id, (count.get(l.tag_id) ?? 0) + 1);
  for (const p of places ?? []) count.set(p.place_tag_id, (count.get(p.place_tag_id) ?? 0) + 1);
  return (data ?? [])
    .map((t) => ({ id: t.id, name: t.name, slug: t.slug, kind: t.kind as TagAdmin["kind"], articles: count.get(t.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function createTag(orgId: string, name: string, kind: "topic" | "place") {
  const db = await sessionClient();
  const { data, error } = await db.from("tags").insert({ org_id: orgId, name, kind, slug: await freeSlug("tags", orgId, name) }).select("id").single();
  fail("crear tema", error);
  return data!.id as string;
}

// Renombrar no cambia el slug: los enlaces a /tema/… siguen funcionando.
export async function renameTag(orgId: string, id: string, name: string) {
  const db = await sessionClient();
  const { error } = await db.from("tags").update({ name, updated_at: new Date().toISOString() }).eq("org_id", orgId).eq("id", id);
  fail("renombrar tema", error);
}

export async function deleteTag(orgId: string, id: string) {
  const db = await sessionClient();
  const { data, error } = await db.from("tags").delete().eq("org_id", orgId).eq("id", id).select("name").maybeSingle();
  fail("borrar tema", error);
  return data?.name ?? null;
}
