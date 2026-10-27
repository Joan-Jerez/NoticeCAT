"use client";

import { useState } from "react";
import { Archive, ExternalLink, Star, Trash2, Undo2 } from "lucide-react";
import { deleteArticleAny, setArticleStatus, setFeatured } from "@/app/plataforma/actions";
import type { ContentRow } from "@/lib/platform";
import { cx } from "@/lib/cx";
import { fmtDate } from "@/lib/format";
import { StatusChip } from "@/components/ui/misc";
import { Flash, useRun } from "./shared";

const iconBtn = "press grid size-9 place-items-center rounded-full text-text-muted hover:bg-surface-tint hover:text-text disabled:opacity-40";

export function ContentTable({ rows, hosts, dev }: { rows: ContentRow[]; hosts: Record<string, { host: string | null; slug: string }>; dev: boolean }) {
  const { flash, pending, run } = useRun();
  // borrar pide un segundo clic sobre el mismo botón
  const [arming, setArming] = useState<string | null>(null);

  // en local los medios se distinguen con ?org=; en producción, por su dominio
  const href = (r: ContentRow) => {
    const o = hosts[r.orgId];
    if (!r.url || !o) return null;
    if (dev) return `${r.url}?org=${o.slug}`;
    return o.host ? `https://${o.host}${r.url}` : null;
  };

  if (rows.length === 0) return <p className="rounded-lg bg-raised p-6 text-ui text-text-muted shadow-card">No hay notas con esos filtros.</p>;

  return (
    <div className="space-y-2">
      <Flash result={flash} />
      <div className="overflow-x-auto rounded-lg bg-raised shadow-card">
        <table className="w-full min-w-[56rem] text-left text-ui">
          <caption className="sr-only">Notas de todos los medios</caption>
          <thead className="border-b border-border text-caption text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Nota</th>
              <th scope="col" className="px-4 py-3 font-semibold">Medio</th>
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Publicada</th>
              <th scope="col" className="px-4 py-3 font-semibold">Cambio</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const link = href(r);
              return (
                <tr key={r.id} className="transition-colors duration-fast hover:bg-surface">
                  <td className="max-w-md px-4 py-3">
                    <p className="flex items-start gap-1.5 font-semibold">
                      {r.isFeatured && <Star className="mt-0.5 size-3.5 shrink-0 fill-accent text-accent" aria-label="Destacada" />}
                      <span className="line-clamp-2">{r.title}</span>
                    </p>
                    <p className="text-caption text-text-muted">{r.section}</p>
                  </td>
                  <td className="px-4 py-3">{r.orgName}</td>
                  <td className="px-4 py-3">
                    <StatusChip value={r.status as "draft" | "scheduled" | "published" | "archived"} />
                  </td>
                  <td className="px-4 py-3">{fmtDate(r.publishedAt)}</td>
                  <td className="px-4 py-3">{fmtDate(r.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" title="Ver en el sitio" aria-label={`Ver «${r.title}» en el sitio`} className={iconBtn}>
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      )}
                      <button
                        type="button"
                        title={r.isFeatured ? "Quitar de destacadas" : "Destacar en portada"}
                        aria-label={r.isFeatured ? `Quitar «${r.title}» de destacadas` : `Destacar «${r.title}»`}
                        aria-pressed={r.isFeatured}
                        disabled={pending}
                        onClick={() => run(() => setFeatured(r.id, !r.isFeatured))}
                        className={cx(iconBtn, r.isFeatured && "text-accent")}
                      >
                        <Star className={cx("size-4", r.isFeatured && "fill-current")} aria-hidden />
                      </button>
                      {(r.status === "published" || r.status === "scheduled") && (
                        <button type="button" title="Retirar (vuelve a borrador)" aria-label={`Retirar «${r.title}»`} disabled={pending} onClick={() => run(() => setArticleStatus(r.id, "draft"))} className={iconBtn}>
                          <Undo2 className="size-4" aria-hidden />
                        </button>
                      )}
                      {r.status !== "archived" && (
                        <button type="button" title="Archivar" aria-label={`Archivar «${r.title}»`} disabled={pending} onClick={() => run(() => setArticleStatus(r.id, "archived"))} className={iconBtn}>
                          <Archive className="size-4" aria-hidden />
                        </button>
                      )}
                      <button
                        type="button"
                        title={arming === r.id ? "Pulsa otra vez para borrar" : "Borrar"}
                        aria-label={arming === r.id ? `Confirmar: borrar «${r.title}»` : `Borrar «${r.title}»`}
                        disabled={pending}
                        onBlur={() => setArming(null)}
                        onClick={() => {
                          if (arming !== r.id) return setArming(r.id);
                          setArming(null);
                          run(() => deleteArticleAny(r.id));
                        }}
                        className={cx(iconBtn, "hover:bg-danger-bg hover:text-danger", arming === r.id && "w-auto bg-danger px-3 text-on-accent hover:bg-danger hover:text-on-accent")}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {arming === r.id && <span className="ml-1 text-caption font-semibold">¿Borrar?</span>}
                      </button>
                    </div>
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
