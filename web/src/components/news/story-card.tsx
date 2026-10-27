import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/cx";
import type { ArticleView, Organization } from "@/lib/types";
import { Avatar, Eyebrow, Timestamp } from "@/components/ui/misc";

export type CardVariant = "lead" | "tile" | "wide" | "standard" | "row" | "compact" | "opinion";

function sectionHref(a: ArticleView) {
  return a.parentSection ? `/${a.parentSection.slug}/${a.section.slug}` : `/${a.section.slug}`;
}

// Etiqueta de sección en forma de píldora; sobre una foto lleva fondo claro.
export function Kicker({ a, className, onPhoto = false }: { a: ArticleView; className?: string; onPhoto?: boolean }) {
  if (a.isSponsored) return <Eyebrow tone="neutral" className={className}>Patrocinado</Eyebrow>;
  return (
    <Link
      href={sectionHref(a)}
      className={cx(
        "relative z-10 inline-flex rounded-pill px-2.5 py-0.5 text-caption font-semibold text-accent transition-colors duration-fast",
        onPhoto ? "bg-raised hover:bg-surface-tint" : "bg-surface-tint hover:bg-accent hover:text-on-accent",
        className,
      )}
    >
      {a.section.name}
    </Link>
  );
}

function Headline({ a, className, as: Tag = "h3" }: { a: ArticleView; className: string; as?: "h2" | "h3" }) {
  return (
    <Tag className={className}>
      <Link href={a.url} className="story-link">
        <span className="link-grow">{a.title}</span>
      </Link>
    </Tag>
  );
}

function Photo({ a, sizes, ratio = "aspect-[3/2]", priority = false, className }: { a: ArticleView; sizes: string; ratio?: string; priority?: boolean; className?: string }) {
  return (
    <div className={cx("relative overflow-hidden bg-surface-tint", ratio, className)}>
      <Image src={a.cover!.src} alt={priority ? a.cover!.alt : ""} fill priority={priority} sizes={sizes} className="media-zoom object-cover" />
    </div>
  );
}

function Byline({ a, org, className }: { a: ArticleView; org: Organization; className?: string }) {
  return (
    <p className={cx("flex flex-wrap items-center gap-x-2 text-caption text-text-muted", className)}>
      {a.author && <span className="font-semibold text-text">{a.author.name}</span>}
      {a.author && <span aria-hidden>·</span>}
      <Timestamp iso={a.publishedAt!} org={org} relative />
    </p>
  );
}

