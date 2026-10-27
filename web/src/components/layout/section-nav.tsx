"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { iconButtonClass } from "@/components/ui/button";

type Item = { name: string; href: string; children: { name: string; href: string }[] };

function useCurrent() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
}

// Barra fija: al bajar se encoge un poco y gana sombra, sin cambiar de forma.
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="group/header sticky top-0 z-30 border-b border-transparent bg-bg/90 backdrop-blur-md transition-[border-color,box-shadow] duration-base ease-soft data-scrolled:border-border data-scrolled:shadow-card"
    >
      {children}
    </header>
  );
}

// Píldora: fondo tenue al pasar; la sección actual va rellena de terracota.
const navLink =
  "group press inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-ui font-medium text-text " +
  "hover:bg-surface-tint aria-expanded:bg-surface-tint aria-[current=page]:bg-accent aria-[current=page]:text-on-accent";

// Escritorio: secciones en línea. Las que tienen subsecciones abren un panel
// con clic o teclado; Esc cierra y devuelve el foco al botón.
export function SectionNav({ sections }: { sections: Item[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const isCurrent = useCurrent();
  const nav = useRef<HTMLElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        nav.current?.querySelector<HTMLButtonElement>(`[data-menu="${open}"]`)?.focus();
        setOpen(null);
      }
    };
    const onClick = (e: MouseEvent) => !nav.current?.contains(e.target as Node) && setOpen(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <nav ref={nav} aria-label="Secciones" className="hidden min-w-0 flex-1 justify-center xl:flex">
      <ul className="flex items-center gap-0.5">
        <li>
          <Link href="/ultima-hora" aria-current={isCurrent("/ultima-hora") ? "page" : undefined} className={navLink}>
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent group-aria-[current=page]:bg-on-accent" />
            Última hora
          </Link>
        </li>
        {sections.map((s) => {
          const current = isCurrent(s.href);
          if (!s.children.length)
            return (
              <li key={s.href}>
                <Link href={s.href} aria-current={current ? "page" : undefined} className={navLink}>
                  {s.name}
                </Link>
              </li>
            );
          const isOpen = open === s.href;
          return (
            <li key={s.href}>
              <button type="button" data-menu={s.href} aria-expanded={isOpen} aria-controls={`menu-${s.href.slice(1)}`} aria-current={current ? "page" : undefined} onClick={() => setOpen(isOpen ? null : s.href)} className={navLink}>
                {s.name}
                <ChevronDown className={cx("size-3.5 transition-transform duration-base ease-soft", isOpen && "rotate-180")} aria-hidden />
              </button>
              {isOpen && (
                <div id={`menu-${s.href.slice(1)}`} className="enter-fade absolute inset-x-4 top-full z-40 mt-2 overflow-hidden rounded-lg border border-border bg-raised shadow-pop md:inset-x-12">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
                    <div className="bg-surface-tint px-8 py-7">
                      <p className="font-display text-heading">{s.name}</p>
                      <Link href={s.href} className="group mt-3 inline-flex items-center gap-1.5 text-ui font-semibold text-accent">
                        Ver toda la sección
                        <ArrowRight className="size-4 transition-transform duration-base ease-soft group-hover:translate-x-1" aria-hidden />
                      </Link>
                    </div>
                    <ul className="grid grid-cols-3 content-start gap-x-6 gap-y-1 px-8 py-7">
                      {s.children.map((c, n) => (
                        <li key={c.href} className="animate-fade-in" style={{ animationDelay: `${n * 30}ms` }}>
                          <Link href={c.href} aria-current={isCurrent(c.href) ? "page" : undefined} className="block rounded-sm px-2 py-1.5 font-serif text-body-sm transition-colors duration-fast hover:bg-surface aria-[current=page]:text-accent">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Móvil y pantallas medianas: cajón lateral con las secciones en acordeón.
export function MobileMenu({ sections, orgName, signedIn, it = false }: { sections: Item[]; orgName: string; signedIn: boolean; it?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isCurrent = useCurrent();
  const path = usePathname();

  useEffect(() => dialog.current?.close(), [path]);

  const rowLink = "block flex-1 rounded-sm px-2 py-3 font-display text-title-sm transition-colors duration-fast hover:text-accent aria-[current=page]:text-accent";

  return (
    <>
      <button type="button" aria-label="Abrir menú" title="Abrir menú" onClick={() => dialog.current?.showModal()} className={iconButtonClass("xl:hidden")}>
        <Menu className="size-4.5" aria-hidden />
      </button>
      <dialog ref={dialog} aria-label="Menú de secciones" className="enter-drawer m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none rounded-r-lg bg-bg p-0 text-text backdrop:bg-scrim/50">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="font-display text-title font-semibold">{orgName}</span>
          <form method="dialog">
            <button aria-label="Cerrar menú" title="Cerrar menú" className={iconButtonClass()}>
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
        <ul className="px-2 py-2">
          <li>
            <Link href="/" aria-current={isCurrent("/") ? "page" : undefined} className={rowLink}>
              Portada
            </Link>
          </li>
          <li>
            <Link href="/ultima-hora" aria-current={isCurrent("/ultima-hora") ? "page" : undefined} className={rowLink}>
              Última hora
            </Link>
          </li>
          {sections.map((s) => (
            <li key={s.href}>
              <div className="flex items-center justify-between">
                <Link href={s.href} aria-current={isCurrent(s.href) ? "page" : undefined} className={rowLink}>
                  {s.name}
                </Link>
                {s.children.length > 0 && (
                  <button type="button" aria-expanded={expanded === s.href} aria-label={`Subsecciones de ${s.name}`} onClick={() => setExpanded(expanded === s.href ? null : s.href)} className={iconButtonClass()}>
                    <ChevronDown className={cx("size-4 transition-transform duration-base ease-soft", expanded === s.href && "rotate-180")} aria-hidden />
                  </button>
                )}
              </div>
              {expanded === s.href && (
                <ul className="animate-fade-in mb-2 ml-2 rounded-md bg-surface px-2 py-1">
                  {s.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href} className="block px-2 py-2 font-serif text-body-sm hover:text-accent">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-4">
          <Link href={it ? "/plataforma" : signedIn ? "/cuenta" : "/cuenta/entrar"} className="press flex h-11 items-center justify-center rounded-pill bg-accent text-ui font-semibold text-on-accent hover:bg-accent-hover">
            {it ? "Panel IT" : signedIn ? "Mi cuenta" : "Entrar"}
          </Link>
        </div>
      </dialog>
    </>
  );
}
