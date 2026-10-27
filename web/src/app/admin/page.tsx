import Link from "next/link";
import { FilePlus2, FileText, Search } from "lucide-react";
import { getAdminStats, listAdminArticles } from "@/lib/data";
import { formatShortDate, formatTime } from "@/lib/format";
import { getCurrentOrg } from "@/lib/org";
import { cx } from "@/lib/cx";
import type { ArticleStatus } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState, StatusChip } from "@/components/ui/misc";

const tabs: { value: ArticleStatus | undefined; label: string }[] = [
  { value: undefined, label: "Todas" },
  { value: "published", label: "Publicadas" },
  { value: "scheduled", label: "Programadas" },
  { value: "draft", label: "Borradores" },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; borrada?: string }> }) {
  const org = await getCurrentOrg();
  const sp = await searchParams;
  const estado = tabs.find((t) => t.value === sp.estado)?.value;
  const q = sp.q?.trim() ?? "";
  const [stats, articles] = await Promise.all([getAdminStats(org.id), listAdminArticles(org.id, { status: estado, q })]);
  const when = (iso: string | null) => (iso ? `${formatShortDate(iso, org)} · ${formatTime(iso, org)}` : "—");
  const qs = (e?: string) => `/admin?${new URLSearchParams({ ...(e ? { estado: e } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="mx-auto max-w-content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-text-muted">Panel</p>
          <h1 className="font-display text-heading-lg">Notas</h1>
        </div>
        <ButtonLink href="/admin/notas/nueva">
          <FilePlus2 className="size-4" aria-hidden />
          Nueva nota
        </ButtonLink>
      </div>

      {sp.borrada && (
        <p role="status" className="mt-4 rounded-sm bg-success-bg px-4 py-3 text-ui text-success">La nota se borró.</p>
      )}

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-sm border border-border bg-raised p-5">
          <dt className="eyebrow text-text-muted">Publicadas hoy</dt>
          <dd className="font-display text-heading">{stats.publishedToday}</dd>
          <dd className="text-caption text-text-muted">{stats.total} publicadas en total</dd>
        </div>
        <div className="rounded-sm border border-border bg-raised p-5">
          <dt className="eyebrow text-text-muted">Programadas</dt>
          <dd className="font-display text-heading">{stats.scheduled}</dd>
          <dd className="text-caption text-text-muted">{stats.nextScheduledAt ? `la próxima: ${when(stats.nextScheduledAt)}` : "ninguna pendiente"}</dd>
        </div>
        <div className="rounded-sm border border-border bg-raised p-5">
          <dt className="eyebrow text-text-muted">Borradores</dt>
          <dd className="font-display text-heading">{stats.drafts}</dd>
          <dd className="text-caption text-text-muted">sin publicar</dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filtrar por estado">
          <ul className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <li key={t.label}>
                <Link href={qs(t.value)} aria-current={estado === t.value ? "page" : undefined} className={cx("inline-block rounded-sm px-3 py-1.5 text-ui-sm font-semibold", estado === t.value ? "bg-inverse text-on-inverse" : "text-text-muted hover:bg-raised hover:text-text")}>
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form role="search" className="flex gap-2">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <label htmlFor="admin-q" className="sr-only">Buscar por título</label>
          <Input id="admin-q" name="q" type="search" defaultValue={q} placeholder="Buscar por título" className="h-8 w-56 text-ui-sm" />
          <Button type="submit" variant="secondary" size="sm" aria-label="Buscar"><Search className="size-4" aria-hidden /></Button>
        </form>
      </div>

      <div className="mt-4">
        {articles.length === 0 ? (
          <EmptyState icon={FileText} title={q ? `Ninguna nota contiene «${q}»` : "No hay notas aquí"} action={<ButtonLink href="/admin/notas/nueva" variant="secondary">Escribir una nota</ButtonLink>}>
            {q ? "Prueba con otra palabra." : "Cuando crees o publiques notas, aparecerán en esta lista."}
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border bg-raised">
            <table className="w-full text-left text-ui">
              <caption className="sr-only">Notas del medio, de la más reciente a la más antigua</caption>
              <thead className="hidden border-b border-border md:table-header-group">
                <tr className="eyebrow text-text-muted">
                  <th scope="col" className="px-4 py-3">Título</th>
                  <th scope="col" className="px-4 py-3">Sección</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.map((a) => (
                  <tr key={a.id} className="block p-4 hover:bg-surface md:table-row md:p-0">
                    <td className="block md:table-cell md:px-4 md:py-3">
                      <Link href={`/admin/notas/${a.id}`} className="font-display text-title-sm hover:underline">{a.title}</Link>
                      <p className="text-caption text-text-muted">{a.author?.name ?? "Sin autor"}</p>
                    </td>
                    <td className="inline md:table-cell md:px-4 md:py-3">
                      <span className="text-ui-sm text-text-muted md:text-text">{a.parentSection ? `${a.parentSection.name} › ` : ""}{a.section.name}</span>
                    </td>
                    <td className="mt-2 block md:mt-0 md:table-cell md:px-4 md:py-3"><StatusChip value={a.status} /></td>
                    <td className="mt-1 block whitespace-nowrap text-caption text-text-muted md:mt-0 md:table-cell md:px-4 md:py-3">{when(a.publishedAt ?? a.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
