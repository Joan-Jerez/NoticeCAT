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
import { StoryList } from "./story-card";

export function PageHeader({ kind, title, description, aside, tabs }: { kind: string; title: string; description?: ReactNode; aside?: ReactNode; tabs?: { name: string; href: string; current?: boolean }[] }) {
  return (
    <header className="border-b-2 border-text pb-4">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="eyebrow text-accent">{kind}</p>
          <h1 className="mt-1 font-display text-heading-lg md:text-headline">{title}</h1>
          {description && <div className="mt-2 max-w-article font-serif text-body-sm text-text-muted">{description}</div>}
        </div>
        {aside}
      </div>
      {tabs && tabs.length > 0 && (
        <nav aria-label={`Subsecciones de ${title}`} className="-mx-4 mt-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-2 whitespace-nowrap">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link href={t.href} aria-current={t.current ? "page" : undefined} className={cx("inline-block rounded-pill px-3 py-1 text-ui-sm", t.current ? "bg-accent text-on-accent" : "bg-surface-tint hover:underline")}>
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
  const latest = showLatest ? (await listArticles(org.id, { excludeIds: page.items.map((a) => a.id) }, { limit: 6 })).items : [];
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
          <h2 id="lo-ultimo" className="mb-4 border-b-2 border-text pb-2 font-display text-title">
            Lo último
          </h2>
          <StoryList articles={latest} org={org} variant="compact" />
          <Link href="/ultima-hora" className="mt-4 inline-block text-ui-sm font-semibold text-accent hover:underline">
            Ver toda la última hora
          </Link>
        </aside>
      )}
    </div>
  );
}
