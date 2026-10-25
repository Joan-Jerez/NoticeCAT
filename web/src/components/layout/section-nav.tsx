"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { iconButtonClass } from "@/components/ui/button";

type Item = { name: string; href: string; children: { name: string; href: string }[] };

function useCurrent() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
}

// Subrayado que se abre desde el centro; fijo en la sección actual.
const navLink =
  "relative inline-flex items-center gap-1 py-3 text-ui-sm font-semibold uppercase tracking-wide transition-colors duration-base " +
  "after:absolute after:inset-x-0 after:bottom-1.5 after:h-px after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-slow after:ease-soft " +
  "hover:text-accent hover:after:scale-x-100 aria-[current=page]:text-accent aria-[current=page]:after:scale-x-100 aria-expanded:text-accent";

// Escritorio: secciones centradas entre filetes. Las que tienen subsecciones
// abren un panel con clic o teclado; Esc cierra y devuelve el foco al botón.
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
    <nav ref={nav} aria-label="Secciones" className="relative border-y-4 border-double border-text">
      <ul className="flex flex-wrap justify-center gap-x-7">
        <li>
          <Link href="/ultima-hora" aria-current={isCurrent("/ultima-hora") ? "page" : undefined} className={navLink}>
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
                <div id={`menu-${s.href.slice(1)}`} className="enter-fade absolute inset-x-0 top-full z-40 border-b border-border bg-raised shadow-pop">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-10 px-10 py-7">
                    <div className="border-r border-border pr-10">
                      <p className="font-display text-heading">{s.name}</p>
                      <Link href={s.href} className="mt-2 inline-block font-serif text-ui italic text-accent link-grow">
                        Ver toda la sección
                      </Link>
                    </div>
                    <ul className="grid grid-cols-3 content-start gap-x-8 gap-y-1">
                      {s.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} aria-current={isCurrent(c.href) ? "page" : undefined} className="block py-1.5 font-serif text-body-sm aria-[current=page]:text-accent">
                            <span className="link-grow">{c.name}</span>
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

// Escritorio: al bajar más allá de la cabecera, una barra compacta se desliza
// desde arriba con el nombre del medio y las secciones.
export function CompactBar({ sections, orgName }: { sections: Item[]; orgName: string }) {
  const [shown, setShown] = useState(false);
  const isCurrent = useCurrent();

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setShown(window.scrollY > 260);
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
    <div
      inert={!shown}
      aria-hidden={!shown || undefined}
      className={cx(
        "fixed inset-x-0 top-0 z-30 hidden border-b border-border bg-bg/95 backdrop-blur-sm transition-transform duration-base ease-soft md:block",
        shown ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="container-page flex h-12 items-center gap-8">
        <Link href="/" className="shrink-0 font-display text-title">
          {orgName}
        </Link>
        <ul className="flex min-w-0 flex-1 gap-6 overflow-hidden">
          {sections.map((s) => (
            <li key={s.href} className="shrink-0">
              <Link href={s.href} aria-current={isCurrent(s.href) ? "page" : undefined} className={cx(navLink, "py-0 text-caption")}>
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/buscar" aria-label="Buscar" title="Buscar" className={iconButtonClass()}>
          <Search className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

// Móvil: cajón lateral con las secciones en acordeón.
export function MobileMenu({ sections, orgName }: { sections: Item[]; orgName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isCurrent = useCurrent();
  const path = usePathname();

  useEffect(() => dialog.current?.close(), [path]);

  return (
    <>
      <button type="button" aria-label="Abrir menú" title="Abrir menú" onClick={() => dialog.current?.showModal()} className={iconButtonClass()}>
        <Menu className="size-4.5" aria-hidden />
      </button>
      <dialog ref={dialog} aria-label="Menú de secciones" className="enter-drawer m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none bg-bg p-0 text-text backdrop:bg-scrim/50">
        <div className="flex h-14 items-center justify-between border-b-4 border-double border-text px-4">
          <span className="font-display text-title">{orgName}</span>
          <form method="dialog">
            <button aria-label="Cerrar menú" title="Cerrar menú" className={iconButtonClass()}>
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
        <ul className="divide-y divide-border px-4">
          <li>
            <Link href="/" className="block py-3 font-display text-title-sm">
              Portada
            </Link>
          </li>
          <li>
            <Link href="/ultima-hora" className="block py-3 font-display text-title-sm">
              Última hora
            </Link>
          </li>
          {sections.map((s) => (
            <li key={s.href}>
              <div className="flex items-center justify-between">
                <Link href={s.href} aria-current={isCurrent(s.href) ? "page" : undefined} className="block flex-1 py-3 font-display text-title-sm aria-[current=page]:text-accent">
                  {s.name}
                </Link>
                {s.children.length > 0 && (
                  <button type="button" aria-expanded={expanded === s.href} aria-label={`Subsecciones de ${s.name}`} onClick={() => setExpanded(expanded === s.href ? null : s.href)} className={iconButtonClass()}>
                    <ChevronDown className={cx("size-4 transition-transform duration-base ease-soft", expanded === s.href && "rotate-180")} aria-hidden />
                  </button>
                )}
              </div>
              {expanded === s.href && (
                <ul className="animate-fade-in pb-3 pl-4">
                  {s.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href} className="block py-2 font-serif text-body-sm hover:text-accent">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          <li>
            <Link href="/cuenta/entrar" className="block py-3 text-ui font-semibold">
              Entrar
            </Link>
          </li>
        </ul>
      </dialog>
    </>
  );
}
