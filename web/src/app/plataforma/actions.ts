"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { siteOrigin } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/platform";
import { publicClient, serviceClient } from "@/lib/supabase/server";

// Todas las acciones del panel de IT: cada una vuelve a comprobar el acceso
// (una acción de servidor se puede llamar sin pasar por la página), usa el
// cliente service role, que salta RLS, y deja su línea en audit_log.

export type PlatformResult = { ok: true; message: string } | { ok: false; error: string };

const uuid = z.guid();
const role = z.enum(["owner", "admin", "editor", "writer"]);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "Solo minúsculas, números y guiones (2 a 40).");
const host = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9.-]+(:\d+)?$/, "Escribe solo el dominio, sin https:// ni barras.");
const password = z.string().min(8, "Al menos 8 caracteres.").max(72).regex(/[a-zA-Z]/, "Incluye una letra.").regex(/\d/, "Incluye un número.");

const done = (message: string): PlatformResult => {
  revalidatePath("/plataforma", "layout");
  return { ok: true, message };
};
const bad = (error: string): PlatformResult => ({ ok: false, error });
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Datos no válidos.";
const roleNames: Record<string, string> = { owner: "dueño", admin: "administración", editor: "edición", writer: "redacción" };

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// nombres legibles para los resúmenes del registro
async function emailOf(userId: string) {
  const { data } = await serviceClient().auth.admin.getUserById(userId);
  return data.user?.email ?? userId;
}
async function orgNameOf(orgId: string) {
  const { data } = await serviceClient().from("organizations").select("name").eq("id", orgId).maybeSingle();
  return data?.name ?? orgId;
}

async function soleOwnerOf(userId: string) {
  const db = serviceClient();
  const { data } = await db.from("memberships").select("org_id").eq("user_id", userId).eq("role", "owner");
  const out: string[] = [];
  for (const { org_id } of data ?? []) {
    const { count } = await db.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", org_id).eq("role", "owner");
    if (count === 1) out.push(org_id);
  }
  return out;
}

// ------------------------------------------------------------------ equipos

// Dar o cambiar el rol de alguien en un medio (crea la membresía si no existe).
export async function setMembership(userId: string, orgId: string, newRole: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z.object({ userId: uuid, orgId: uuid, role }).safeParse({ userId, orgId, role: newRole });
  if (!parsed.success) return bad("Datos no válidos.");
  const db = serviceClient();
  if (parsed.data.role !== "owner") {
    const { data: current } = await db.from("memberships").select("role").eq("user_id", userId).eq("org_id", orgId).maybeSingle();
    if (current?.role === "owner" && (await soleOwnerOf(userId)).includes(orgId)) return bad("Es el único dueño del medio. Nombra otro dueño antes de cambiarle el rol.");
  }
  const { error } = await db
    .from("memberships")
    .upsert({ user_id: parsed.data.userId, org_id: parsed.data.orgId, role: parsed.data.role, updated_at: new Date().toISOString() }, { onConflict: "org_id,user_id" });
  if (error) return bad(`No se pudo guardar: ${error.message}`);
  await audit({ actor: me, action: "platform.membership.set", orgId, targetType: "user", targetId: userId, summary: `Dio el rol ${roleNames[parsed.data.role]} a ${await emailOf(userId)} en ${await orgNameOf(orgId)}` });
  return done("Rol guardado.");
}

export async function removeMembership(userId: string, orgId: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z.object({ userId: uuid, orgId: uuid }).safeParse({ userId, orgId });
  if (!parsed.success) return bad("Datos no válidos.");
  if ((await soleOwnerOf(parsed.data.userId)).includes(parsed.data.orgId)) return bad("Es el único dueño del medio. Nombra otro dueño antes de quitarlo.");
  const { error } = await serviceClient().from("memberships").delete().eq("user_id", parsed.data.userId).eq("org_id", parsed.data.orgId);
  if (error) return bad(`No se pudo quitar: ${error.message}`);
  await audit({ actor: me, action: "platform.membership.removed", orgId, targetType: "user", targetId: userId, summary: `Quitó a ${await emailOf(userId)} del equipo de ${await orgNameOf(orgId)}` });
  return done("Quitado del equipo.");
}

// ------------------------------------------------------------------ usuarios

