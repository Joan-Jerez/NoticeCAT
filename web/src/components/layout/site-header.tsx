import Link from "next/link";
import { Search, User } from "lucide-react";
import { getSectionTree } from "@/lib/data";
import { formatLongDate } from "@/lib/format";
import type { Organization } from "@/lib/types";
import { iconButtonClass } from "@/components/ui/button";
import { CompactBar, MobileMenu, SectionNav } from "./section-nav";

// Cabecera de periódico: utilidades arriba, el nombre del medio centrado
// entre filetes dobles y las secciones en versalitas debajo.
export async function SiteHeader({ org }: { org: Organization }) {
  const tree = (await getSectionTree(org.id)).filter((s) => s.inMenu);
  const menu = tree.map((s) => ({ name: s.name, href: `/${s.slug}`, children: s.children.filter((c) => c.inMenu).map((c) => ({ name: c.name, href: `/${s.slug}/${c.slug}` })) }));
  const today = formatLongDate(new Date().toISOString(), org);

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg md:static">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-raised focus:px-3 focus:py-2">
          Saltar al contenido
        </a>

        {/* móvil: una sola fila */}
        <div className="container-page flex h-14 items-center justify-between gap-2 border-b border-border md:hidden">
          <MobileMenu sections={menu} orgName={org.name} />
          <Link href="/" className="truncate font-display text-title">
            {org.name}
          </Link>
          <Link href="/buscar" aria-label="Buscar" title="Buscar" className={iconButtonClass()}>
            <Search className="size-4.5" aria-hidden />
          </Link>
        </div>

        {/* escritorio: cabecera completa */}
        <div className="container-page hidden md:block">
          <div className="flex h-10 items-center justify-between text-caption text-text-muted">
            <span className="first-letter:uppercase">{today}</span>
            <div className="flex items-center gap-4">
              <Link href="/buscar" className="inline-flex items-center gap-1.5 hover:text-text">
                <Search className="size-3.5" aria-hidden />
                Buscar
              </Link>
              <Link href="/cuenta/entrar" className="inline-flex items-center gap-1.5 hover:text-text">
                <User className="size-3.5" aria-hidden />
                Entrar
              </Link>
            </div>
          </div>
          <div className="border-t border-text py-6 text-center">
            <Link href="/" className="inline-block font-display text-hero tracking-tight">
              {org.name}
            </Link>
            <p className="mt-1 font-serif text-ui italic text-text-muted">{org.tagline}</p>
          </div>
          <SectionNav sections={menu} />
        </div>
      </header>
      <CompactBar sections={menu} orgName={org.name} />
    </>
  );
}
