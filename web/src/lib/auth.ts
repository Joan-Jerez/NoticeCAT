import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";
import { serviceClient, sessionClient, supabaseEnabled } from "./supabase/server";

export type SessionUser = { id: string; email: string; name: string };

// Usuario de la sesión (cookie http-only de Supabase). getUser() valida el
// token contra Supabase Auth; nunca confiamos en lo que diga la cookie sola.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!supabaseEnabled) return null;
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "", name: (user.user_metadata?.name as string | undefined) ?? "" };
});

// Proveedores OAuth activos en el proyecto (Google, Facebook): solo se muestran los que el medio configuró.
export const getOAuthProviders = cache(async (): Promise<("google" | "facebook")[]> => {
  if (!supabaseEnabled) return [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 300 },
    });
    const { external } = (await res.json()) as { external?: Record<string, boolean> };
    return (["google", "facebook"] as const).filter((p) => external?.[p]);
  } catch {
    return [];
  }
});

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

// Límite por IP (hash, nunca la IP en claro) con ventana fija en la base.
// Sin Supabase no hay dónde contarlo y deja pasar.
export async function rateLimit(action: string, max: number, windowSeconds: number) {
  if (!supabaseEnabled) return true;
  const ip = createHash("sha256")
    .update(`${await clientIp()}|${process.env.NOTICECAT_HASH_SALT ?? ""}`)
    .digest("hex")
    .slice(0, 32);
  const { data, error } = await serviceClient().rpc("hit_rate_limit", { p_key: `${action}:${ip}`, p_max: max, p_window_seconds: windowSeconds });
  if (error) throw new Error(`Supabase (límite de uso): ${error.message}`);
  return data === true;
}

// Origen público del sitio para los enlaces de los emails (confirmar, recuperar).
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

// Solo rutas internas como destino tras entrar: evita redirecciones abiertas.
export function safeNext(next: unknown, fallback = "/cuenta") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
