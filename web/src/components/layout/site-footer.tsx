import Link from "next/link";
import { Facebook, Instagram, Rss, Twitter } from "lucide-react";
import { getSectionTree } from "@/lib/data";
import type { Organization } from "@/lib/types";

export async function SiteFooter({ org }: { org: Organization }) {
  const tree = await getSectionTree(org.id);
  const year = new Date().getFullYear();
  const social = [
    { href: org.social.instagram, label: "Instagram", icon: Instagram },
    { href: org.social.facebook, label: "Facebook", icon: Facebook },
    { href: org.social.x, label: "X", icon: Twitter },
  ].filter((s) => s.href);
  const linkCls = "text-on-inverse-muted hover:text-on-inverse hover:underline";

  return (
    <footer className="mt-16 bg-inverse text-on-inverse">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-heading">{org.name}</p>
          <p className="mt-2 text-ui-sm text-on-inverse-muted">{org.tagline}</p>
          <div className="mt-4 flex gap-2">
            {social.map(({ href, label, icon: Icon }) => (
              <a key={label} href={href} aria-label={label} title={label} rel="noopener noreferrer" className="grid size-11 place-items-center border border-inverse-border text-on-inverse-muted hover:text-on-inverse md:size-8">
                <Icon className="size-4" aria-hidden />
              </a>
            ))}
            <Link href="/rss" aria-label="Feeds RSS" title="Feeds RSS" className="grid size-11 place-items-center border border-inverse-border text-on-inverse-muted hover:text-on-inverse md:size-8">
              <Rss className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <nav aria-label="Secciones del pie" className="md:col-span-2">
          <p className="eyebrow">Secciones</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-ui-sm sm:grid-cols-3">
            {tree.map((s) => (
              <li key={s.id}>
                <Link href={`/${s.slug}`} className={linkCls}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Servicios">
          <p className="eyebrow">Servicios</p>
          <ul className="mt-3 space-y-2 text-ui-sm">
            <li><Link href="/ultima-hora" className={linkCls}>Última hora</Link></li>
            <li><Link href={`/archivo/${year}`} className={linkCls}>Archivo</Link></li>
            <li><Link href="/buscar" className={linkCls}>Buscar</Link></li>
            <li><Link href="/rss" className={linkCls}>RSS</Link></li>
            <li><Link href="/contacto" className={linkCls}>Contacto</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-inverse-border">
        <div className="container-page flex flex-col gap-2 py-4 text-caption text-on-inverse-muted md:flex-row md:justify-between">
          <p>© {year} {org.name}</p>
          <p className="flex gap-4">
            <Link href="/legal/aviso-legal" className="hover:text-on-inverse">Aviso legal</Link>
            <Link href="/legal/privacidad" className="hover:text-on-inverse">Privacidad</Link>
            <span>Hecho con NoticeCAT</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
