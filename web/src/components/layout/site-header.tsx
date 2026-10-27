import Link from "next/link";
import { Search, User } from "lucide-react";
import { getSectionTree } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import type { Organization } from "@/lib/types";
import { buttonClass, iconButtonClass } from "@/components/ui/button";
import { MobileMenu, SectionNav, StickyHeader } from "./section-nav";

// Cabecera de revista: una sola barra fija con el nombre a la izquierda,
// las secciones como píldoras y búsqueda y cuenta a la derecha.
export async function SiteHeader({ org }: { org: Organization }) {
  const tree = (await getSectionTree(org.id)).filter((s) => s.inMenu);
  const menu = tree.map((s) => ({ name: s.name, href: `/${s.slug}`, children: s.children.filter((c) => c.inMenu).map((c) => ({ name: c.name, href: `/${s.slug}/${c.slug}` })) }));
  const user = await getSessionUser();

  return (
    <StickyHeader>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-raised focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <div className="container-page relative flex h-16 items-center gap-3 transition-[height] duration-base ease-soft group-data-scrolled/header:h-14 md:gap-6">
        <MobileMenu sections={menu} orgName={org.name} signedIn={!!user} />
        <Link href="/" className="group flex min-w-0 items-center gap-2">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md sm:size-8 bg-accent font-display text-title-sm font-semibold text-on-accent transition-transform duration-base ease-soft group-hover:-rotate-6">
            {org.name.replace(/^(La|El|Los|Las|Diario)\s+/i, "").charAt(0)}
          </span>
          <span className="truncate font-display text-title-sm font-semibold tracking-tight sm:text-title">{org.name}</span>
        </Link>
        <SectionNav sections={menu} />
        <div className="ml-auto flex shrink-0 items-center gap-1 xl:ml-0">
          <Link href="/buscar" aria-label="Buscar" title="Buscar" className={iconButtonClass()}>
            <Search className="size-4.5" aria-hidden />
          </Link>
          {/* en móvil la cuenta está dentro del menú lateral */}
          <div className="hidden md:block">
            <Link href={user ? "/cuenta" : "/cuenta/entrar"} className={buttonClass("secondary", "sm")}>
              <User className="size-3.5" aria-hidden />
              {user ? "Mi cuenta" : "Entrar"}
            </Link>
          </div>
        </div>
      </div>
    </StickyHeader>
  );
}
