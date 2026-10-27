import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform";
import { CreateOrgForm } from "@/components/platform/org-forms";

export const metadata: Metadata = { title: "Nuevo medio" };

export default async function NewOrg() {
  await requirePlatformAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link href="/plataforma" className="text-ui-sm text-text-muted hover:text-accent">
          ← Medios
        </Link>
        <h1 className="mt-2 font-display text-heading-lg font-semibold">Nuevo medio</h1>
        <p className="mt-1 text-ui text-text-muted">Se crea con las secciones País, Mundo, Economía, Deportes, Cultura y Opinión, en plan de prueba. Todo se puede cambiar después.</p>
      </header>
      <CreateOrgForm />
    </div>
  );
}
