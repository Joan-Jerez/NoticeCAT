import type { Metadata } from "next";
import { listContent, listOrgs } from "@/lib/platform";
import { ContentTable } from "@/components/platform/content-table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export const metadata: Metadata = { title: "Contenido" };

const statuses = [
  ["", "Todos los estados"],
  ["published", "Publicadas"],
  ["scheduled", "Programadas"],
  ["draft", "Borradores"],
  ["archived", "Archivadas"],
] as const;

export default async function PlatformContent({ searchParams }: { searchParams: Promise<{ medio?: string; estado?: string; q?: string }> }) {
  const sp = await searchParams;
  const [rows, orgs] = await Promise.all([listContent({ orgId: sp.medio, status: sp.estado, q: sp.q }), listOrgs()]);
  const hosts = Object.fromEntries(orgs.map((o) => [o.id, { host: o.host, slug: o.slug }]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-heading-lg font-semibold">Contenido</h1>
        <p className="mt-1 text-ui text-text-muted">Las notas de todos los medios, de la más reciente a la más antigua (hasta 200).</p>
      </header>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-56 flex-1 text-ui-sm">
          Título
          <Input name="q" defaultValue={sp.q} placeholder="Buscar en títulos" className="mt-1" />
        </label>
        <label className="w-52 text-ui-sm">
          Medio
          <Select name="medio" defaultValue={sp.medio ?? ""} className="mt-1">
            <option value="">Todos los medios</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-48 text-ui-sm">
          Estado
          <Select name="estado" defaultValue={sp.estado ?? ""} className="mt-1">
            {statuses.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <ContentTable rows={rows} hosts={hosts} dev={process.env.NODE_ENV !== "production"} />
    </div>
  );
}