// Con contraseña: la cuenta queda lista y confirmada. Sin ella: Supabase manda
// una invitación para que la persona elija la suya.
export async function createUser(_prev: PlatformResult | null, form: FormData): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("Escribe un correo válido."), name: z.string().trim().max(80), password: z.union([z.literal(""), password]) })
    .safeParse({ email: form.get("email"), name: form.get("name") ?? "", password: form.get("password") ?? "" });
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { email, name, password: pw } = parsed.data;
  const db = serviceClient();
  if (pw) {
    const { data, error } = await db.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { name } });
    if (error) return bad(error.message.includes("already") ? "Ya existe una cuenta con ese correo." : error.message);
    await audit({ actor: me, action: "platform.user.created", targetType: "user", targetId: data.user.id, summary: `Creó la cuenta ${email}` });
    return done(`Cuenta creada: ${email}.`);
  }
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { data: { name }, redirectTo: `${await siteOrigin()}/auth/callback?siguiente=/cuenta/nueva-clave` });
  if (error) return bad(error.message.includes("already") ? "Ya existe una cuenta con ese correo." : error.message);
  await audit({ actor: me, action: "platform.user.invited", targetType: "user", targetId: data.user.id, summary: `Invitó a ${email}` });
  return done(`Invitación enviada a ${email}.`);
}

export async function sendPasswordReset(userId: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(userId).success) return bad("Datos no válidos.");
  const { data, error } = await serviceClient().auth.admin.getUserById(userId);
  if (error || !data.user.email) return bad("No se encontró la cuenta.");
  const res = await publicClient().auth.resetPasswordForEmail(data.user.email, { redirectTo: `${await siteOrigin()}/auth/callback?siguiente=/cuenta/nueva-clave` });
  if (res.error) return bad(`No se pudo enviar: ${res.error.message}`);
  await audit({ actor: me, action: "platform.user.password_reset_sent", targetType: "user", targetId: userId, summary: `Envió un cambio de contraseña a ${data.user.email}` });
  return done(`Enlace de contraseña enviado a ${data.user.email}.`);
}

export async function confirmEmail(userId: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(userId).success) return bad("Datos no válidos.");
  const { error } = await serviceClient().auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) return bad(`No se pudo confirmar: ${error.message}`);
  await audit({ actor: me, action: "platform.user.email_confirmed", targetType: "user", targetId: userId, summary: `Confirmó a mano el correo de ${await emailOf(userId)}` });
  return done("Correo confirmado.");
}

// Bloquear impide entrar (Supabase rechaza el inicio de sesión) sin borrar nada.
export async function setBlocked(userId: string, blocked: boolean): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(userId).success) return bad("Datos no válidos.");
  if (userId === me.id) return bad("No puedes bloquear tu propia cuenta.");
  const { error } = await serviceClient().auth.admin.updateUserById(userId, { ban_duration: blocked ? "876000h" : "none" });
  if (error) return bad(`No se pudo cambiar: ${error.message}`);
  await audit({ actor: me, action: blocked ? "platform.user.blocked" : "platform.user.unblocked", targetType: "user", targetId: userId, summary: `${blocked ? "Bloqueó" : "Desbloqueó"} la cuenta ${await emailOf(userId)}` });
  return done(blocked ? "Cuenta bloqueada." : "Cuenta desbloqueada.");
}

export async function deleteUser(userId: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(userId).success) return bad("Datos no válidos.");
  if (userId === me.id) return bad("No puedes borrar tu propia cuenta desde aquí.");
  if ((await soleOwnerOf(userId)).length) return bad("Es el único dueño de un medio. Nombra otro dueño antes de borrarla.");
  const gone = await emailOf(userId);
  const { error } = await serviceClient().auth.admin.deleteUser(userId);
  if (error) return bad(`No se pudo borrar: ${error.message}`);
  await audit({ actor: me, action: "platform.user.deleted", targetType: "user", targetId: userId, summary: `Borró la cuenta ${gone}` });
  return done("Cuenta borrada.");
}

// ------------------------------------------------------------------ medios

const DEFAULT_SECTIONS = ["País", "Mundo", "Economía", "Deportes", "Cultura", "Opinión"];

