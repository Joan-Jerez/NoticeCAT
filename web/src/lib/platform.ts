import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { dateParts } from "./format";
import { normalizeTheme, type OrgTheme } from "./theme";
import type { OrgContact, OrgSocial, Role } from "./types";
import { serviceClient, sessionClient, supabaseEnabled } from "./supabase/server";

// Panel de plataforma (IT): ve todos los medios y usuarios. Solo entran los
// correos de NOTICECAT_PLATFORM_ADMINS, con el correo ya confirmado: así nadie
// puede registrarse con ese correo y entrar sin haberlo verificado.
export type PlatformAdmin = { id: string; email: string };

function allowedEmails() {
  return (process.env.NOTICECAT_PLATFORM_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// También lo usa el inicio de sesión para mandar a IT directo a su panel.
export function isPlatformAdminUser(user: { email?: string | null; email_confirmed_at?: string | null } | null) {
  return !!user?.email && !!user.email_confirmed_at && allowedEmails().includes(user.email.toLowerCase());
}

export const getPlatformAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  if (!supabaseEnabled) return null;
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || !isPlatformAdminUser(user)) return null;
  return { id: user.id, email: user.email! };
});

// Para cualquier otra persona la ruta no existe: 404, sin pistas.
export async function requirePlatformAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) notFound();
  return admin;
}

export type OrgRow = {
  id: string;
  name: string;
  slug: string;
  host: string | null;
  createdAt: string;
  plan: string;
  billingStatus: string;
  staff: number;
  readers: number;
  published: number;
  drafts: number;
  lastPublishedAt: string | null;
};

export type UserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  banned: boolean;
  memberships: { orgId: string; role: Role }[];
  readerOf: string[];
};

function fail(what: string, error: { message: string } | null) {
  if (error) throw new Error(`Supabase (${what}): ${error.message}`);
}

export async function listOrgs(): Promise<OrgRow[]> {
  await requirePlatformAdmin();
  const db = serviceClient();
  const [orgs, domains, billing] = await Promise.all([
    db.from("organizations").select("id, name, slug, created_at").order("name"),
    db.from("org_domains").select("org_id, host, is_primary"),
    db.from("org_billing").select("org_id, plan, status"),
  ]);
  fail("medios", orgs.error);
  fail("dominios", domains.error);
  fail("facturación", billing.error);

  const count = async (table: string, orgId: string, extra?: { status: string }) => {
    let q = db.from(table).select("id", { count: "exact", head: true }).eq("org_id", orgId);
    if (extra) q = q.eq("status", extra.status);
    const { count: n, error } = await q;
    fail(table, error);
    return n ?? 0;
  };

  return Promise.all(
    orgs.data!.map(async (o) => {
      const [staff, readers, published, drafts, last] = await Promise.all([
        count("memberships", o.id),
        count("readers", o.id),
        count("articles", o.id, { status: "published" }),
        count("articles", o.id, { status: "draft" }),
        db.from("articles").select("published_at").eq("org_id", o.id).eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      fail("última nota", last.error);
      const ds = domains.data!.filter((d) => d.org_id === o.id);
      const bill = billing.data!.find((b) => b.org_id === o.id);
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        host: (ds.find((d) => d.is_primary) ?? ds[0])?.host ?? null,
        createdAt: o.created_at,
        plan: bill?.plan ?? "trial",
        billingStatus: bill?.status ?? "trialing",
        staff,
        readers,
        published,
        drafts,
        lastPublishedAt: last.data?.published_at ?? null,
      };
    }),
  );
}

export async function listUsers(): Promise<UserRow[]> {
  await requirePlatformAdmin();
  const db = serviceClient();
  const [auth, members, readers] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 500 }),
    db.from("memberships").select("org_id, user_id, role"),
    db.from("readers").select("org_id, user_id"),
  ]);
  fail("usuarios", auth.error);
  fail("equipos", members.error);
  fail("lectores", readers.error);

  return auth.data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.name as string | undefined) ?? "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      confirmed: !!u.email_confirmed_at,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      memberships: members.data!.filter((m) => m.user_id === u.id).map((m) => ({ orgId: m.org_id, role: m.role as Role })),
      readerOf: readers.data!.filter((r) => r.user_id === u.id).map((r) => r.org_id),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  timezone: string;
  locale: string;
  plan: string;
  billingStatus: string;
  domains: { id: string; host: string; isPrimary: boolean }[];
  sections: { id: string; name: string; slug: string; parentId: string | null; position: number; inMenu: boolean; articles: number }[];
  team: { userId: string; email: string; role: Role }[];
  theme: OrgTheme;
  social: OrgSocial;
  contact: OrgContact;
  logo: { src: string; width: number; height: number } | null;
};

