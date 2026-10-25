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
    <header className="animate-fade-in border-b-4 border-double border-text pb-6 text-center">
      <p className="font-serif text-ui italic text-accent">{kind}</p>
      <h1 className="mt-1 font-display text-heading-lg text-balance md:text-headline">{title}</h1>
      {description && <div className="mx-auto mt-2 max-w-article font-serif text-body-sm text-text-muted">{description}</div>}
      {aside && <div className="mt-4 flex justify-center">{aside}</div>}
      {tabs && tabs.length > 0 && (
        <nav aria-label={`Subsecciones de ${title}`} className="-mx-4 mt-5 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-x-6 whitespace-nowrap md:justify-center">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={t.current ? "page" : undefined}
                  className="relative inline-block py-1 text-ui-sm font-semibold uppercase tracking-wide text-text-muted transition-colors duration-base after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-slow after:ease-soft hover:text-accent hover:after:scale-x-100 aria-[current=page]:text-accent aria-[current=page]:after:scale-x-100"
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
        <aside aria-labelledby="lo-ultimo" className="lg:border-l lg:border-border lg:pl-8">
          <h2 id="lo-ultimo" className="mb-4 border-b border-text pb-2 font-display text-title">
            Lo más reciente
          </h2>
          <NumberedList articles={latest.slice(0, 5)} org={org} />
          <Link href="/ultima-hora" className="group mt-4 inline-flex items-center gap-1 font-serif text-ui italic text-accent">
            <span className="link-grow">Toda la última hora</span>
            <span aria-hidden className="transition-transform duration-base ease-soft group-hover:translate-x-1">→</span>
          </Link>
        </aside>
      )}
    </div>
  );
}
