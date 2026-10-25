import type { Metadata } from "next";
import { Search } from "lucide-react";
import { searchArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { Listing, PageHeader } from "@/components/news/listing";

export const metadata: Metadata = { title: "Buscar", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const org = await getCurrentOrg();
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const page = q ? await searchArticles(org.id, q) : null;

  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader kind="Buscar" title={q ? `«${q}»` : "Buscar notas"} />
      <form role="search" action="/buscar" className="mt-6 flex max-w-article gap-2">
        <label htmlFor="q" className="sr-only">Buscar en {org.name}</label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Escribe una palabra o una frase" autoFocus={!q} />
        <Button type="submit" icon={<Search className="size-4" aria-hidden />}>Buscar</Button>
      </form>
      {page ? (
        <Listing org={org} page={page} filter={{}} q={q} withDek showLatest={false} empty={{ title: `No encontramos notas para «${q}»`, text: "Revisa la ortografía o prueba con menos palabras." }} />
      ) : (
        <div className="mt-8 max-w-article">
          <EmptyState icon={Search} title="¿Qué estás buscando?">Busca por palabras del titular, la bajada o el texto. No importan las tildes.</EmptyState>
        </div>
      )}
    </div>
  );
}
