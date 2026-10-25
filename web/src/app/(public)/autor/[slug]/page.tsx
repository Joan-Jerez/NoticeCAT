import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorBySlug, listArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { Avatar } from "@/components/ui/misc";
import { Listing } from "@/components/news/listing";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await getCurrentOrg();
  const author = await getAuthorBySlug(org.id, (await params).slug);
  return author ? { title: author.name, description: author.bio ?? undefined } : {};
}

export default async function AuthorPage({ params }: Props) {
  const org = await getCurrentOrg();
  const author = await getAuthorBySlug(org.id, (await params).slug);
  if (!author) notFound();
  const filter = { authorId: author.id };
  const page = await listArticles(org.id, filter);

  return (
    <div className="container-page pt-8 md:pt-12">
      <header className="animate-fade-in flex flex-col items-center border-b-4 border-double border-text pb-6 text-center">
        <Avatar name={author.name} photo={author.photo} size={96} />
        <p className="mt-4 font-serif text-ui italic text-accent">{author.isColumnist ? (author.columnName ?? "Columnista") : "Autor"}</p>
        <h1 className="mt-1 font-display text-heading-lg md:text-headline">{author.name}</h1>
        {author.bio && <p className="mt-2 max-w-article font-serif text-body-sm text-text-muted">{author.bio}</p>}
      </header>
      <Listing org={org} page={page} filter={filter} empty={{ title: "Sin notas publicadas", text: `${author.name} todavía no tiene notas publicadas.` }} />
    </div>
  );
}
