import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgDetail } from "@/lib/platform";
import { BillingForm, DeleteOrgForm, DomainsEditor, EnterPanelButton, OrgDetailsForm, SectionsEditor } from "@/components/platform/org-forms";
import { Panel } from "@/components/platform/shared";
import { ContactForm, LogoForm, ThemeEditor } from "@/components/platform/appearance-forms";

export const metadata: Metadata = { title: "Medio" };

const roleNames = { owner: "Dueño", admin: "Administración", editor: "Edición", writer: "Redacción" } as const;

export default async function OrgPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  const [{ id }, { creado }] = await Promise.all([params, searchParams]);
  const org = await getOrgDetail(id);
  if (!org) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/plataforma" className="text-ui-sm text-text-muted hover:text-accent">
            ← Medios
          </Link>
          <h1 className="mt-2 font-display text-heading-lg font-semibold">{org.name}</h1>
          <p className="mt-1 text-ui text-text-muted">{org.domains.find((d) => d.isPrimary)?.host ?? `${org.slug} · sin dominio`}</p>
        </div>
        <EnterPanelButton orgId={org.id} />
      </header>
      {creado && <p role="status" className="rounded-md bg-success-bg px-4 py-3 text-ui text-success">Medio creado. Ya puedes entrar a su panel y publicar.</p>}

      <Panel title="Datos">
        <OrgDetailsForm org={org} />
      </Panel>
      <Panel title="Apariencia" description="Así se verá la web del medio. Cambia y mira la vista previa; nada se aplica hasta que guardes.">
        <ThemeEditor org={org} />
      </Panel>
      <Panel title="Logo">
        <LogoForm org={org} />
      </Panel>
      <Panel title="Redes y contacto" description="Aparecen en el pie de página. Deja vacío lo que el medio no use.">
        <ContactForm org={org} />
      </Panel>
      <Panel title="Plan" description="Mientras no haya cobro con Stripe, el plan y su estado se fijan a mano aquí.">
        <BillingForm org={org} />
      </Panel>
      <Panel title="Dominios" description="El medio se elige por el dominio con el que entra el lector.">
        <DomainsEditor org={org} />
      </Panel>
      <Panel title="Secciones" description="Pulsa el nombre para cambiarlo. Una sección con notas no se puede borrar.">
        <SectionsEditor org={org} />
      </Panel>
      <Panel title="Equipo" description="Los roles se cambian en Usuarios.">
        {org.team.length === 0 ? (
          <p className="text-ui-sm text-text-muted">Nadie todavía.</p>
        ) : (
          <ul className="divide-y divide-border">
            {org.team.map((m) => (
              <li key={m.userId} className="flex justify-between py-2 text-ui">
                <span>{m.email}</span>
                <span className="text-text-muted">{roleNames[m.role]}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/plataforma/usuarios" className="mt-3 inline-block text-ui-sm font-semibold text-accent hover:underline">
          Gestionar en Usuarios →
        </Link>
      </Panel>
      <Panel title="Zona peligrosa" description="Borra el medio con sus notas, secciones, encuestas, equipo y lectores. No se puede deshacer." tone="danger">
        <DeleteOrgForm org={org} />
      </Panel>
    </div>
  );
}
