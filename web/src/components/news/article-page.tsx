import Link from "next/link";
import { Plus } from "lucide-react";
import { listArticles } from "@/lib/data";
import { dayKey } from "@/lib/format";
import type { ArticleView, Organization } from "@/lib/types";
import { Avatar, BlockHeading, Eyebrow, Timestamp } from "@/components/ui/misc";
import { ArticleBody } from "./article-body";
import { Figure } from "./figure";
import { ShareBar } from "./share-bar";
import { StoryCard } from "./story-card";

export async function ArticlePage({ article: a, org, preview = false }: { article: ArticleView; org: Organization; preview?: boolean }) {
  const sectionHref = a.parentSection ? `/${a.parentSection.slug}/${a.section.slug}` : `/${a.section.slug}`;
  const more = (await listArticles(org.id, { sectionId: (a.parentSection ?? a.section).id, excludeIds: [a.id] }, { limit: 4 })).items;
  const topics = a.tags.filter((t) => t.kind === "topic");

  return (
    <article className="container-page pt-6 md:pt-10">
      <div className="mx-auto max-w-article">
        <nav aria-label="Ruta" className="text-caption text-text-muted">
          <ol className="flex flex-wrap gap-1">
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

        <header className="mt-6">
          {a.isSponsored ? <Eyebrow tone="neutral">Contenido patrocinado</Eyebrow> : <Eyebrow href={sectionHref}>{a.section.name}</Eyebrow>}
          <h1 className="mt-2 font-display text-headline text-balance">{a.title}</h1>
          {a.dek && <p className="mt-4 font-serif text-dek text-text-muted">{a.dek}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
            <div className="flex items-center gap-3">
              {a.author && <Avatar name={a.author.name} photo={a.author.photo} size={32} />}
              <p className="text-ui-sm">
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
                <br className="sm:hidden" />
                <span className="hidden sm:inline"> · </span>
                {a.publishedAt ? (
                  <Link href={`/archivo/${dayKey(a.publishedAt, org.timezone)}`} className="hover:underline">
                    <Timestamp iso={a.publishedAt} org={org} />
                  </Link>
                ) : (
                  <span className="text-caption text-text-muted">Sin publicar</span>
                )}
                <span className="text-caption text-text-muted"> · {a.readingMinutes} min de lectura</span>
              </p>
            </div>
            {!preview && <ShareBar url={a.url} title={a.title} />}
          </div>
        </header>

        {a.cover && (
          <div className="mt-6">
            <Figure image={a.cover} priority />
          </div>
        )}

        <div className="mt-8">
          <ArticleBody doc={a.body} orgId={org.id} />
        </div>

        {topics.length > 0 && (
          <div className="mt-10">
            <p className="eyebrow text-text-muted">Temas</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {topics.map((t) => (
                <li key={t.id} className="inline-flex items-center overflow-hidden rounded-pill bg-surface-tint text-ui-sm">
                  <Link href={`/tema/${t.slug}`} className="py-1 pl-3 pr-2 hover:underline">{t.name}</Link>
                  <Link href={`/cuenta/entrar?seguir=${t.slug}`} aria-label={`Seguir el tema ${t.name}`} title="Seguir tema" className="grid h-7 w-8 place-items-center border-l border-border hover:bg-surface">
                    <Plus className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!preview && (
          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <p className="text-ui-sm text-text-muted">¿Te resultó útil? Compártela.</p>
            <ShareBar url={a.url} title={a.title} />
          </div>
        )}

        {a.author && (
          <div className="mt-8 flex gap-4 border-t border-border pt-6">
            <Avatar name={a.author.name} photo={a.author.photo} size={48} />
            <div>
              <Link href={`/autor/${a.author.slug}`} className="font-display text-title hover:underline">{a.author.name}</Link>
              {a.author.bio && <p className="font-serif text-body-sm text-text-muted">{a.author.bio}</p>}
            </div>
          </div>
        )}
      </div>

      {more.length > 0 && (
        <section aria-labelledby="mas-seccion" className="mt-16">
          <BlockHeading id="mas-seccion" href={`/${(a.parentSection ?? a.section).slug}`}>
            Más en {(a.parentSection ?? a.section).name}
          </BlockHeading>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((m) => (
              <StoryCard key={m.id} article={m} org={org} variant="standard" />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
