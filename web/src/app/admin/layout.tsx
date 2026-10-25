import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { usingSupabase } from "@/lib/data";
import { getCurrentOrg, getCurrentStaff } from "@/lib/org";
import { Avatar } from "@/components/ui/misc";
import { AdminNav } from "@/components/layout/admin-nav";
import { signOut } from "@/app/(public)/cuenta/actions";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false } };

const roleNames = { owner: "Dueño", admin: "Administración", editor: "Edición", writer: "Redacción" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const org = await getCurrentOrg();
  const staff = await getCurrentStaff();

  if (!staff && usingSupabase && !(await getSessionUser())) redirect("/cuenta/entrar?siguiente=/admin");
  if (!staff) {
    return (
      <main className="container-page py-20 text-center">
        <h1 className="font-display text-heading">Sin acceso a este panel</h1>
        <p className="mt-2 text-ui text-text-muted">Tu usuario no pertenece al equipo de {org.name}.</p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-surface md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-inverse text-on-inverse md:sticky md:top-0 md:h-dvh">
        <div className="flex h-full flex-col gap-6 p-4 md:gap-9 md:px-5 md:py-7">
          <div className="flex items-center justify-between md:block">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-accent" aria-hidden />
              <span className="eyebrow text-on-inverse-muted">NoticeCAT</span>
            </div>
            <p className="font-display text-title md:mt-2">{org.name}</p>
          </div>
          <AdminNav />
          <div className="mt-auto hidden space-y-4 md:block">
            <Link href="/" target="_blank" className="flex items-center gap-2 text-ui-sm text-on-inverse-muted hover:text-on-inverse">
              <ExternalLink className="size-4" aria-hidden /> Ver el sitio
            </Link>
            <div className="flex items-center gap-3 border-t border-inverse-border pt-4">
              <Avatar name={staff.user.name} photo={null} size={32} />
              <div className="min-w-0">
                <p className="truncate text-ui-sm">{staff.user.name}</p>
                <p className="text-caption text-on-inverse-muted">{roleNames[staff.role]}</p>
              </div>
            </div>
            {usingSupabase && (
              <form action={signOut}>
                <button type="submit" className="flex items-center gap-2 text-ui-sm text-on-inverse-muted hover:text-on-inverse">
                  <LogOut className="size-4" aria-hidden /> Salir
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
      <main id="contenido" className="min-w-0 px-4 py-6 md:px-10 md:py-9">
        {children}
      </main>
    </div>
  );
}