export async function getOrgDetail(id: string): Promise<OrgDetail | null> {
  await requirePlatformAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = serviceClient();
  const [org, domains, billing, sections, articles, members, auth] = await Promise.all([
    db.from("organizations").select("id, name, slug, tagline, timezone, locale, settings, logo:images!logo_image_id(storage_path, width, height)").eq("id", id).maybeSingle(),
    db.from("org_domains").select("id, host, is_primary").eq("org_id", id).order("host"),
    db.from("org_billing").select("plan, status").eq("org_id", id).maybeSingle(),
    db.from("sections").select("id, name, slug, parent_id, position, in_menu").eq("org_id", id).order("position"),
    db.from("articles").select("section_id").eq("org_id", id),
    db.from("memberships").select("user_id, role").eq("org_id", id),
    db.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ]);
  for (const [what, r] of [["medio", org], ["dominios", domains], ["facturación", billing], ["secciones", sections], ["notas", articles], ["equipo", members]] as const) fail(what, r.error);
  fail("usuarios", auth.error);
  if (!org.data) return null;
  const perSection = new Map<string, number>();
  for (const a of articles.data!) perSection.set(a.section_id, (perSection.get(a.section_id) ?? 0) + 1);
  return {
    id: org.data.id,
    name: org.data.name,
    slug: org.data.slug,
    tagline: org.data.tagline,
    timezone: org.data.timezone,
    locale: org.data.locale,
    plan: billing.data?.plan ?? "trial",
    billingStatus: billing.data?.status ?? "trialing",
    domains: domains.data!.map((d) => ({ id: d.id, host: d.host, isPrimary: d.is_primary })),
    sections: sections.data!.map((s) => ({ id: s.id, name: s.name, slug: s.slug, parentId: s.parent_id, position: s.position, inMenu: s.in_menu, articles: perSection.get(s.id) ?? 0 })),
    theme: normalizeTheme((org.data.settings as { theme?: unknown } | null)?.theme),
    social: (org.data.settings as { social?: OrgSocial } | null)?.social ?? {},
    contact: (org.data.settings as { contact?: OrgContact } | null)?.contact ?? {},
    logo: (() => {
      const l = org.data.logo as unknown as { storage_path: string; width: number | null; height: number | null } | null;
      if (!l) return null;
      const src = l.storage_path.startsWith("/") ? l.storage_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${l.storage_path}`;
      return { src, width: l.width ?? 400, height: l.height ?? 100 };
    })(),
    team: members.data!.map((m) => ({ userId: m.user_id, role: m.role as Role, email: auth.data.users.find((u) => u.id === m.user_id)?.email ?? "?" })),
  };
}

export type ContentRow = {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  status: string;
  isFeatured: boolean;
  section: string;
  publishedAt: string | null;
  updatedAt: string;
  url: string | null;
};

export async function listContent(filter: { orgId?: string; status?: string; q?: string }): Promise<ContentRow[]> {
  await requirePlatformAdmin();
  const db = serviceClient();
  let q = db
    .from("articles")
    .select("id, org_id, number, slug, title, status, is_featured, published_at, updated_at, section:sections!section_id(name, slug, parent:sections!parent_id(slug)), org:organizations(name, timezone)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filter.orgId && /^[0-9a-f-]{36}$/i.test(filter.orgId)) q = q.eq("org_id", filter.orgId);
  if (filter.status && ["draft", "scheduled", "published", "archived"].includes(filter.status)) q = q.eq("status", filter.status);
  if (filter.q?.trim()) q = q.ilike("title", `%${filter.q.trim().replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  fail("notas", error);
  type Row = { id: string; org_id: string; number: number; slug: string; title: string; status: string; is_featured: boolean; published_at: string | null; updated_at: string; section: { name: string; slug: string; parent: { slug: string } | null } | null; org: { name: string; timezone: string } | null };
  return (data as unknown as Row[]).map((a) => {
    const sec = a.section;
    const path = sec ? (sec.parent ? `${sec.parent.slug}/${sec.slug}` : sec.slug) : null;
    const d = a.published_at && a.org ? dateParts(a.published_at, a.org.timezone) : null;
    const day = d ? `${d.yyyy}/${d.mm}/${d.dd}` : null;
    return {
      id: a.id,
      orgId: a.org_id,
      orgName: a.org?.name ?? "?",
      title: a.title,
      status: a.status,
      isFeatured: a.is_featured,
      section: sec?.name ?? "—",
      publishedAt: a.published_at,
      updatedAt: a.updated_at,
      url: a.status === "published" && path && day ? `/${path}/${day}/${a.slug}/${a.number}` : null,
    };
  });
}

export type SystemInfo = {
  env: { name: string; set: boolean; note: string }[];
  dbOk: boolean;
  dbError: string | null;
  rateLimitRows: number;
  stripeEvents: number;
  polls: number;
  votes: number;
};

export async function getSystemInfo(): Promise<SystemInfo> {
  await requirePlatformAdmin();
  const db = serviceClient();
  const head = (t: string) => db.from(t).select("*", { count: "exact", head: true });
  const [orgs, rl, se, po, pv] = await Promise.all([head("organizations"), head("rate_limits"), head("stripe_events"), head("polls"), head("poll_votes")]);
  const has = (n: string) => !!process.env[n];
  return {
    env: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", set: has("NEXT_PUBLIC_SUPABASE_URL"), note: "Proyecto de Supabase" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"), note: "Clave pública" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", set: has("SUPABASE_SERVICE_ROLE_KEY"), note: "Clave de servidor (salta RLS)" },
      { name: "NOTICECAT_HASH_SALT", set: has("NOTICECAT_HASH_SALT"), note: "Sal de votos y límites" },
      { name: "NOTICECAT_PLATFORM_ADMINS", set: has("NOTICECAT_PLATFORM_ADMINS"), note: "Acceso a este panel" },
      { name: "RESEND_API_KEY", set: has("RESEND_API_KEY"), note: "Correo propio (pendiente)" },
      { name: "STRIPE_SECRET_KEY", set: has("STRIPE_SECRET_KEY"), note: "Pagos (milestone 5)" },
    ],
    dbOk: !orgs.error,
    dbError: orgs.error?.message ?? null,
    rateLimitRows: rl.count ?? 0,
    stripeEvents: se.count ?? 0,
    polls: po.count ?? 0,
    votes: pv.count ?? 0,
  };
}

export type AuditRow = {
  id: number;
  at: string;
  actorId: string | null;
  actorEmail: string | null;
  orgId: string | null;
  action: string;
  summary: string;
  ipHash: string | null;
};

export type AuditFilter = { actor?: string; org?: string; group?: string; from?: string; to?: string; before?: string };

const AUDIT_GROUPS: Record<string, string> = { cuentas: "auth.%", notas: "article.%", temas: "topic.%", plataforma: "platform.%" };
const PAGE = 100;

// Registro de acciones, del más reciente al más antiguo, de 100 en 100.
// missing: la tabla aún no existe (falta aplicar la migración).
export async function listAudit(f: AuditFilter): Promise<{ rows: AuditRow[]; next: string | null; missing: boolean }> {
  await requirePlatformAdmin();
  const isId = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);
  const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  let q = serviceClient().from("audit_log").select("id, at, actor_id, actor_email, org_id, action, summary, ip_hash").order("id", { ascending: false }).limit(PAGE + 1);
  if (isId(f.actor)) q = q.eq("actor_id", f.actor!);
  if (isId(f.org)) q = q.eq("org_id", f.org!);
  if (f.group && AUDIT_GROUPS[f.group]) q = q.like("action", AUDIT_GROUPS[f.group]!);
  // los días se cuentan en hora de Santo Domingo (UTC-4, sin horario de verano)
  if (isDay(f.from)) q = q.gte("at", `${f.from}T00:00:00-04:00`);
  if (isDay(f.to)) q = q.lte("at", `${f.to}T23:59:59.999-04:00`);
  if (f.before && /^\d+$/.test(f.before)) q = q.lt("id", Number(f.before));
  const { data, error } = await q;
  if (error?.code === "42P01" || error?.message.includes("audit_log")) return { rows: [], next: null, missing: true };
  fail("registro", error);
  const rows = data!.slice(0, PAGE).map((r) => ({
    id: r.id,
    at: r.at,
    actorId: r.actor_id,
    actorEmail: r.actor_email,
    orgId: r.org_id,
    action: r.action,
    summary: r.summary,
    ipHash: r.ip_hash,
  }));
  return { rows, next: data!.length > PAGE ? String(rows.at(-1)!.id) : null, missing: false };
}