export function StoryCard({ article: a, org, variant = "row", priority = false, withDek = false }: { article: ArticleView; org: Organization; variant?: CardVariant; priority?: boolean; withDek?: boolean }) {
  // sin foto: la ancha pasa a caja simple y la portada y la fila a compacta;
  // las cajas de cuadrícula se quedan sin foto pero conservan la forma
  const v: CardVariant = a.cover ? variant : variant === "wide" ? "standard" : variant === "lead" || variant === "row" ? "compact" : variant;

  // portada: el titular va sobre la foto, con un degradado oscuro debajo del texto
  if (v === "lead") {
    return (
      <article className="group relative overflow-hidden rounded-lg bg-inverse text-on-inverse shadow-card">
        <Photo a={a} sizes="(min-width: 1024px) 66vw, 100vw" ratio="aspect-[4/5] sm:aspect-[16/11] lg:aspect-[16/10]" priority={priority} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim via-scrim/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <Kicker a={a} onPhoto />
          <Headline as="h2" a={a} className="mt-3 max-w-3xl font-display text-hero font-semibold text-balance" />
          {a.dek && <p className="mt-3 hidden max-w-2xl font-serif text-dek text-on-inverse-muted md:block">{a.dek}</p>}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-caption text-on-inverse-muted">
            {a.author && <span className="font-semibold text-on-inverse">{a.author.name}</span>}
            {a.author && <span aria-hidden>·</span>}
            <Timestamp iso={a.publishedAt!} org={org} relative inverse />
          </p>
        </div>
      </article>
    );
  }

  // tarjeta con caja: foto arriba a sangre y texto con aire debajo
  if (v === "tile" || v === "standard") {
    const big = v === "tile";
    return (
      <article className="card-lift group relative flex h-full flex-col overflow-hidden rounded-lg bg-raised shadow-card">
        {a.cover && <Photo a={a} sizes={big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"} ratio={big ? "aspect-[3/2] lg:aspect-auto lg:flex-1 lg:min-h-64" : "aspect-[3/2]"} />}
        <div className={cx("flex flex-col", big ? "p-6 md:p-7" : "flex-1 p-5")}>
          <Kicker a={a} className="self-start" />
          <Headline a={a} className={cx("mt-2.5 font-display font-semibold text-balance", big ? "text-heading" : "text-title")} />
          {(big || withDek) && a.dek && <p className={cx("mt-2 font-serif text-body-sm text-text-muted", !big && "line-clamp-2")}>{a.dek}</p>}
          <Byline a={a} org={org} className={big ? "mt-4" : "mt-auto pt-4"} />
        </div>
      </article>
    );
  }

  // ancha: foto a un lado y texto al otro, dentro de la misma caja
  if (v === "wide") {
    return (
      <article className="card-lift group relative grid h-full overflow-hidden rounded-lg bg-raised shadow-card sm:grid-cols-2">
        <Photo a={a} sizes="(min-width: 1024px) 33vw, 100vw" ratio="aspect-[3/2] sm:aspect-auto sm:min-h-full" />
        <div className="flex flex-col justify-center p-6 md:p-8">
          <Kicker a={a} className="self-start" />
          <Headline a={a} className="mt-2.5 font-display text-heading font-semibold text-balance" />
          {a.dek && <p className="mt-2 line-clamp-3 font-serif text-body-sm text-text-muted">{a.dek}</p>}
          <Byline a={a} org={org} className="mt-4" />
        </div>
      </article>
    );
  }

  if (v === "row") {
    return (
      <article className="group relative flex gap-4">
        <div className="min-w-0 flex-1">
          <Kicker a={a} />
          <Headline a={a} className="mt-1.5 line-clamp-3 font-display text-title-sm font-semibold" />
          {withDek && a.dek && <p className="mt-1 line-clamp-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
          <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1.5 block" />
        </div>
        <Photo a={a} sizes="112px" className="w-thumb shrink-0 self-start rounded-md" />
      </article>
    );
  }

  // columna de opinión, pensada para la banda oscura de la portada
  if (v === "opinion") {
    return (
      <article className="group relative flex gap-4">
        <Avatar name={a.author?.name ?? "Opinión"} photo={a.author?.photo ?? null} size={48} />
        <div className="min-w-0">
          <p className="text-ui-sm font-semibold">{a.author?.name ?? "Opinión"}</p>
          {a.author?.columnName && <p className="font-serif text-caption italic text-on-inverse-muted">{a.author.columnName}</p>}
          <Headline a={a} className="mt-2 font-display text-title italic text-balance" />
        </div>
      </article>
    );
  }

  return (
    <article className="group relative">
      <Kicker a={a} />
      <Headline a={a} className="mt-1.5 font-display text-title-sm font-semibold" />
      {withDek && a.dek && <p className="mt-1 line-clamp-2 font-serif text-body-sm text-text-muted">{a.dek}</p>}
      <Timestamp iso={a.publishedAt!} org={org} relative className="mt-1.5 block" />
    </article>
  );
}

export function StoryList({ articles, org, variant = "row", withDek = false }: { articles: ArticleView[]; org: Organization; variant?: CardVariant; withDek?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {articles.map((a, i) => (
        <li key={a.id} data-reveal style={{ "--reveal-i": Math.min(i, 6) } as React.CSSProperties} className="py-5 first:pt-0 last:pb-0">
          <StoryCard article={a} org={org} variant={variant} withDek={withDek} />
        </li>
      ))}
    </ul>
  );
}

// Lista numerada: "Lo último" de la portada y la columna lateral.
export function NumberedList({ articles, org }: { articles: ArticleView[]; org: Organization }) {
  return (
    <ol className="space-y-1">
      {articles.map((a, i) => (
        <li key={a.id} data-reveal style={{ "--reveal-i": i } as React.CSSProperties} className="group relative -mx-3 flex gap-4 rounded-md px-3 py-3 transition-colors duration-base hover:bg-raised">
          <span aria-hidden className="w-6 shrink-0 font-display text-heading font-semibold leading-none text-accent/35 transition-colors duration-base group-hover:text-accent">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <Headline a={a} className="font-display text-title-sm font-semibold" />
            <p className="mt-1 text-caption text-text-muted">
              <span className="font-semibold text-accent">{a.section.name}</span> · <Timestamp iso={a.publishedAt!} org={org} relative />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
