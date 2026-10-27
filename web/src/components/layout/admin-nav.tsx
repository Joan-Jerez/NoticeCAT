"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, FileUp, LayoutDashboard, Newspaper } from "lucide-react";
import { cx } from "@/lib/cx";

const items = [
  { href: "/admin", label: "Notas", icon: LayoutDashboard, exact: true },
  { href: "/admin/notas/nueva", label: "Nueva nota", icon: FilePlus2 },
  { href: "/admin/importar", label: "Importar archivo", icon: FileUp },
  { href: "/", label: "Ver portada", icon: Newspaper, external: true },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {items.map(({ href, label, icon: Icon, exact, external }) => {
          const current = !external && (exact ? path === href : path.startsWith(href));
          return (
            <li key={href} className={cx(external && "md:hidden")}>
              <Link
                href={href}
                target={external ? "_blank" : undefined}
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
