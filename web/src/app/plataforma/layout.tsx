import type { Metadata } from "next";
import { LogOut, ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform";
import { PlatformNav } from "@/components/layout/platform-nav";
import { signOut } from "@/app/(public)/cuenta/actions";

export const metadata: Metadata = { title: { default: "Plataforma", template: "%s · Plataforma" }, robots: { index: false, follow: false } };

// Sin acceso, requirePlatformAdmin responde 404: la ruta no se anuncia.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-dvh bg-surface md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-inverse text-on-inverse md:sticky md:top-0 md:h-dvh">
        <div className="flex h-full flex-col gap-6 p-4 md:gap-9 md:px-5 md:py-7">
          <div className="flex items-center justify-between md:block">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" aria-hidden />
              <span className="eyebrow text-on-inverse-muted">NoticeCAT · IT</span>
            </div>
            <p className="font-display text-title md:mt-2">Plataforma</p>
          </div>
          <PlatformNav />
          <div className="mt-auto hidden space-y-4 md:block">
            <div className="border-t border-inverse-border pt-4">
              <p className="text-caption text-on-inverse-muted">Sesión</p>
              <p className="truncate text-ui-sm">{admin.email}</p>
            </div>
            <form action={signOut}>
              <button type="submit" className="flex items-center gap-2 text-ui-sm text-on-inverse-muted hover:text-on-inverse">
                <LogOut className="size-4" aria-hidden /> Salir
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="contenido" className="min-w-0 px-4 py-6 md:px-10 md:py-9">
        {children}
      </main>
    </div>
  );
}
