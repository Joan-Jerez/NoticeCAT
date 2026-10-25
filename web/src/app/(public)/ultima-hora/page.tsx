import type { Metadata } from "next";
import { listArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { Listing, PageHeader } from "@/components/news/listing";

export const metadata: Metadata = { title: "Última hora" };

export default async function LatestPage() {
  const org = await getCurrentOrg();
  const page = await listArticles(org.id, {}, { limit: 30 });
  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader kind="Al minuto" title="Última hora" description="Todas las notas, de la más reciente a la más antigua." />
      <Listing org={org} page={page} filter={{}} withDek showLatest={false} empty={{ title: "Sin notas", text: "Todavía no se ha publicado nada." }} />
    </div>
  );
}
