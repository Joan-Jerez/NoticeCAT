"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { iconButtonClass } from "@/components/ui/button";

type Item = { name: string; href: string; children: { name: string; href: string }[] };

function useCurrent() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
}

// Escritorio: una fila de secciones; las que tienen subsecciones abren un panel
// con clic o teclado. Esc cierra y devuelve el foco al botón.
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
    <nav ref={nav} aria-label="Secciones" className="relative hidden border-t border-border md:block">
      <ul className="flex flex-wrap gap-x-6 text-ui font-semibold">
        <li>
          <Link href="/" aria-current={isCurrent("/") ? "page" : undefined} className={cx("inline-block border-b-2 py-3", isCurrent("/") ? "border-accent text-accent" : "border-transparent hover:text-accent")}>
            Portada
          </Link>
        </li>
        <li>
          <Link href="/ultima-hora" aria-current={isCurrent("/ultima-hora") ? "page" : undefined} className={cx("inline-block border-b-2 py-3", isCurrent("/ultima-hora") ? "border-accent text-accent" : "border-transparent hover:text-accent")}>
            Última hora
          </Link>
        </li>
        {sections.map((s) => {
          const current = isCurrent(s.href);
          const linkCls = cx("inline-flex items-center gap-1 border-b-2 py-3", current ? "border-accent text-accent" : "border-transparent hover:text-accent");
          if (!s.children.length)
            return (
              <li key={s.href}>
                <Link href={s.href} aria-current={current ? "page" : undefined} className={linkCls}>
                  {s.name}
                </Link>
              </li>
            );
          const isOpen = open === s.href;
          return (
            <li key={s.href}>
              <button type="button" data-menu={s.href} aria-expanded={isOpen} aria-controls={`menu-${s.href.slice(1)}`} onClick={() => setOpen(isOpen ? null : s.href)} className={linkCls}>
                {s.name}
                <ChevronDown className={cx("size-4 transition-transform duration-fast", isOpen && "rotate-180")} aria-hidden />
              </button>
              {isOpen && (
                <div id={`menu-${s.href.slice(1)}`} className="absolute inset-x-0 top-full z-40 border-y border-border bg-raised shadow-pop">
                  <ul className="grid grid-cols-4 gap-x-8 gap-y-1 px-0 py-5 font-normal">
                    <li>
                      <Link href={s.href} className="block py-1.5 font-semibold text-accent hover:underline">
                        Todo {s.name}
                      </Link>
                    </li>
                    {s.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} aria-current={isCurrent(c.href) ? "page" : undefined} className="block py-1.5 hover:text-accent hover:underline aria-[current=page]:text-accent">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Móvil: cajón a pantalla completa con las secciones en acordeón.
export function MobileMenu({ sections, orgName }: { sections: Item[]; orgName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isCurrent = useCurrent();
  const path = usePathname();

  useEffect(() => dialog.current?.close(), [path]);

  return (
    <>
      <button type="button" aria-label="Abrir menú" title="Abrir menú" onClick={() => dialog.current?.showModal()} className={iconButtonClass("md:hidden")}>
        <Menu className="size-4.5" aria-hidden />
      </button>
      <dialog ref={dialog} aria-label="Menú de secciones" className="m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 text-text backdrop:bg-scrim/60">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-display text-title">{orgName}</span>
          <form method="dialog">
            <button aria-label="Cerrar menú" title="Cerrar menú" className={iconButtonClass()}>
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
        <ul className="divide-y divide-border px-4 text-ui font-semibold">
          <li>
            <Link href="/" className="block py-3">
              Portada
            </Link>
          </li>
          <li>
            <Link href="/ultima-hora" className="block py-3">
              Última hora
            </Link>
          </li>
          {sections.map((s) => (
            <li key={s.href}>
              <div className="flex items-center justify-between">
                <Link href={s.href} aria-current={isCurrent(s.href) ? "page" : undefined} className="block flex-1 py-3 aria-[current=page]:text-accent">
                  {s.name}
                </Link>
                {s.children.length > 0 && (
                  <button type="button" aria-expanded={expanded === s.href} aria-label={`Subsecciones de ${s.name}`} onClick={() => setExpanded(expanded === s.href ? null : s.href)} className={iconButtonClass()}>
                    <ChevronDown className={cx("size-4 transition-transform duration-fast", expanded === s.href && "rotate-180")} aria-hidden />
                  </button>
                )}
              </div>
              {expanded === s.href && (
                <ul className="pb-3 pl-4 font-normal">
                  {s.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href} className="block py-2 hover:text-accent">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          <li>
            <Link href="/cuenta/entrar" className="block py-3">
              Entrar
            </Link>
          </li>
        </ul>
      </dialog>
    </>
  );
}