export async function createOrg(_prev: PlatformResult | null, form: FormData): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Escribe el nombre del medio.").max(80),
      slug: z.union([z.literal(""), slug]),
      tagline: z.string().trim().max(140),
      host: z.union([z.literal(""), host]),
      ownerEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email("El correo del dueño no es válido.")]),
    })
    .safeParse(Object.fromEntries(["name", "slug", "tagline", "host", "ownerEmail"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const d = parsed.data;
  const db = serviceClient();

  let ownerId = me.id;
  if (d.ownerEmail) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
    const owner = list?.users.find((u) => u.email?.toLowerCase() === d.ownerEmail);
    if (!owner) return bad("No hay ninguna cuenta con el correo del dueño. Créala primero en Usuarios.");
    ownerId = owner.id;
  }

  const { data: org, error } = await db
    .from("organizations")
    .insert({ name: d.name, slug: d.slug || slugify(d.name), tagline: d.tagline })
    .select("id")
    .single();
  if (error) return bad(error.code === "23505" ? "Ya hay un medio con ese identificador." : `No se pudo crear: ${error.message}`);

  const steps = await Promise.all([
    db.from("org_billing").insert({ org_id: org.id }),
    db.from("memberships").insert({ org_id: org.id, user_id: ownerId, role: "owner" }),
    db.from("sections").insert(DEFAULT_SECTIONS.map((name, i) => ({ org_id: org.id, name, slug: slugify(name), position: i }))),
    d.host ? db.from("org_domains").insert({ org_id: org.id, host: d.host, is_primary: true }) : Promise.resolve({ error: null }),
  ]);
  await audit({ actor: me, action: "platform.org.created", orgId: org.id, targetType: "org", targetId: org.id, summary: `Creó el medio «${d.name}»` });
  const failed = steps.find((s) => s.error);
  if (failed?.error) return bad(`El medio se creó, pero falló un paso: ${failed.error.message}`);
  revalidatePath("/plataforma", "layout");
  redirect(`/plataforma/medios/${org.id}?creado=1`);
}

export async function updateOrg(_prev: PlatformResult | null, form: FormData): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z
    .object({
      id: uuid,
      name: z.string().trim().min(2, "Escribe el nombre del medio.").max(80),
      slug,
      tagline: z.string().trim().max(140),
      timezone: z.string().trim().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Zona horaria no válida."),
      locale: z.string().trim().regex(/^[a-z]{2}-[A-Z]{2}$/, "Formato como es-DO."),
    })
    .safeParse(Object.fromEntries(["id", "name", "slug", "tagline", "timezone", "locale"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const { id, ...fields } = parsed.data;
  const { error } = await serviceClient()
    .from("organizations")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return bad(error.code === "23505" ? "Ya hay un medio con ese identificador." : `No se pudo guardar: ${error.message}`);
  await audit({ actor: me, action: "platform.org.updated", orgId: id, targetType: "org", targetId: id, summary: `Editó los datos de «${fields.name}»`, details: fields });
  return done("Datos del medio guardados.");
}

export async function setBilling(orgId: string, plan: string, status: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z
    .object({ orgId: uuid, plan: z.enum(["trial", "starter", "pro", "newsroom"]), status: z.enum(["trialing", "active", "past_due", "canceled", "incomplete"]) })
    .safeParse({ orgId, plan, status });
  if (!parsed.success) return bad("Datos no válidos.");
  const { error } = await serviceClient()
    .from("org_billing")
    .upsert({ org_id: orgId, plan: parsed.data.plan, status: parsed.data.status, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
  if (error) return bad(`No se pudo guardar: ${error.message}`);
  await audit({ actor: me, action: "platform.org.billing", orgId, targetType: "org", targetId: orgId, summary: `Puso a ${await orgNameOf(orgId)} en plan ${parsed.data.plan} (${parsed.data.status})` });
  return done("Plan guardado.");
}

export async function addDomain(orgId: string, value: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z.object({ orgId: uuid, host }).safeParse({ orgId, host: value });
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const db = serviceClient();
  const { count } = await db.from("org_domains").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  const { error } = await db.from("org_domains").insert({ org_id: orgId, host: parsed.data.host, is_primary: !count });
  if (error) return bad(error.code === "23505" ? "Ese dominio ya está en uso." : `No se pudo añadir: ${error.message}`);
  await audit({ actor: me, action: "platform.domain.added", orgId, targetType: "domain", targetId: parsed.data.host, summary: `Añadió el dominio ${parsed.data.host} a ${await orgNameOf(orgId)}` });
  return done("Dominio añadido. Falta apuntar su DNS al hosting.");
}

export async function setPrimaryDomain(orgId: string, domainId: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(domainId).success) return bad("Datos no válidos.");
  const db = serviceClient();
  // primero quitar el principal actual: hay un índice único de un principal por medio
  const a = await db.from("org_domains").update({ is_primary: false }).eq("org_id", orgId);
  const b = await db.from("org_domains").update({ is_primary: true }).eq("id", domainId).eq("org_id", orgId).select("host").maybeSingle();
  if (a.error || b.error) return bad(`No se pudo cambiar: ${(a.error ?? b.error)!.message}`);
  await audit({ actor: me, action: "platform.domain.primary", orgId, targetType: "domain", targetId: b.data?.host ?? domainId, summary: `Hizo principal el dominio ${b.data?.host ?? domainId}` });
  return done("Dominio principal cambiado.");
}

export async function removeDomain(domainId: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(domainId).success) return bad("Datos no válidos.");
  const { data: dom, error } = await serviceClient().from("org_domains").delete().eq("id", domainId).select("host, org_id").maybeSingle();
  if (error) return bad(`No se pudo quitar: ${error.message}`);
  await audit({ actor: me, action: "platform.domain.removed", orgId: dom?.org_id, targetType: "domain", targetId: dom?.host ?? domainId, summary: `Quitó el dominio ${dom?.host ?? domainId}` });
  return done("Dominio quitado.");
}

export async function addSection(orgId: string, name: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z.object({ orgId: uuid, name: z.string().trim().min(2, "Escribe el nombre de la sección.").max(40) }).safeParse({ orgId, name });
  if (!parsed.success) return bad(firstIssue(parsed.error));
  const db = serviceClient();
  const { count } = await db.from("sections").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("parent_id", null);
  const { data: sec, error } = await db.from("sections").insert({ org_id: orgId, name: parsed.data.name, slug: slugify(parsed.data.name), position: count ?? 0 }).select("id").single();
  if (error) return bad(error.code === "23505" ? "Ya hay una sección con ese nombre." : `No se pudo añadir: ${error.message}`);
  await audit({ actor: me, action: "platform.section.added", orgId, targetType: "section", targetId: sec.id, summary: `Añadió la sección «${parsed.data.name}» a ${await orgNameOf(orgId)}` });
  return done("Sección añadida.");
}

export async function updateSection(id: string, fields: { name?: string; inMenu?: boolean }): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const parsed = z.object({ id: uuid, name: z.string().trim().min(2).max(40).optional(), inMenu: z.boolean().optional() }).safeParse({ id, ...fields });
  if (!parsed.success) return bad("Datos no válidos.");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.inMenu !== undefined) patch.in_menu = parsed.data.inMenu;
  const db = serviceClient();
  const { data: before } = await db.from("sections").select("name").eq("id", id).maybeSingle();
  const { data: sec, error } = await db.from("sections").update(patch).eq("id", id).select("name, org_id").maybeSingle();
  if (error) return bad(`No se pudo guardar: ${error.message}`);
  const summary = parsed.data.name !== undefined ? `Renombró la sección «${before?.name}» a «${parsed.data.name}»` : `${parsed.data.inMenu ? "Mostró" : "Ocultó"} la sección «${sec?.name}» en el menú`;
  await audit({ actor: me, action: "platform.section.updated", orgId: sec?.org_id, targetType: "section", targetId: id, summary });
  return done("Sección guardada.");
}

export async function moveSection(id: string, dir: -1 | 1): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(id).success) return bad("Datos no válidos.");
  const db = serviceClient();
  const { data: sec } = await db.from("sections").select("org_id, parent_id, name").eq("id", id).single();
  if (!sec) return bad("No existe esa sección.");
  let q = db.from("sections").select("id").eq("org_id", sec.org_id).order("position").order("name");
  q = sec.parent_id ? q.eq("parent_id", sec.parent_id) : q.is("parent_id", null);
  const { data: siblings } = await q;
  const ids = (siblings ?? []).map((s) => s.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return done("Sin cambios.");
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await Promise.all(ids.map((sid, position) => db.from("sections").update({ position }).eq("id", sid)));
  await audit({ actor: me, action: "platform.section.moved", orgId: sec.org_id, targetType: "section", targetId: id, summary: `Movió la sección «${sec.name}» ${dir < 0 ? "arriba" : "abajo"}` });
  return done("Orden guardado.");
}

