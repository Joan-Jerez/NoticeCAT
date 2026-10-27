import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Newspaper } from "lucide-react";
import { getActivePoll, getSectionTree, listArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { formatLongDate } from "@/lib/format";
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
  const recent = take(news, 4);

  const tree = await getSectionTree(org.id);
  const opinionSection = tree.find((s) => s.slug === "opinion");
  const opinion = opinionSection ? (await listArticles(org.id, { sectionId: opinionSection.id }, { limit: 3 })).items : [];
  opinion.forEach((a) => used.add(a.id));

  const blocks = (
    await Promise.all(
      tree
        .filter((s) => s.slug !== "opinion")
        .map(async (s) => ({ section: s, items: (await listArticles(org.id, { sectionId: s.id, excludeIds: [...used] }, { limit: 3 })).items })),
    )
  ).filter((b) => b.items.length >= 2).slice(0, 3);

  const poll = await getActivePoll(org.id);
  const voted = poll ? ((await cookies()).get(`voto-${poll.id}`)?.value ?? null) : null;
  const today = formatLongDate(new Date().toISOString(), org);

  return (
    <div className="container-page space-y-12 pt-6 md:space-y-14 md:pt-8">
      <h1 className="sr-only">{org.name}: portada</h1>

      {/* apertura: la historia principal grande y "Lo último" al lado */}
      <section aria-label="Apertura">
        <p className="mb-4 flex items-center gap-2 text-ui-sm text-text-muted">
          <span className="font-semibold text-text first-letter:uppercase">{today}</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span className="hidden font-serif italic sm:inline">{org.tagline}</span>
        </p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
          <div data-reveal>
            <StoryCard article={lead} org={org} variant="lead" priority />
          </div>
          <aside aria-labelledby="h-ultimo" data-reveal style={i(1)} className="flex flex-col rounded-lg bg-surface p-6">
            <h2 id="h-ultimo" className="flex items-center gap-2 font-display text-title font-semibold">
              <span aria-hidden className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
              </span>
              Lo último
            </h2>
            <div className="mt-4 flex-1">
              <NumberedList articles={recent} org={org} />
            </div>
            <Link href="/ultima-hora" className="group press mt-4 inline-flex items-center justify-center gap-1.5 rounded-pill bg-raised px-4 py-2.5 text-ui-sm font-semibold hover:bg-accent hover:text-on-accent">
              Toda la última hora
              <ArrowRight className="size-3.5 transition-transform duration-base ease-soft group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </aside>
        </div>
      </section>

      {/* opinión: banda oscura con las columnas y la encuesta */}
      {(opinion.length > 0 || poll) && (
        <section aria-labelledby="h-opinion" data-reveal className="rounded-lg bg-inverse px-6 py-10 text-on-inverse md:px-10 md:py-12">
          <BlockHeading id="h-opinion" href="/opinion" linkLabel="Todas las columnas" tone="inverse">
            Opinión
          </BlockHeading>
          <div className={cx("grid gap-10", poll && opinion.length > 0 && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]")}>
            {opinion.length > 0 && (
              <ul className="divide-y divide-inverse-border">
                {opinion.map((a, n) => (
                  <li key={a.id} data-reveal style={i(n)} className="py-6 first:pt-0 last:pb-0">
                    <StoryCard article={a} org={org} variant="opinion" />
                  </li>
                ))}
              </ul>
            )}
            {poll && (
              <div data-reveal style={i(2)} className="text-text">
                <PollBox poll={poll} votedOptionId={voted} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* secciones: se alternan una fila de cuatro y una ancha con dos */}
      {blocks.map(({ section, items }, b) => {
        // con dos notas, dos tarjetas anchas; con más, se alterna fila de cuatro y una ancha con dos
        const pair = items.length === 2;
        const alt = !pair && b % 2 === 1;
        return (
          <section key={section.id} aria-labelledby={`h-${section.slug}`} data-reveal>
            <BlockHeading id={`h-${section.slug}`} href={`/${section.slug}`}>
              {section.name}
            </BlockHeading>
            {pair ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {items.map((a, n) => (
                  <div key={a.id} data-reveal style={i(n)}>
                    <StoryCard article={a} org={org} variant="wide" />
                  </div>
                ))}
              </div>
            ) : alt ? (
              <div className="grid gap-6 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <StoryCard article={items[0]!} org={org} variant="wide" />
                </div>
                {items.slice(1, 3).map((a, n) => (
                  <div key={a.id} data-reveal style={i(n + 1)}>
                    <StoryCard article={a} org={org} variant="standard" />
                  </div>
                ))}
              </div>
            ) : (
              <div className={cx("grid gap-6 sm:grid-cols-2", items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
                {items.map((a, n) => (
                  <div key={a.id} data-reveal style={i(n)}>
                    <StoryCard article={a} org={org} variant="standard" />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

    </div>
  );
}
