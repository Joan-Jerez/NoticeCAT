import "server-only";
import { getSessionUser } from "./auth";
import { sessionClient, supabaseEnabled } from "./supabase/server";

// Temas que sigue el lector en este medio. RLS: cada lector solo ve y toca lo suyo.
async function readerId(orgId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const db = await sessionClient();
  const { data } = await db.from("readers").select("id").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (data) return data.id as string;
  const { data: created } = await db.from("readers").insert({ org_id: orgId, user_id: user.id, display_name: user.name || null }).select("id").single();
  return (created?.id as string | undefined) ?? null;
}

export async function isFollowing(orgId: string, tagId: string) {
  if (!supabaseEnabled || !(await getSessionUser())) return false;
  const db = await sessionClient();
  const { count } = await db.from("topic_follows").select("tag_id, readers!inner(org_id)", { count: "exact", head: true }).eq("tag_id", tagId).eq("readers.org_id", orgId);
  return !!count;
}

export async function setFollowing(orgId: string, tagId: string, follow: boolean) {
  const id = await readerId(orgId);
  if (!id) return false;
  const db = await sessionClient();
  const { error } = follow
    ? await db.from("topic_follows").upsert({ reader_id: id, tag_id: tagId }, { onConflict: "reader_id,tag_id", ignoreDuplicates: true })
    : await db.from("topic_follows").delete().eq("reader_id", id).eq("tag_id", tagId);
  if (error) throw new Error(`Supabase (seguir tema): ${error.message}`);
  return true;
}

export async function listFollowing(orgId: string): Promise<{ name: string; slug: string }[]> {
  if (!supabaseEnabled || !(await getSessionUser())) return [];
  const db = await sessionClient();
  const { data } = await db.from("topic_follows").select("tag:tags(name, slug), readers!inner(org_id)").eq("readers.org_id", orgId);
  return (data ?? []).flatMap((r) => (r.tag ? [r.tag as unknown as { name: string; slug: string }] : [])).sort((a, b) => a.name.localeCompare(b.name, "es"));
}
