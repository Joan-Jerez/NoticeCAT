import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/cx";
import type { ArticleView, Organization } from "@/lib/types";
import { Avatar, Eyebrow, Timestamp } from "@/components/ui/misc";

export type CardVariant = "lead" | "feature" | "standard" | "row" | "compact" | "opinion";

function sectionHref(a: ArticleView) {
  return a.parentSection ? `/${a.parentSection.slug}/${a.section.slug}` : `/${a.section.slug}`;
}

// Etiqueta de sección en cursiva, como el antetítulo de un periódico impreso.
export function Kicker({ a, className }: { a: ArticleView; className?: string }) {
  if (a.isSponsored) return <Eyebrow tone="neutral" className={className}>Patrocinado</Eyebrow>;
  return (
    <Link href={sectionHref(a)} className={cx("relative z-10 font-serif text-ui-sm italic text-accent hover:underline", className)}>
      {a.section.name}
    </Link>
  );
}

function Headline({ a, className }: { a: ArticleView; className: string }) {
  return (
    <h3 className={className}>
      <Link href={a.url} className="story-link">
        <span className="link-grow">{a.title}</span>
      </Link>
    </h3>
  );
}

function Photo({ a, sizes, ratio = "aspect-[3/2]", priority = false, className }: { a: ArticleView; sizes: string; ratio?: string; priority?: boolean; className?: string }) {
  return (
    <div className={cx("relative overflow-hidden bg-surface-tint", ratio, className)}>
      <Image src={a.cover!.src} alt={priority ? a.cover!.alt : ""} fill priority={priority} sizes={sizes} className="media-zoom object-cover" />
    </div>
  );
}

export function StoryCard({ article: a, org, variant = "row", priority = false, withDek = false }: { article: ArticleView; org: Organization; variant?: CardVariant; priority?: boolean; withDek?: boolean }) {
  // sin foto, las variantes con imagen pasan a compacta
  const v: CardVariant = !a.cover && (variant === "standard" || variant === "row" || variant === "feature") ? "compact" : variant;

  if (v === "lead") {
    return (
      <article className="group relative">
        {a.cover && <Photo a={a} sizes="(min-width: 1024px) 50vw, 100vw" ratio="aspect-[4/3] lg:aspect-[3/2]" priority={priority} />}
        <div className={cx("text-center", a.cover && "mt-5")}>
          <Kicker a={a} />
          <Headline a={a} className="mt-1 font-display text-headline text-balance" />
          {a.dek && <p className="mx-auto mt-3 max-w-article font-serif text-dek text-text-muted">{a.dek}</p>}
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

  if (v === "feature") {
    return (
      <article className="group relative">
        <Photo a={a} sizes="(min-width: 1024px) 55vw, 100vw" ratio="aspect-video" />
        <div className="mt-4">
          <Kicker a={a} />
          <Headline a={a} className="mt-1 font-display text-heading text-balance" />
          {a.dek && <p className="mt-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
          <Timestamp iso={a.publishedAt!} org={org} relative className="mt-2 block" />
        </div>
      </article>
    );
  }

  if (v === "standard") {
    return (
      <article className="group relative">
        <Photo a={a} sizes="(min-width: 1024px) 25vw, 100vw" />
        <div className="mt-3">
          <Kicker a={a} />
          <Headline a={a} className="mt-0.5 font-display text-title" />
          <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
        </div>
      </article>
    );
  }

  if (v === "row") {
    return (
      <article className="group relative flex gap-4">
        <div className="min-w-0 flex-1">
          <Kicker a={a} />
          <Headline a={a} className="line-clamp-3 font-display text-title-sm" />
          {withDek && a.dek && <p className="mt-1 line-clamp-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
          <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
        </div>
        <Photo a={a} sizes="112px" className="w-thumb shrink-0 self-start" />
      </article>
    );
  }

  if (v === "opinion") {
    return (
      <article className="group relative text-center">
        <div className="flex justify-center">
          <Avatar name={a.author?.name ?? "Opinión"} photo={a.author?.photo ?? null} size={48} />
        </div>
        <p className="mt-2 text-ui-sm font-semibold">{a.author?.name ?? "Opinión"}</p>
        {a.author?.columnName && <p className="font-serif text-caption italic text-text-muted">{a.author.columnName}</p>}
        <Headline a={a} className="mt-3 font-display text-title italic text-balance" />
      </article>
    );
  }

  return (
    <article className="group relative">
      <Kicker a={a} />
      <Headline a={a} className="font-display text-title-sm" />
      {withDek && a.dek && <p className="mt-1 line-clamp-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
      <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
    </article>
  );
}

export function StoryList({ articles, org, variant = "row", withDek = false }: { articles: ArticleView[]; org: Organization; variant?: CardVariant; withDek?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {articles.map((a, i) => (
        <li key={a.id} data-reveal style={{ "--reveal-i": Math.min(i, 6) } as React.CSSProperties} className="py-4 first:pt-0 last:pb-0">
          <StoryCard article={a} org={org} variant={variant} withDek={withDek} />
        </li>
      ))}
    </ul>
  );
}

// Lista numerada: "Lo más reciente" de la portada y la columna lateral.
export function NumberedList({ articles, org }: { articles: ArticleView[]; org: Organization }) {
  return (
    <ol className="divide-y divide-border">
      {articles.map((a, i) => (
        <li key={a.id} data-reveal style={{ "--reveal-i": i } as React.CSSProperties} className="group relative flex gap-4 py-4 first:pt-0 last:pb-0">
          <span aria-hidden className="w-7 shrink-0 font-display text-heading leading-none text-accent/40 transition-colors duration-base group-hover:text-accent">
            {i + 1}
          </span>
          <div className="min-w-0">
            <Kicker a={a} />
            <Headline a={a} className="font-display text-title-sm" />
            <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1 block" />
          </div>
        </li>
      ))}
    </ol>
  );
}
