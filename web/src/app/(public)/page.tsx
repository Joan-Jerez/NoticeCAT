import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getActivePoll, getSectionTree, listArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { cookies } from "next/headers";
import type { ArticleView } from "@/lib/types";
import { BlockHeading, EmptyState } from "@/components/ui/misc";
import { StoryCard, StoryList } from "@/components/news/story-card";
import { PollBox } from "@/components/news/poll-box";

export default async function Home() {
  const org = await getCurrentOrg();
  const latest = (await listArticles(org.id, {}, { limit: 40 })).items;

  if (latest.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Newspaper} title="La portada está vacía">
          Publica la primera nota desde el panel y aparecerá aquí.
        </EmptyState>
      </div>
    );
  }

  // destacada: la marcada como tal más reciente; si no, la última con foto
  const lead = latest.find((a) => a.isFeatured && a.cover) ?? latest.find((a) => a.cover) ?? latest[0]!;
  const used = new Set([lead.id]);
  const take = (list: ArticleView[], n: number) => {
    const out = list.filter((a) => !used.has(a.id)).slice(0, n);
    out.forEach((a) => used.add(a.id));
    return out;
  };

  const top = take(latest.filter((a) => !a.isSponsored && a.section.slug !== "opinion"), 5);
  const tree = await getSectionTree(org.id);
  const opinionSection = tree.find((s) => s.slug === "opinion");
  const opinion = opinionSection ? (await listArticles(org.id, { sectionId: opinionSection.id }, { limit: 3 })).items : [];
  opinion.forEach((a) => used.add(a.id));
  const sponsored = latest.filter((a) => a.isSponsored).slice(0, 1);

  const blocks = await Promise.all(
    tree
      .filter((s) => s.slug !== "opinion")
      .map(async (s) => ({ section: s, items: (await listArticles(org.id, { sectionId: s.id, excludeIds: [...used] }, { limit: 4 })).items })),
  );

  const poll = await getActivePoll(org.id);
  const voted = poll ? (await cookies()).get(`voto-${poll.id}`)?.value ?? null : null;

  return (
    <div className="container-page space-y-16 pt-8 md:pt-10">
      <h1 className="sr-only">{org.name}: portada</h1>

      <section aria-label="Noticias principales" className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <StoryCard article={lead} org={org} variant="lead" priority />
        <div className="lg:border-l lg:border-border lg:pl-8">
          <h2 className="mb-4 border-b-2 border-text pb-2 font-display text-title">Lo último</h2>
          <StoryList articles={top} org={org} />
          <Link href="/ultima-hora" className="mt-4 inline-block text-ui-sm font-semibold text-accent hover:underline">
            Toda la última hora
          </Link>
        </div>
      </section>

      {(opinion.length > 0 || poll) && (
        <section aria-labelledby="h-opinion" className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {opinion.length > 0 && (
            <div>
              <BlockHeading id="h-opinion" href="/opinion">Opinión</BlockHeading>
              <ul className="grid gap-6 sm:grid-cols-3">
                {opinion.map((a) => (
                  <li key={a.id}>
                    <StoryCard article={a} org={org} variant="opinion" />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {poll && <PollBox poll={poll} votedOptionId={voted} />}
        </section>
      )}

      {blocks
        .filter((b) => b.items.length >= 2)
        .map(({ section, items }) => (
          <section key={section.id} aria-labelledby={`h-${section.slug}`}>
            <BlockHeading id={`h-${section.slug}`} href={`/${section.slug}`}>
              {section.name}
            </BlockHeading>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((a) => (
                <li key={a.id}>
                  <StoryCard article={a} org={org} variant="standard" />
                </li>
              ))}
            </ul>
          </section>
        ))}

      {sponsored.length > 0 && (
        <section aria-label="Contenido patrocinado" className="rounded-xs border border-border bg-surface p-6">
          <StoryCard article={sponsored[0]!} org={org} variant="row" />
        </section>
      )}
    </div>
  );
}
