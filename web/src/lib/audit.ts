import "server-only";
import { getSessionUser, hashedIp } from "./auth";
import { serviceClient, supabaseEnabled } from "./supabase/server";

export type AuditActor = { id: string; email: string } | null;

export type AuditEntry = {
  action: string;
  summary: string;
  orgId?: string | null;
  targetType?: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
  // sin indicar: el usuario de la sesión; null: nadie (por ejemplo, un intento fallido)
  actor?: AuditActor;
};

// Apunta una acción en audit_log. Nunca lanza: si el registro falla (por
// ejemplo, la migración aún no está aplicada), la acción del usuario sigue.
export async function audit(entry: AuditEntry) {
  if (!supabaseEnabled) return;
  try {
    const actor = entry.actor !== undefined ? entry.actor : await getSessionUser();
    const { error } = await serviceClient()
      .from("audit_log")
      .insert({
        actor_id: actor?.id ?? null,
        actor_email: actor?.email ?? null,
        org_id: entry.orgId ?? null,
        action: entry.action,
        target_type: entry.targetType ?? null,
        target_id: entry.targetId ?? null,
        summary: entry.summary.slice(0, 500),
        details: entry.details ?? {},
        ip_hash: await hashedIp(),
      });
    if (error) console.error(`[audit] ${entry.action}: ${error.message}`);
  } catch (e) {
    console.error(`[audit] ${entry.action}:`, e);
  }
}

// Título de una nota para el resumen del registro (se lee antes de borrarla).
export async function articleTitle(id: string) {
  if (!supabaseEnabled) return null;
  const { data } = await serviceClient().from("articles").select("title").eq("id", id).maybeSingle();
  return data?.title ?? null;
}
