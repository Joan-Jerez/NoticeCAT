import type { Metadata } from "next";
import { Rss } from "lucide-react";
import { listSections } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { PageHeader } from "@/components/news/listing";

export const metadata: Metadata = { title: "Feeds RSS" };

export default async function RssIndex() {
  const org = await getCurrentOrg();
  const feeds = [{ name: "Portada (todas las notas)", slug: "portada" }, ...(await listSections(org.id)).filter((s) => !s.parentId && s.rssEnabled).map((s) => ({ name: s.name, slug: s.slug }))];
  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader kind="Servicios" title="Feeds RSS" description="Copia la dirección de un feed en tu lector de noticias para recibir las notas nuevas." />
      <ul className="mt-8 max-w-article divide-y divide-border">
        {feeds.map((f) => (
          <li key={f.slug} className="flex flex-wrap items-center justify-between gap-2 py-4">
            <span className="font-display text-title-sm">{f.name}</span>
            <a href={`/rss/${f.slug}.xml`} className="inline-flex items-center gap-2 text-ui-sm text-accent hover:underline">
              <Rss className="size-4" aria-hidden />/rss/{f.slug}.xml
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
