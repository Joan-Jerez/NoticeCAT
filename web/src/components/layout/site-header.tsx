import Link from "next/link";
import { Search, User } from "lucide-react";
import { getSectionTree } from "@/lib/data";
import { formatLongDate } from "@/lib/format";
import type { Organization } from "@/lib/types";
import { iconButtonClass } from "@/components/ui/button";
import { MobileMenu, SectionNav } from "./section-nav";

export async function SiteHeader({ org }: { org: Organization }) {
  const tree = (await getSectionTree(org.id)).filter((s) => s.inMenu);
  const menu = tree.map((s) => ({ name: s.name, href: `/${s.slug}`, children: s.children.filter((c) => c.inMenu).map((c) => ({ name: c.name, href: `/${s.slug}/${c.slug}` })) }));

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg md:static">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-raised focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <div className="container-page">
        <div className="flex h-14 items-center justify-between gap-4 md:h-20">
          <div className="flex items-center gap-2 md:w-1/3">
            <MobileMenu sections={menu} orgName={org.name} />
            <span className="hidden text-caption text-text-muted md:block">{formatLongDate(new Date().toISOString(), org)}</span>
          </div>
          <Link href="/" className="truncate text-center font-display text-title md:text-heading-lg">
            {org.name}
          </Link>
          <div className="flex items-center justify-end gap-1 md:w-1/3">
            <Link href="/buscar" aria-label="Buscar" title="Buscar" className={iconButtonClass()}>
              <Search className="size-4.5" aria-hidden />
            </Link>
            <Link href="/cuenta/entrar" className="hidden h-8 items-center gap-2 rounded-xs border border-border px-3 text-ui-sm font-semibold hover:bg-surface md:inline-flex">
              <User className="size-4" aria-hidden />
              Entrar
            </Link>
          </div>
        </div>
        <SectionNav sections={menu} />
      </div>
    </header>
  );
}
