"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { closePoll, createPoll, createTag, deleteAuthor, deletePoll, deleteTag, editorialEnabled, renameTag, saveAuthor } from "@/lib/editorial";
import { zonedLocalToUtc } from "@/lib/format";
import { canPublish, getCurrentOrg, getCurrentStaff } from "@/lib/org";

export type EditorialResult = { ok: true; message: string } | { ok: false; error: string };

const bad = (error: string): EditorialResult => ({ ok: false, error });
const id = z.guid();

// Autores y encuestas: edición o más. Temas y lugares: cualquiera del equipo
// (la redacción los necesita al escribir). RLS repite la misma regla en la base.
async function staffFor(kind: "edicion" | "equipo") {
  if (!editorialEnabled) return { error: "Esto necesita Supabase (ver replica/backend.md)." } as const;
  const org = await getCurrentOrg();
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Tu sesión expiró. Vuelve a entrar." } as const;
  if (kind === "edicion" && !canPublish(staff.role)) return { error: "Tu rol no puede cambiar esto. Pídeselo a edición." } as const;
  return { org, staff } as const;
}

function done(message: string, ...paths: string[]): EditorialResult {
  for (const p of paths) revalidatePath(p, "layout");
  return { ok: true, message };
}

async function attempt(fn: () => Promise<EditorialResult>): Promise<EditorialResult> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("row-level security") || msg.includes("permission")) return bad("Tu rol no puede cambiar esto.");
    if (msg.includes("duplicate")) return bad("Ya existe uno con ese nombre.");
    return bad(`No se pudo guardar. ${msg}`);
  }
}

// ------------------------------------------------------------------ encuestas

export async function createPollAction(_prev: EditorialResult | null, form: FormData): Promise<EditorialResult> {
  const ctx = await staffFor("edicion");
  if ("error" in ctx) return bad(ctx.error!);
  const parsed = z
    .object({
      question: z.string().trim().min(5, "Escribe la pregunta.").max(200),
      options: z.array(z.string().trim().max(80)).transform((o) => o.filter(Boolean)).pipe(z.array(z.string()).min(2, "Pon al menos dos opciones.").max(6, "Máximo seis opciones.")),
      startsAt: z.string(),
      endsAt: z.string(),
    })
    .safeParse({ question: form.get("question"), options: form.getAll("option").map(String), startsAt: form.get("startsAt") ?? "", endsAt: form.get("endsAt") ?? "" });
  if (!parsed.success) return bad(parsed.error.issues[0]!.message);
  const v = parsed.data;
  if (new Set(v.options.map((o) => o.toLowerCase())).size !== v.options.length) return bad("Hay opciones repetidas.");
  const startsAt = v.startsAt ? zonedLocalToUtc(v.startsAt, ctx.org.timezone) : new Date().toISOString();
  const endsAt = v.endsAt ? zonedLocalToUtc(v.endsAt, ctx.org.timezone) : null;
  if (!startsAt || (v.endsAt && !endsAt)) return bad("Revisa las fechas.");
  if (endsAt && endsAt <= startsAt) return bad("La encuesta tiene que cerrar después de abrir.");
  return attempt(async () => {
    const pollId = await createPoll(ctx.org.id, { question: v.question, options: v.options, startsAt, endsAt });
    await audit({ action: "poll.created", summary: `Creó la encuesta «${v.question}»`, orgId: ctx.org.id, targetType: "poll", targetId: pollId });
    return done("Encuesta creada. La portada muestra la más reciente que esté abierta.", "/", "/admin/encuestas");
  });
}

export async function closePollAction(pollId: string): Promise<EditorialResult> {
  const ctx = await staffFor("edicion");
  if ("error" in ctx) return bad(ctx.error!);
  if (!id.safeParse(pollId).success) return bad("Datos no válidos.");
  return attempt(async () => {
    const q = await closePoll(ctx.org.id, pollId);
    await audit({ action: "poll.closed", summary: `Cerró la encuesta «${q ?? pollId}»`, orgId: ctx.org.id, targetType: "poll", targetId: pollId });
    return done("Encuesta cerrada: ya no admite votos.", "/", "/admin/encuestas");
  });
}

export async function deletePollAction(pollId: string): Promise<EditorialResult> {
  const ctx = await staffFor("edicion");
  if ("error" in ctx) return bad(ctx.error!);
  if (!id.safeParse(pollId).success) return bad("Datos no válidos.");
  return attempt(async () => {
    const q = await deletePoll(ctx.org.id, pollId);
    await audit({ action: "poll.deleted", summary: `Borró la encuesta «${q ?? pollId}» con sus votos`, orgId: ctx.org.id, targetType: "poll", targetId: pollId });
    return done("Encuesta borrada.", "/", "/admin/encuestas");
  });
}

