import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ExternalLink, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { listOrgs, listUsers } from "@/lib/platform";

export const metadata: Metadata = { title: "Medios" };

const plans: Record<string, string> = { trial: "Prueba", starter: "Starter", pro: "Pro", newsroom: "Redacción" };
const billing: Record<string, [string, string]> = {
  trialing: ["En prueba", "bg-neutral-bg text-neutral"],
  active: ["Al día", "bg-success-bg text-success"],
  past_due: ["Pago atrasado", "bg-warning-bg text-warning"],
  canceled: ["Cancelado", "bg-danger-bg text-danger"],
  incomplete: ["Incompleto", "bg-warning-bg text-warning"],
};

export default async function PlatformHome({ searchParams }: { searchParams: Promise<{ borrado?: string }> }) {
  const { borrado } = await searchParams;
  const [orgs, users] = await Promise.all([listOrgs(), listUsers()]);
  const stats = [
    { label: "Medios", value: orgs.length },
    { label: "Usuarios", value: users.length },
    { label: "Notas publicadas", value: orgs.reduce((n, o) => n + o.published, 0) },
    { label: "Borradores", value: orgs.reduce((n, o) => n + o.drafts, 0) },
    { label: "Sin confirmar", value: users.filter((u) => !u.confirmed).length },
    { label: "Bloqueados", value: users.filter((u) => u.banned).length },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-lg font-semibold">Medios</h1>
          <p className="mt-1 text-ui text-text-muted">Todo lo que corre en CatCoding. Solo tú ves esta página.</p>
        </div>
        <ButtonLink href="/plataforma/medios/nuevo">
          <Plus className="size-4" aria-hidden /> Nuevo medio
        </ButtonLink>
      </header>
      {borrado && <p role="status" className="rounded-md bg-success-bg px-4 py-3 text-ui text-success">Medio borrado.</p>}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-raised p-4 shadow-card">
            <dt className="text-caption text-text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-heading font-semibold tabular-nums">{s.value.toLocaleString("es-DO")}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-lg bg-raised shadow-card">
        <table className="w-full min-w-[56rem] text-left text-ui">
          <caption className="sr-only">Medios de la plataforma</caption>
          <thead className="border-b border-border text-caption text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Medio</th>
              <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Equipo</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Lectores</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Publicadas</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Borradores</th>
              <th scope="col" className="px-4 py-3 font-semibold">Última nota</th>
              <th scope="col" className="px-4 py-3 font-semibold">Alta</th>
              <th scope="col"><span className="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgs.map((o) => {
              const [status, statusCls] = billing[o.billingStatus] ?? [o.billingStatus, "bg-neutral-bg text-neutral"];
              return (
                <tr key={o.id} className="transition-colors duration-fast hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/plataforma/medios/${o.id}`} className="font-semibold hover:text-accent">
                      {o.name}
                    </Link>
                    {o.host ? (
                      <a href={`https://${o.host}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-accent">
                        {o.host} <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : (
                      <p className="text-caption text-text-muted">{o.slug} · sin dominio</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p>{plans[o.plan] ?? o.plan}</p>
                    <span className={`eyebrow mt-1 inline-block rounded-pill px-2 py-0.5 ${statusCls}`}>{status}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.staff}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.readers}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.published}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.drafts}</td>
                  <td className="px-4 py-3">{fmtDate(o.lastPublishedAt)}</td>
                  <td className="px-4 py-3">{fmtDate(o.createdAt)}</td>
                  <td className="pr-3">
                    <Link href={`/plataforma/medios/${o.id}`} aria-label={`Gestionar ${o.name}`} title="Gestionar" className="press grid size-9 place-items-center rounded-full hover:bg-surface-tint">
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
