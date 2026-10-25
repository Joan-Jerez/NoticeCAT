"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { listArticles, searchArticles, votePoll, type ArticleFilter } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { StoryList } from "@/components/news/story-card";

// "Ver más notas". El medio sale del servidor, nunca del cliente.
export async function loadMore(filter: ArticleFilter & { q?: string; withDek?: boolean }, cursor: string) {
  const org = await getCurrentOrg();
  const { q, withDek, ...rest } = filter;
  const page = q ? await searchArticles(org.id, q, { cursor }) : await listArticles(org.id, rest, { cursor });
  return { html: <StoryList articles={page.items} org={org} withDek={withDek} />, nextCursor: page.nextCursor };
}

// Un voto por navegador (cookie). La versión real usa voter_hash + índice único.
export async function vote(pollId: string, optionId: string) {
  const org = await getCurrentOrg();
  const jar = await cookies();
  const key = `voto-${pollId}`;
  if (jar.get(key)) return { ok: false as const, error: "Ya votaste en esta encuesta." };
  const res = await votePoll(org.id, pollId, optionId);
  if (!res.ok) return res;
  jar.set(key, optionId, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/");
  return { ok: true as const };
}