export async function deleteSection(id: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(id).success) return bad("Datos no válidos.");
  const db = serviceClient();
  const { data: sec } = await db.from("sections").select("name, org_id").eq("id", id).maybeSingle();
  const { error } = await db.from("sections").delete().eq("id", id);
  if (error) return bad(error.code === "23503" ? "La sección tiene notas o subsecciones. Muévelas o bórralas antes." : `No se pudo borrar: ${error.message}`);
  await audit({ actor: me, action: "platform.section.deleted", orgId: sec?.org_id, targetType: "section", targetId: id, summary: `Borró la sección «${sec?.name ?? id}»` });
  return done("Sección borrada.");
}

// Te añade como dueño del medio y abre su panel (en local, con ?org=).
export async function enterOrgPanel(orgId: string) {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(orgId).success) return;
  const db = serviceClient();
  const { data: org } = await db.from("organizations").select("slug, name").eq("id", orgId).single();
  if (!org) return;
  await db.from("memberships").upsert({ org_id: orgId, user_id: me.id, role: "owner" }, { onConflict: "org_id,user_id" });
  await audit({ actor: me, action: "platform.org.entered_panel", orgId, targetType: "org", targetId: orgId, summary: `Entró al panel de ${org.name} como dueño` });
  if (process.env.NODE_ENV !== "production") redirect(`/admin?org=${org.slug}`);
  const { data: dom } = await db.from("org_domains").select("host").eq("org_id", orgId).order("is_primary", { ascending: false }).limit(1).maybeSingle();
  redirect(dom ? `https://${dom.host}/admin` : "/plataforma");
}

