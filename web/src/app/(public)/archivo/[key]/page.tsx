import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { countArticlesByDay, listArticles } from "@/lib/data";
import { dayKey, formatLongDate, monthName } from "@/lib/format";
import { getCurrentOrg } from "@/lib/org";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Listing, PageHeader } from "@/components/news/listing";
import { CalendarX } from "lucide-react";

// /archivo/2026          -> días con notas de ese año
// /archivo/2026-10-25    -> notas de ese día (en la zona horaria del medio)
type Props = { params: Promise<{ key: string }> };

function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function validDay(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = new Date(`${key}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  return { title: `Archivo ${key}` };
}

export default async function ArchivePage({ params }: Props) {
  const { key } = await params;
  const org = await getCurrentOrg();
  const today = dayKey(new Date().toISOString(), org.timezone);

  if (/^\d{4}$/.test(key)) {
    const year = Number(key);
    const counts = await countArticlesByDay(org.id, year);
    const months = new Map<number, [string, number][]>();
    for (const [day, n] of Object.entries(counts).sort().reverse()) {
      const m = Number(day.slice(5, 7));
      months.set(m, [...(months.get(m) ?? []), [day, n]]);
    }
    const thisYear = Number(today.slice(0, 4));
    return (
      <div className="container-page pt-8 md:pt-12">
        <PageHeader
          kind="Archivo"
          title={key}
          aside={
            <div className="flex gap-2">
              <Link href={`/archivo/${year - 1}`} className={buttonClass("secondary", "sm")}><ChevronLeft className="size-4" aria-hidden />{year - 1}</Link>
              {year < thisYear && <Link href={`/archivo/${year + 1}`} className={buttonClass("secondary", "sm")}>{year + 1}<ChevronRight className="size-4" aria-hidden /></Link>}
            </div>
          }
        />
        {months.size === 0 ? (
          <div className="mt-8"><EmptyState icon={CalendarX} title={`No hay notas en ${key}`}>Prueba con otro año.</EmptyState></div>
        ) : (
          <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[...months].map(([m, days]) => (
              <section key={m} aria-labelledby={`mes-${m}`}>
                <h2 id={`mes-${m}`} className="border-b border-border pb-2 font-display text-title capitalize">{monthName(m)}</h2>
                <ul className="mt-3 grid grid-cols-4 gap-2 text-ui-sm">
                  {days.map(([day, n]) => (
                    <li key={day}>
                      <Link href={`/archivo/${day}`} className="block rounded-xs bg-surface px-2 py-1.5 text-center hover:bg-surface-tint">
                        <span className="block font-semibold">{Number(day.slice(8))}</span>
                        <span className="block text-caption text-text-muted">{n} {n === 1 ? "nota" : "notas"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!validDay(key)) notFound();
  const filter = { day: key };
  const page = await listArticles(org.id, filter, { limit: 50 });
  const prev = shiftDay(key, -1);
  const next = shiftDay(key, 1);

  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader
        kind="Archivo"
        title={formatLongDate(key, org)}
        description={<Link href={`/archivo/${key.slice(0, 4)}`} className="text-accent hover:underline">Ver todo {key.slice(0, 4)}</Link>}
        aside={
          <nav aria-label="Cambiar de día" className="flex gap-2">
            <Link href={`/archivo/${prev}`} className={buttonClass("secondary", "sm")} aria-label="Día anterior"><ChevronLeft className="size-4" aria-hidden /><span className="hidden sm:inline">Anterior</span></Link>
            {key < today && <Link href={`/archivo/${next}`} className={buttonClass("secondary", "sm")} aria-label="Día siguiente"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="size-4" aria-hidden /></Link>}
          </nav>
        }
      />
      <Listing org={org} page={page} filter={filter} showLatest={false} empty={{ title: key > today ? "Ese día todavía no llega" : "No se publicó nada ese día", text: "Usa los botones para ir a otro día." }} />
    </div>
  );
}
