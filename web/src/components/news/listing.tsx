import Link from "next/link";
import type { ReactNode } from "react";
import { Newspaper } from "lucide-react";
import { loadMore } from "@/app/(public)/actions";
import type { ArticleFilter } from "@/lib/data";
import { listArticles } from "@/lib/data";
import { cx } from "@/lib/cx";
import type { ArticleView, Organization, Page } from "@/lib/types";
import { EmptyState } from "@/components/ui/misc";
import { LoadMore } from "./load-more";
import { NumberedList, StoryList } from "./story-card";

// Cabecera de listados: centrada, con el tipo de página en cursiva y filete doble.
export function PageHeader({ kind, title, description, aside, tabs }: { kind: string; title: string; description?: ReactNode; aside?: ReactNode; tabs?: { name: string; href: string; current?: boolean }[] }) {
  return (
    <header className="animate-fade-in rounded-lg bg-surface px-6 py-8 md:px-10 md:py-10">
      <p className="inline-flex rounded-pill bg-raised px-3 py-1 text-ui-sm font-semibold text-accent">{kind}</p>
      <h1 className="mt-3 font-display text-heading-lg font-semibold text-balance md:text-headline">{title}</h1>
      {description && <div className="mt-2 max-w-article font-serif text-body-sm text-text-muted">{description}</div>}
      {aside && <div className="mt-4 flex">{aside}</div>}
      {tabs && tabs.length > 0 && (
        <nav aria-label={`Subsecciones de ${title}`} className="-mx-4 mt-5 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-2 whitespace-nowrap">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={t.current ? "page" : undefined}
                  className="press inline-block rounded-pill border border-border bg-raised px-3.5 py-1.5 text-ui-sm font-medium hover:border-accent hover:text-accent aria-[current=page]:border-accent aria-[current=page]:bg-accent aria-[current=page]:text-on-accent"
                >
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

// Lista + "Ver más" + columna lateral con lo último del sitio.
export async function Listing({ org, page, filter, empty, withDek = false, showLatest = true, q }: { org: Organization; page: Page<ArticleView>; filter: ArticleFilter; empty: { title: string; text: string }; withDek?: boolean; showLatest?: boolean; q?: string }) {
  const latest = showLatest ? (await listArticles(org.id, { excludeIds: page.items.map((a) => a.id) }, { limit: 5 })).items : [];
  const load = async (cursor: string) => {
    "use server";
    return loadMore({ ...filter, q, withDek }, cursor);
  };

  return (
    <div className={cx("mt-8 grid gap-12", showLatest && "lg:grid-cols-[minmax(0,1fr)_var(--container-sidebar)]")}>
      <div>
        {page.items.length === 0 ? (
          <EmptyState icon={Newspaper} title={empty.title}>
            {empty.text}
          </EmptyState>
        ) : (
          <>
            <StoryList articles={page.items} org={org} withDek={withDek} />
            <LoadMore initialCursor={page.nextCursor} load={load} />
          </>
        )}
      </div>
      {showLatest && latest.length > 0 && (
        <aside aria-labelledby="lo-ultimo" className="self-start rounded-lg bg-surface p-6 lg:sticky lg:top-20">
          <h2 id="lo-ultimo" className="mb-3 font-display text-title font-semibold">
            Lo último
          </h2>
          <NumberedList articles={latest.slice(0, 5)} org={org} />
          <Link href="/ultima-hora" className="group press mt-4 flex items-center justify-center gap-1.5 rounded-pill bg-raised px-4 py-2.5 text-ui-sm font-semibold hover:bg-accent hover:text-on-accent">
            Toda la última hora
            <span aria-hidden className="transition-transform duration-base ease-soft group-hover:translate-x-0.5">→</span>
          </Link>
        </aside>
      )}
    </div>
  );
}