// ------------------------------------------------------------------ autores

export async function saveAuthorAction(_prev: EditorialResult | null, form: FormData): Promise<EditorialResult> {
  const ctx = await staffFor("edicion");
  if ("error" in ctx) return bad(ctx.error!);
  const parsed = z
    .object({
      id: z.union([z.literal(""), id]),
      name: z.string().trim().min(2, "Escribe el nombre.").max(80),
      bio: z.string().trim().max(280, "La biografía admite 280 caracteres."),
      isColumnist: z.boolean(),
      columnName: z.string().trim().max(80),
      photoImageId: z.union([z.literal(""), id]),
    })
    .safeParse({ id: form.get("id") ?? "", name: form.get("name"), bio: form.get("bio") ?? "", isColumnist: form.get("isColumnist") === "on", columnName: form.get("columnName") ?? "", photoImageId: form.get("photoImageId") ?? "" });
  if (!parsed.success) return bad(parsed.error.issues[0]!.message);
  const v = parsed.data;
  return attempt(async () => {
    const authorId = await saveAuthor(ctx.org.id, v.id || null, { name: v.name, bio: v.bio || null, isColumnist: v.isColumnist, columnName: v.columnName || null, photoImageId: v.photoImageId || null });
    await audit({ action: v.id ? "author.updated" : "author.created", summary: `${v.id ? "Editó" : "Creó"} la firma de ${v.name}${v.isColumnist ? " (columnista)" : ""}`, orgId: ctx.org.id, targetType: "author", targetId: authorId });
    return done(v.id ? "Firma guardada." : "Firma creada. Ya se puede elegir al escribir una nota.", "/", "/admin/autores");
  });
}

export async function deleteAuthorAction(authorId: string): Promise<EditorialResult> {
  const ctx = await staffFor("edicion");
  if ("error" in ctx) return bad(ctx.error!);
  if (!id.safeParse(authorId).success) return bad("Datos no válidos.");
  return attempt(async () => {
    const name = await deleteAuthor(ctx.org.id, authorId);
    await audit({ action: "author.deleted", summary: `Borró la firma de ${name ?? authorId}; sus notas pasan a «Redacción»`, orgId: ctx.org.id, targetType: "author", targetId: authorId });
    return done("Firma borrada. Sus notas quedan firmadas por Redacción.", "/", "/admin/autores");
  });
}

// ------------------------------------------------------------------ temas y lugares

export async function createTagAction(name: string, kind: "topic" | "place"): Promise<EditorialResult> {
  const ctx = await staffFor("equipo");
  if ("error" in ctx) return bad(ctx.error!);
  const parsed = z.object({ name: z.string().trim().min(2, "Escribe el nombre.").max(60), kind: z.enum(["topic", "place"]) }).safeParse({ name, kind });
  if (!parsed.success) return bad(parsed.error.issues[0]!.message);
  return attempt(async () => {
    const tagId = await createTag(ctx.org.id, parsed.data.name, parsed.data.kind);
    await audit({ action: "tag.created", summary: `Creó el ${kind === "topic" ? "tema" : "lugar"} «${parsed.data.name}»`, orgId: ctx.org.id, targetType: "tag", targetId: tagId });
    return done(kind === "topic" ? "Tema creado." : "Lugar creado.", "/admin/temas");
  });
}

export async function renameTagAction(tagId: string, name: string): Promise<EditorialResult> {
  const ctx = await staffFor("equipo");
  if ("error" in ctx) return bad(ctx.error!);
  const parsed = z.object({ tagId: id, name: z.string().trim().min(2).max(60) }).safeParse({ tagId, name });
  if (!parsed.success) return bad("Escribe un nombre de al menos 2 letras.");
  return attempt(async () => {
    await renameTag(ctx.org.id, tagId, parsed.data.name);
    await audit({ action: "tag.renamed", summary: `Renombró un tema a «${parsed.data.name}»`, orgId: ctx.org.id, targetType: "tag", targetId: tagId });
    return done("Nombre guardado.", "/", "/admin/temas");
  });
}

export async function deleteTagAction(tagId: string): Promise<EditorialResult> {
  const ctx = await staffFor("edicion");
  if ("error" in ctx) return bad(ctx.error!);
  if (!id.safeParse(tagId).success) return bad("Datos no válidos.");
  return attempt(async () => {
    const name = await deleteTag(ctx.org.id, tagId);
    await audit({ action: "tag.deleted", summary: `Borró el tema «${name ?? tagId}»`, orgId: ctx.org.id, targetType: "tag", targetId: tagId });
    return done("Borrado. Las notas que lo usaban siguen publicadas, sin ese tema.", "/", "/admin/temas");
  });
}
