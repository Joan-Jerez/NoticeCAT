import Link from "next/link";
import { Plus } from "lucide-react";
import { listArticles } from "@/lib/data";
import { dayKey } from "@/lib/format";
import type { ArticleView, Organization } from "@/lib/types";
import { Avatar, BlockHeading, Eyebrow, Ornament, Timestamp } from "@/components/ui/misc";
import { ReadingProgress } from "@/components/motion/reading-progress";
import { ArticleBody } from "./article-body";
import { Figure } from "./figure";
import { ShareBar } from "./share-bar";
import { StoryCard } from "./story-card";

export async function ArticlePage({ article: a, org, preview = false }: { article: ArticleView; org: Organization; preview?: boolean }) {
  const sectionHref = a.parentSection ? `/${a.parentSection.slug}/${a.section.slug}` : `/${a.section.slug}`;
  const more = (await listArticles(org.id, { sectionId: (a.parentSection ?? a.section).id, excludeIds: [a.id] }, { limit: 4 })).items;
  const topics = a.tags.filter((t) => t.kind === "topic");

  return (
    <article id="nota" className="container-page pt-6 md:pt-10">
      {!preview && <ReadingProgress targetId="nota-cuerpo" />}

      <nav aria-label="Ruta" className="mx-auto max-w-article text-center text-caption text-text-muted">
        <ol className="inline-flex flex-wrap justify-center gap-1">
          <li>
            <Link href="/" className="hover:underline">Portada</Link> /
          </li>
          {a.parentSection && (
            <li>
              <Link href={`/${a.parentSection.slug}`} className="hover:underline">{a.parentSection.name}</Link> /
            </li>
          )}
          <li>
            <Link href={sectionHref} aria-current="page" className="text-text hover:underline">{a.section.name}</Link>
          </li>
        </ol>
      </nav>

      <header className="animate-fade-in mx-auto mt-6 max-w-article text-center">
        {a.isSponsored ? (
          <Eyebrow tone="neutral">Contenido patrocinado</Eyebrow>
        ) : (
          <Link href={sectionHref} className="font-serif text-ui italic text-accent hover:underline">{a.section.name}</Link>
        )}
        <h1 className="mt-2 font-display text-headline text-balance">{a.title}</h1>
        {a.dek && <p className="mt-4 font-serif text-dek italic text-text-muted text-pretty">{a.dek}</p>}
        <Ornament className="mt-6" />
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {a.author && <Avatar name={a.author.name} photo={a.author.photo} size={32} />}
            <p className="text-ui-sm">
              Por{" "}
              {a.author ? (
                <Link href={`/autor/${a.author.slug}`} className="font-semibold hover:underline">{a.author.name}</Link>
              ) : (
                <span className="font-semibold">Redacción</span>
              )}
              {a.place && (
                <>
                  {" · "}
                  <Link href={`/tema/${a.place.slug}`} className="text-accent hover:underline">{a.place.name}</Link>
                </>
              )}
            </p>
          </div>
          <p className="text-caption text-text-muted">
            {a.publishedAt ? (
              <Link href={`/archivo/${dayKey(a.publishedAt, org.timezone)}`} className="hover:underline">
                <Timestamp iso={a.publishedAt} org={org} />
              </Link>
            ) : (
              "Sin publicar"
            )}
            {" · "}
            {a.readingMinutes} min de lectura
          </p>
          {!preview && (
            <div className="lg:hidden">
              <ShareBar url={a.url} title={a.title} />
            </div>
          )}
        </div>
      </header>

      {a.cover && (
        <div className="animate-fade-in mx-auto mt-8 max-w-[calc(var(--container-article)+8rem)] [animation-delay:120ms]">
          <Figure image={a.cover} priority />
        </div>
      )}

      {/* cuerpo con los botones de compartir fijos al costado en escritorio */}
      <div className="mx-auto mt-10 grid max-w-article lg:max-w-none lg:grid-cols-[1fr_var(--container-article)_1fr]">
        <div className="hidden lg:block">
          {!preview && (
            <div className="sticky top-24 mr-10 flex justify-end">
              <ShareBar url={a.url} title={a.title} vertical />
            </div>
          )}
        </div>
        <div id="nota-cuerpo" className="min-w-0">
          <ArticleBody doc={a.body} orgId={org.id} />

          <Ornament className="mt-12" />

          {topics.length > 0 && (
            <div className="mt-10 text-center">
              <p className="font-serif text-ui italic text-text-muted">Temas de esta nota</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {topics.map((t) => (
                  <li key={t.id} className="inline-flex items-center overflow-hidden rounded-pill border border-border text-ui-sm transition-colors duration-base hover:border-accent">
                    <Link href={`/tema/${t.slug}`} className="py-1 pl-3 pr-2 hover:text-accent">{t.name}</Link>
                    <Link href={`/cuenta/entrar?seguir=${t.slug}`} aria-label={`Seguir el tema ${t.name}`} title="Seguir tema" className="grid h-7 w-8 place-items-center border-l border-border transition-colors duration-base hover:bg-accent hover:text-on-accent">
                      <Plus className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!preview && (
            <div className="mt-8 flex flex-col items-center gap-2 lg:hidden">
              <p className="text-ui-sm text-text-muted">Compártela</p>
              <ShareBar url={a.url} title={a.title} />
            </div>
          )}

          {a.author && (
            <div data-reveal className="mt-10 flex gap-4 border-y border-border py-6">
              <Avatar name={a.author.name} photo={a.author.photo} size={48} />
              <div>
                <p className="font-serif text-caption italic text-text-muted">Escrito por</p>
                <Link href={`/autor/${a.author.slug}`} className="font-display text-title hover:underline">{a.author.name}</Link>
                {a.author.bio && <p className="mt-1 font-serif text-body-sm text-text-muted">{a.author.bio}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {more.length > 0 && (
        <section aria-labelledby="mas-seccion" className="mt-20">
          <BlockHeading id="mas-seccion" href={`/${(a.parentSection ?? a.section).slug}`}>
            Más en {(a.parentSection ?? a.section).name}
          </BlockHeading>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((m, n) => (
              <div key={m.id} data-reveal style={{ "--reveal-i": n } as React.CSSProperties}>
                <StoryCard article={m} org={org} variant="standard" />
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
