import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/cx";
import type { ArticleView, Organization } from "@/lib/types";
import { Avatar, Eyebrow, Timestamp } from "@/components/ui/misc";

export type CardVariant = "lead" | "standard" | "row" | "compact" | "opinion";

function sectionHref(a: ArticleView) {
  return a.parentSection ? `/${a.parentSection.slug}/${a.section.slug}` : `/${a.section.slug}`;
}

function Kicker({ a }: { a: ArticleView }) {
  if (a.isSponsored) return <Eyebrow tone="neutral">Patrocinado</Eyebrow>;
  return <Eyebrow href={sectionHref(a)}>{a.section.name}</Eyebrow>;
}

function Headline({ a, className }: { a: ArticleView; className: string }) {
  return (
    <h3 className={className}>
      <Link href={a.url} className="story-link decoration-1 underline-offset-2 hover:underline">
        {a.title}
      </Link>
    </h3>
  );
}

export function StoryCard({ article: a, org, variant = "row", priority = false, withDek = false }: { article: ArticleView; org: Organization; variant?: CardVariant; priority?: boolean; withDek?: boolean }) {
  // sin foto, las variantes con imagen pasan a compacta
  const v: CardVariant = !a.cover && (variant === "standard" || variant === "row") ? "compact" : variant;

  if (v === "lead") {
    return (
      <article className="relative">
        {a.cover && (
          <div className="relative aspect-video overflow-hidden bg-surface-tint">
            <Image src={a.cover.src} alt={a.cover.alt} fill priority={priority} sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
          </div>
        )}
        <div className={cx(a.cover && "mt-4")}>
          <Kicker a={a} />
          <Headline a={a} className="mt-1 font-display text-hero" />
          {a.dek && <p className="mt-3 font-serif text-dek text-text-muted">{a.dek}</p>}
          <p className="mt-3 text-caption text-text-muted">
            {a.author && (
              <>
                Por <span className="font-semibold text-text">{a.author.name}</span> ·{" "}
              </>
            )}
            <Timestamp iso={a.publishedAt!} org={org} relative />
          </p>
        </div>
      </article>
    );
  }

  if (v === "standard") {
    return (
      <article className="relative">
        <div className="relative aspect-[3/2] overflow-hidden bg-surface-tint">
          <Image src={a.cover!.src} alt="" fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" />
        </div>
        <div className="mt-3">
          <Kicker a={a} />
          <Headline a={a} className="mt-1 font-display text-title" />
          <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
        </div>
      </article>
    );
  }

  if (v === "row") {
    return (
      <article className="relative flex gap-3">
        <div className="relative aspect-[3/2] w-thumb shrink-0 self-start overflow-hidden bg-surface-tint">
          <Image src={a.cover!.src} alt="" fill sizes="112px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <Kicker a={a} />
          <Headline a={a} className="line-clamp-3 font-display text-title-sm" />
          {withDek && a.dek && <p className="mt-1 line-clamp-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
          <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
        </div>
      </article>
    );
  }

  if (v === "opinion") {
    return (
      <article className="relative flex gap-3">
        <Avatar name={a.author?.name ?? "Opinión"} photo={a.author?.photo ?? null} size={48} />
        <div className="min-w-0">
          <p className="text-ui-sm font-semibold">{a.author?.name ?? "Opinión"}</p>
          {a.author?.columnName && <p className="text-caption text-text-muted">{a.author.columnName}</p>}
          <Headline a={a} className="mt-1 font-display text-title-sm italic" />
        </div>
      </article>
    );
  }

  return (
    <article className="relative">
      <Kicker a={a} />
      <Headline a={a} className="mt-0.5 font-display text-title-sm" />
      {withDek && a.dek && <p className="mt-1 line-clamp-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
      <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
    </article>
  );
}

export function StoryList({ articles, org, variant = "row", withDek = false }: { articles: ArticleView[]; org: Organization; variant?: CardVariant; withDek?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {articles.map((a) => (
        <li key={a.id} className="py-4 first:pt-0 last:pb-0">
          <StoryCard article={a} org={org} variant={variant} withDek={withDek} />
        </li>
      ))}
    </ul>
  );
}
