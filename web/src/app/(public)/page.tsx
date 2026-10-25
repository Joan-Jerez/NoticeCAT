import Link from "next/link";
import { cookies } from "next/headers";
import { Newspaper } from "lucide-react";
import { getActivePoll, getSectionTree, listArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { cx } from "@/lib/cx";
import type { ArticleView } from "@/lib/types";
import { BlockHeading, EmptyState } from "@/components/ui/misc";
import { NumberedList, StoryCard } from "@/components/news/story-card";
import { PollBox } from "@/components/news/poll-box";

const i = (n: number) => ({ "--reveal-i": n }) as React.CSSProperties;

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
  const news = latest.filter((a) => !a.isSponsored && a.section.slug !== "opinion");
  const recent = take(news, 5);
  const briefs = take(news, 4);

  const tree = await getSectionTree(org.id);
  const opinionSection = tree.find((s) => s.slug === "opinion");
  const opinion = opinionSection ? (await listArticles(org.id, { sectionId: opinionSection.id }, { limit: 3 })).items : [];
  opinion.forEach((a) => used.add(a.id));
  const sponsored = latest.filter((a) => a.isSponsored).slice(0, 1);
  sponsored.forEach((a) => used.add(a.id));

  const blocks = (
    await Promise.all(
      tree
        .filter((s) => s.slug !== "opinion")
        .map(async (s) => ({ section: s, items: (await listArticles(org.id, { sectionId: s.id, excludeIds: [...used] }, { limit: 4 })).items })),
    )
  ).filter((b) => b.items.length >= 2);

  const poll = await getActivePoll(org.id);
  const voted = poll ? ((await cookies()).get(`voto-${poll.id}`)?.value ?? null) : null;

  return (
    <div className="container-page space-y-16 pt-8 md:pt-10">
      <h1 className="sr-only">{org.name}: portada</h1>

      {/* primera plana: breves | principal | lo más reciente, con filetes de columna */}
      <section aria-label="Primera plana" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:gap-0">
        <div className="lg:order-2 lg:px-8" data-reveal>
          <StoryCard article={lead} org={org} variant="lead" priority />
        </div>
        <aside aria-labelledby="h-breves" className="lg:order-1 lg:border-r lg:border-border lg:pr-8">
          <h2 id="h-breves" className="mb-4 border-b border-text pb-2 font-display text-title">En breve</h2>
          <ul className="divide-y divide-border">
            {briefs.map((a, n) => (
              <li key={a.id} data-reveal style={i(n)} className="py-4 first:pt-0 last:pb-0">
                <StoryCard article={a} org={org} variant="compact" withDek />
              </li>
            ))}
          </ul>
        </aside>
        <aside aria-labelledby="h-reciente" className="lg:order-3 lg:border-l lg:border-border lg:pl-8">
          <h2 id="h-reciente" className="mb-4 border-b border-text pb-2 font-display text-title">Lo más reciente</h2>
          <NumberedList articles={recent} org={org} />
          <Link href="/ultima-hora" className="group mt-4 inline-flex items-center gap-1 font-serif text-ui italic text-accent">
            <span className="link-grow">Toda la última hora</span>
            <span aria-hidden className="transition-transform duration-base ease-soft group-hover:translate-x-1">→</span>
          </Link>
        </aside>
      </section>

      {(opinion.length > 0 || poll) && (
        <section aria-labelledby="h-opinion" data-reveal className="bg-surface-tint px-6 py-10 md:px-12">
          <BlockHeading id="h-opinion" href="/opinion" linkLabel="Todas las columnas" center>
            Opinión
          </BlockHeading>
          <div className={cx("grid gap-10 md:divide-x md:divide-border md:gap-0", poll ? "md:grid-cols-3" : "md:grid-cols-2")}>
            {opinion.slice(0, poll ? 2 : 3).map((a, n) => (
              <div key={a.id} data-reveal style={i(n)} className="md:px-8">
                <StoryCard article={a} org={org} variant="opinion" />
              </div>
            ))}
            {poll && (
              <div data-reveal style={i(2)} className="md:px-8">
                <PollBox poll={poll} votedOptionId={voted} />
              </div>
            )}
          </div>
        </section>
      )}

      {blocks.map(({ section, items }, b) => {
        const [main, ...rest] = items;
        const mirrored = b % 2 === 1;
        // con pocas notas, dos columnas iguales para no dejar una foto enorme sola
        const cols = rest.length < 2 ? "lg:grid-cols-2" : mirrored ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]";
        return (
          <section key={section.id} aria-labelledby={`h-${section.slug}`} data-reveal>
            <BlockHeading id={`h-${section.slug}`} href={`/${section.slug}`}>
              {section.name}
            </BlockHeading>
            <div className={cx("grid gap-8 lg:gap-0", cols)}>
              <div className={cx(mirrored ? "lg:order-2 lg:border-l lg:border-border lg:pl-8" : "lg:border-r lg:border-border lg:pr-8")}>
                <StoryCard article={main!} org={org} variant="feature" />
              </div>
              <ul className={cx("divide-y divide-border", mirrored ? "lg:order-1 lg:pr-8" : "lg:pl-8")}>
                {rest.map((a, n) => (
                  <li key={a.id} data-reveal style={i(n + 1)} className="py-4 first:pt-0 last:pb-0">
                    <StoryCard article={a} org={org} variant="compact" withDek />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      {sponsored.length > 0 && (
        <section aria-label="Contenido patrocinado" data-reveal className="border border-border bg-surface p-6">
          <StoryCard article={sponsored[0]!} org={org} variant="row" />
        </section>
      )}
    </div>
  );
}
