"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, FileText, Server, Users } from "lucide-react";
import { cx } from "@/lib/cx";

const items = [
  { href: "/plataforma", label: "Medios", icon: Building2, match: ["/plataforma", "/plataforma/medios"] },
  { href: "/plataforma/contenido", label: "Contenido", icon: FileText },
  { href: "/plataforma/usuarios", label: "Usuarios", icon: Users },
  { href: "/plataforma/actividad", label: "Actividad", icon: Activity },
  { href: "/plataforma/sistema", label: "Sistema", icon: Server },
];

export function PlatformNav() {
  const path = usePathname();
  return (
    <nav aria-label="Plataforma">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {items.map(({ href, label, icon: Icon, match }) => {
          const current = match ? path === match[0] || match.slice(1).some((m) => path.startsWith(m)) : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cx("flex min-h-11 items-center gap-3 whitespace-nowrap rounded-sm px-3 text-ui md:min-h-0 md:py-2.5", current ? "bg-inverse-surface text-on-inverse" : "text-on-inverse-muted hover:text-on-inverse")}
              >
                <Icon className="size-4.5 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