// Borra el medio y todo lo suyo (notas, secciones, equipo…) por la cascada.
export async function deleteOrg(_prev: PlatformResult | null, form: FormData): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const id = String(form.get("id") ?? "");
  const typed = String(form.get("confirm") ?? "").trim();
  if (!uuid.safeParse(id).success) return bad("Datos no válidos.");
  const db = serviceClient();
  const { data: org } = await db.from("organizations").select("slug, name").eq("id", id).single();
  if (!org) return bad("Ese medio ya no existe.");
  if (typed !== org.slug) return bad(`Escribe exactamente «${org.slug}» para confirmar.`);
  const { error } = await db.from("organizations").delete().eq("id", id);
  if (error) return bad(`No se pudo borrar: ${error.message}`);
  await audit({ actor: me, action: "platform.org.deleted", targetType: "org", targetId: id, summary: `Borró el medio «${org.name}» y todo su contenido` });
  revalidatePath("/plataforma", "layout");
  redirect("/plataforma?borrado=1");
}

// ------------------------------------------------------------------ contenido

export async function setArticleStatus(id: string, status: "draft" | "archived"): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(id).success || !["draft", "archived"].includes(status)) return bad("Datos no válidos.");
  const { data: art, error } = await serviceClient().from("articles").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("title, org_id").maybeSingle();
  if (error) return bad(`No se pudo cambiar: ${error.message}`);
  await audit({ actor: me, action: status === "draft" ? "platform.article.unpublished" : "platform.article.archived", orgId: art?.org_id, targetType: "article", targetId: id, summary: `${status === "draft" ? "Retiró" : "Archivó"} «${art?.title ?? id}»` });
  return done(status === "draft" ? "Nota retirada: vuelve a borrador." : "Nota archivada.");
}

export async function setFeatured(id: string, featured: boolean): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(id).success) return bad("Datos no válidos.");
  const { data: art, error } = await serviceClient().from("articles").update({ is_featured: featured }).eq("id", id).select("title, org_id").maybeSingle();
  if (error) return bad(`No se pudo cambiar: ${error.message}`);
  await audit({ actor: me, action: "platform.article.featured", orgId: art?.org_id, targetType: "article", targetId: id, summary: `${featured ? "Destacó" : "Quitó de destacadas"} «${art?.title ?? id}»` });
  return done(featured ? "Marcada como destacada." : "Ya no es destacada.");
}

export async function deleteArticleAny(id: string): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  if (!uuid.safeParse(id).success) return bad("Datos no válidos.");
  const { data: art, error } = await serviceClient().from("articles").delete().eq("id", id).select("title, org_id").maybeSingle();
  if (error) return bad(`No se pudo borrar: ${error.message}`);
  await audit({ actor: me, action: "platform.article.deleted", orgId: art?.org_id, targetType: "article", targetId: id, summary: `Borró «${art?.title ?? id}»` });
  return done("Nota borrada.");
}

// ------------------------------------------------------------------ sistema

export async function clearRateLimits(): Promise<PlatformResult> {
  const me = await requirePlatformAdmin();
  const { error } = await serviceClient().from("rate_limits").delete().not("key", "is", null);
  if (error) return bad(`No se pudo limpiar: ${error.message}`);
  await audit({ actor: me, action: "platform.system.rate_limits_cleared", summary: "Reinició los límites de uso" });
  return done("Límites de uso reiniciados.");
}
