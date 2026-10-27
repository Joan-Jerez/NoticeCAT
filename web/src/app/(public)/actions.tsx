"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTagBySlug, listArticles, searchArticles, votePoll, type ArticleFilter } from "@/lib/data";
import { audit } from "@/lib/audit";
import { getSessionUser, rateLimit } from "@/lib/auth";
import { setFollowing } from "@/lib/follows";
import { getCurrentOrg } from "@/lib/org";
import { StoryList } from "@/components/news/story-card";

// "Ver más notas". El medio sale del servidor, nunca del cliente.
export async function loadMore(filter: ArticleFilter & { q?: string; withDek?: boolean }, cursor: string) {
  const org = await getCurrentOrg();
  const { q, withDek, ...rest } = filter;
  const page = q ? await searchArticles(org.id, q, { cursor }) : await listArticles(org.id, rest, { cursor });
  return { html: <StoryList articles={page.items} org={org} withDek={withDek} />, nextCursor: page.nextCursor };
}

// Un voto por navegador (cookie) y, con Supabase, por voter_hash con índice único en la base.
export async function vote(pollId: string, optionId: string) {
  const org = await getCurrentOrg();
  if (!(await rateLimit("vote", 20, 600))) return { ok: false as const, error: "Demasiados intentos. Espera unos minutos." };
  const jar = await cookies();
  const key = `voto-${pollId}`;
  if (jar.get(key)) return { ok: false as const, error: "Ya votaste en esta encuesta." };
  const res = await votePoll(org.id, pollId, optionId);
  if (!res.ok) return res;
  jar.set(key, optionId, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/");
  return { ok: true as const };
}

// Seguir o dejar de seguir un tema. El tema se busca en el medio actual: un id de otro medio no sirve.
export async function toggleFollow(form: FormData) {
  const org = await getCurrentOrg();
  const slug = String(form.get("slug") ?? "");
  const tag = await getTagBySlug(org.id, slug);
  if (!tag || tag.kind !== "topic") return;
  if (!(await getSessionUser())) redirect(`/cuenta/entrar?seguir=${encodeURIComponent(slug)}`);
  const follow = form.get("seguir") === "1";
  await setFollowing(org.id, tag.id, follow);
  await audit({ action: follow ? "topic.followed" : "topic.unfollowed", summary: `${follow ? "Empezó a seguir" : "Dejó de seguir"} el tema «${tag.name}»`, orgId: org.id, targetType: "tag", targetId: tag.id });
  revalidatePath(`/tema/${slug}`);
}
