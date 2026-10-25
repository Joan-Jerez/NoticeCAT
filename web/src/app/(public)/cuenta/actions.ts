"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit, safeNext, siteOrigin } from "@/lib/auth";
import { getCurrentOrg } from "@/lib/org";
import { serviceClient, sessionClient, supabaseEnabled } from "@/lib/supabase/server";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; done?: string };

const email = z.string().trim().toLowerCase().email("Escribe un correo válido.").max(254);
const password = z
  .string()
  .min(8, "Al menos 8 caracteres.")
  .max(72, "Máximo 72 caracteres.")
  .regex(/[a-zA-Z]/, "Incluye al menos una letra.")
  .regex(/\d/, "Incluye al menos un número.");

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return { error: "Revisa los campos marcados.", fieldErrors: out };
}

const offline = { error: "Las cuentas todavía no están conectadas a la base de datos." };
const tooMany = { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." };

// El lector queda registrado en el medio donde entra (un mismo correo puede leer varios medios).
async function ensureReader(db: Awaited<ReturnType<typeof sessionClient>>, userId: string, name?: string) {
  const org = await getCurrentOrg();
  await db.from("readers").upsert({ org_id: org.id, user_id: userId, display_name: name || null }, { onConflict: "org_id,user_id", ignoreDuplicates: true });
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseEnabled) return offline;
  const parsed = z.object({ email, password: z.string().min(1, "Escribe tu contraseña.").max(72) }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("signin", 10, 600))) return tooMany;

  const db = await sessionClient();
  const { data, error } = await db.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirma tu correo antes de entrar: te enviamos un enlace al registrarte." };
    // mismo mensaje si el correo no existe o la contraseña falla: no revela qué cuentas hay
    return { error: "Correo o contraseña incorrectos." };
  }
  await ensureReader(db, data.user.id);
  redirect(safeNext(form.get("siguiente")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseEnabled) return offline;
  const parsed = z
    .object({ name: z.string().trim().min(1, "Escribe tu nombre.").max(80, "Máximo 80 caracteres."), email, password })
    .safeParse({ name: form.get("nombre"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("signup", 5, 3600))) return tooMany;

  const db = await sessionClient();
  const { error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name }, emailRedirectTo: `${await siteOrigin()}/auth/callback?siguiente=/cuenta` },
  });
  if (error && error.code === "weak_password") return { error: "Esa contraseña es demasiado fácil de adivinar.", fieldErrors: { password: "Prueba con otra más larga." } };
  if (error && error.code !== "user_already_exists") return { error: "No pudimos crear la cuenta. Inténtalo de nuevo en un momento." };
  // mismo mensaje aunque el correo ya exista: no revela qué cuentas hay
  return { done: `Te enviamos un enlace a ${parsed.data.email}. Ábrelo para activar tu cuenta.` };
}

export async function requestReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseEnabled) return offline;
  const parsed = z.object({ email }).safeParse({ email: form.get("email") });
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("reset", 5, 3600))) return tooMany;

  const db = await sessionClient();
  await db.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${await siteOrigin()}/auth/callback?siguiente=/cuenta/nueva-clave` });
  return { done: "Si ese correo tiene cuenta, te llegará un enlace para elegir una contraseña nueva." };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseEnabled) return offline;
  const parsed = z.object({ password }).safeParse({ password: form.get("password") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const db = await sessionClient();
  const { error } = await db.auth.updateUser({ password: parsed.data.password });
  if (error?.code === "same_password") return { error: "Elige una contraseña distinta de la anterior." };
  if (error) return { error: "El enlace caducó. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  redirect("/cuenta?clave=1");
}

export async function signOut(form: FormData) {
  if (!supabaseEnabled) redirect("/");
  const db = await sessionClient();
  // "global" invalida las sesiones de todos los dispositivos
  await db.auth.signOut({ scope: form.get("todas") === "1" ? "global" : "local" });
  redirect("/");
}

// Borra de verdad: auth.users en cascada a readers y topic_follows; los votos quedan anónimos.
export async function deleteAccount(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseEnabled) return offline;
  if (form.get("confirmar") !== "BORRAR") return { error: "Escribe BORRAR para confirmar.", fieldErrors: { confirmar: "Escribe BORRAR en mayúsculas." } };
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/cuenta/entrar");
  const admin = serviceClient();
  const { count } = await admin.from("memberships").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "owner");
  if (count) return { error: "Eres dueño de un medio. Pasa la propiedad a otra persona antes de borrar tu cuenta." };
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "No pudimos borrar la cuenta. Inténtalo de nuevo." };
  await db.auth.signOut({ scope: "local" });
  redirect("/?cuenta-borrada=1");
}

export async function signInWithProvider(form: FormData) {
  if (!supabaseEnabled) redirect("/cuenta/entrar");
  const provider = z.enum(["google", "facebook"]).safeParse(form.get("provider"));
  if (!provider.success) redirect("/cuenta/entrar");
  const db = await sessionClient();
  const next = safeNext(form.get("siguiente"));
  const { data, error } = await db.auth.signInWithOAuth({
    provider: provider.data,
    options: { redirectTo: `${await siteOrigin()}/auth/callback?siguiente=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/cuenta/entrar?error=oauth");
  redirect(data.url);
}
