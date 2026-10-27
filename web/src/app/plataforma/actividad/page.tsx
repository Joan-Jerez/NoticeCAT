import type { Metadata } from "next";
import Link from "next/link";
import { FileText, KeyRound, LogIn, LogOut, ShieldCheck, Tag, TriangleAlert, UserRound } from "lucide-react";
import { listAudit, listOrgs, listUsers, type AuditFilter } from "@/lib/platform";
import { cx } from "@/lib/cx";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export const metadata: Metadata = { title: "Actividad" };

const groups = [
  ["", "Todo"],
  ["cuentas", "Cuentas y accesos"],
  ["notas", "Notas"],
  ["temas", "Temas seguidos"],
  ["plataforma", "Panel de IT"],
] as const;

// icono y color por tipo de acción; los intentos fallidos y lo que borra resaltan
function look(action: string) {
  if (action === "auth.signin_failed") return { icon: TriangleAlert, cls: "bg-warning-bg text-warning" };
  if (action.endsWith("deleted") || action.endsWith("blocked")) return { icon: TriangleAlert, cls: "bg-danger-bg text-danger" };
  if (action === "auth.signout") return { icon: LogOut, cls: "bg-neutral-bg text-neutral" };
  if (action.startsWith("auth.password")) return { icon: KeyRound, cls: "bg-neutral-bg text-neutral" };
  if (action.startsWith("auth.")) return { icon: LogIn, cls: "bg-success-bg text-success" };
  if (action.startsWith("article.")) return { icon: FileText, cls: "bg-surface-tint text-accent" };
  if (action.startsWith("topic.")) return { icon: Tag, cls: "bg-surface-tint text-accent" };
  if (action.startsWith("platform.")) return { icon: ShieldCheck, cls: "bg-inverse text-on-inverse" };
  return { icon: UserRound, cls: "bg-neutral-bg text-neutral" };
}

const fmt = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/Santo_Domingo" });

export default async function Activity({ searchParams }: { searchParams: Promise<{ usuario?: string; medio?: string; tipo?: string; desde?: string; hasta?: string; antes?: string }> }) {
  const sp = await searchParams;
  const filter: AuditFilter = { actor: sp.usuario, org: sp.medio, group: sp.tipo, from: sp.desde, to: sp.hasta, before: sp.antes };
  const [{ rows, next, missing }, users, orgs] = await Promise.all([listAudit(filter), listUsers(), listOrgs()]);
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const nextHref = next ? `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "antes")), antes: next })}` : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-heading-lg font-semibold">Actividad</h1>
        <p className="mt-1 text-ui text-text-muted">Quién hizo qué y cuándo. El registro solo se añade: nadie puede editarlo desde la app. Las horas están en hora de Santo Domingo.</p>
      </header>

      {missing && (
        <div role="alert" className="rounded-lg bg-warning-bg p-5 text-ui text-warning">
          <p className="font-semibold">El registro todavía no está activo.</p>
          <p className="mt-1">
            Falta crear su tabla en Supabase. En una terminal, dentro de la carpeta <code>web</code>, ejecuta <code>npx supabase db push</code> y responde Y.
          </p>
        </div>
      )}

      <form className="flex flex-wrap items-end gap-3 rounded-lg bg-raised p-4 shadow-card" role="search">
        <label className="min-w-56 flex-1 text-ui-sm">
          Usuario
          <Select name="usuario" defaultValue={sp.usuario ?? ""} className="mt-1">
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-48 text-ui-sm">
          Medio
          <Select name="medio" defaultValue={sp.medio ?? ""} className="mt-1">
            <option value="">Todos</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-48 text-ui-sm">
          Tipo
          <Select name="tipo" defaultValue={sp.tipo ?? ""} className="mt-1">
            {groups.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-40 text-ui-sm">
          Desde
          <Input type="date" name="desde" defaultValue={sp.desde} className="mt-1" />
        </label>
        <label className="w-40 text-ui-sm">
          Hasta
          <Input type="date" name="hasta" defaultValue={sp.hasta} className="mt-1" />
        </label>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {Object.values(sp).some(Boolean) && (
          <Link href="/plataforma/actividad" className="py-2 text-ui-sm text-text-muted hover:text-accent">
            Quitar filtros
          </Link>
        )}
      </form>

      {!missing && rows.length === 0 && <p className="rounded-lg bg-raised p-6 text-ui text-text-muted shadow-card">No hay acciones con esos filtros.</p>}

      {rows.length > 0 && (
        <ol className="overflow-hidden rounded-lg bg-raised shadow-card">
          {rows.map((r) => {
            const { icon: Icon, cls } = look(r.action);
            return (
              <li key={r.id} className="flex gap-4 border-b border-border px-4 py-3 last:border-0 hover:bg-surface">
                <span className={cx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", cls)} aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ui">
                    {r.actorId ? (
                      <Link href={`?usuario=${r.actorId}`} className="font-semibold hover:text-accent">
                        {r.actorEmail ?? "Cuenta borrada"}
                      </Link>
                    ) : (
                      <span className="font-semibold text-text-muted">{r.actorEmail ?? "Sin sesión"}</span>
                    )}{" "}
                    <span>{r.summary}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-caption text-text-muted">
                    <time dateTime={r.at}>{fmt.format(new Date(r.at))}</time>
                    {r.orgId && <span>· {orgName.get(r.orgId) ?? "Medio borrado"}</span>}
                    <span>
                      · <code className="font-mono">{r.action}</code>
                    </span>
                    {r.ipHash && <span title="Huella de la IP (hash con sal), no la IP real">· IP {r.ipHash.slice(0, 8)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {nextHref && (
        <div className="flex justify-center">
          <ButtonLink href={nextHref} variant="secondary">
            Ver más antiguas
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
