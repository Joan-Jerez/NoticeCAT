import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Music2, Phone, Rss, Twitter, Youtube } from "lucide-react";
import { getSectionTree } from "@/lib/data";
import type { Organization } from "@/lib/types";

export async function SiteFooter({ org }: { org: Organization }) {
  const tree = await getSectionTree(org.id);
  const year = new Date().getFullYear();
  const social = [
    { href: org.social.instagram, label: "Instagram", icon: Instagram },
    { href: org.social.facebook, label: "Facebook", icon: Facebook },
    { href: org.social.x, label: "X", icon: Twitter },
    { href: org.social.youtube, label: "YouTube", icon: Youtube },
    { href: org.social.tiktok, label: "TikTok", icon: Music2 },
    { href: org.social.whatsapp, label: "WhatsApp", icon: MessageCircle },
  ].filter((s) => s.href);
  const { about, email, phone, address } = org.contact;
  const linkCls = "text-on-inverse-muted transition-colors duration-fast hover:text-on-inverse";
  const roundCls = "press grid size-11 place-items-center rounded-full bg-inverse-surface text-on-inverse-muted hover:bg-accent hover:text-on-accent md:size-10";

  return (
    <footer className="mt-20 rounded-t-lg bg-inverse text-on-inverse md:mx-4 md:rounded-t-[calc(var(--radius-lg)*1.5)]">
      <div className="container-page grid gap-12 pb-10 pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="font-display text-heading-lg font-semibold">{org.name}</p>
          <p className="mt-3 max-w-card font-serif text-dek italic text-on-inverse-muted">{org.tagline}</p>
          {about && <p className="mt-4 max-w-sm text-ui-sm text-on-inverse-muted">{about}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {social.map(({ href, label, icon: Icon }) => (
              <a key={label} href={href} aria-label={label} title={label} rel="noopener noreferrer" className={roundCls}>
                <Icon className="size-4" aria-hidden />
              </a>
            ))}
            <Link href="/rss" aria-label="Feeds RSS" title="Feeds RSS" className={roundCls}>
              <Rss className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="grid gap-10 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <nav aria-label="Secciones del pie">
            <p className="eyebrow text-on-inverse-muted">Secciones</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-ui">
              {tree.map((s) => (
                <li key={s.id}>
                  <Link href={`/${s.slug}`} className={linkCls}>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-10">
            <nav aria-label="Servicios">
              <p className="eyebrow text-on-inverse-muted">Servicios</p>
              <ul className="mt-4 space-y-2.5 text-ui">
                <li><Link href="/ultima-hora" className={linkCls}>Última hora</Link></li>
                <li><Link href={`/archivo/${year}`} className={linkCls}>Archivo</Link></li>
                <li><Link href="/buscar" className={linkCls}>Buscar</Link></li>
                <li><Link href="/rss" className={linkCls}>RSS</Link></li>
                <li><Link href="/contacto" className={linkCls}>Contacto</Link></li>
              </ul>
            </nav>
            {(email || phone || address) && (
              <address className="not-italic">
                <p className="eyebrow text-on-inverse-muted">Redacción</p>
                <ul className="mt-4 space-y-2.5 text-ui-sm">
                  {email && (
                    <li>
                      <a href={`mailto:${email}`} className={`inline-flex items-center gap-2 ${linkCls}`}>
                        <Mail className="size-3.5 shrink-0" aria-hidden /> {email}
                      </a>
                    </li>
                  )}
                  {phone && (
                    <li>
                      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={`inline-flex items-center gap-2 ${linkCls}`}>
                        <Phone className="size-3.5 shrink-0" aria-hidden /> {phone}
                      </a>
                    </li>
                  )}
                  {address && (
                    <li className="flex items-start gap-2 text-on-inverse-muted">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {address}
                    </li>
                  )}
                </ul>
              </address>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-inverse-border">
        <div className="container-page flex flex-col gap-2 py-5 text-caption text-on-inverse-muted md:flex-row md:justify-between">
          <p>© {year} {org.name}</p>
          <p className="flex gap-4">
            <Link href="/legal/aviso-legal" className={linkCls}>Aviso legal</Link>
            <Link href="/legal/privacidad" className={linkCls}>Privacidad</Link>
            <span>Hecho con CatCoding</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
