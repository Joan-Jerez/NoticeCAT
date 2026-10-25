import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getArticleByNumber, getSectionTree, listArticles, resolveSection } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { ArticlePage } from "@/components/news/article-page";
import { Listing, PageHeader } from "@/components/news/listing";

// Una sola ruta para secciones y notas:
//   /economia                                   -> sección
//   /economia/vivienda                          -> subsección
//   /economia[/vivienda]/2026/10/25/slug/1005   -> nota (el número manda)

type Props = { params: Promise<{ path: string[] }> };

function parseArticle(path: string[]) {
  const n = path[path.length - 1];
  if (path.length < 6 || !n || !/^\d+$/.test(n)) return null;
  return Number(n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const org = await getCurrentOrg();
  const number = parseArticle(path);
  if (number) {
    const a = await getArticleByNumber(org.id, number);
    if (!a) return {};
    return {
      title: a.title,
      description: a.dek ?? undefined,
      alternates: { canonical: a.url },
      openGraph: {
        type: "article",
        title: a.title,
        description: a.dek ?? undefined,
        publishedTime: a.publishedAt ?? undefined,
        authors: a.author ? [a.author.name] : undefined,
        section: a.section.name,
        tags: a.tags.map((t) => t.name),
        images: a.cover ? [{ url: a.cover.src, width: a.cover.width, height: a.cover.height, alt: a.cover.alt }] : undefined,
      },
      twitter: { card: a.cover ? "summary_large_image" : "summary", title: a.title, description: a.dek ?? undefined },
    };
  }
  const found = await resolveSection(org.id, path.map(decodeURIComponent));
  return found ? { title: found.section.name, alternates: { canonical: `/${path.join("/")}` } } : {};
}

export default async function CatchAll({ params }: Props) {
  const { path } = await params;
  const org = await getCurrentOrg();

  const number = parseArticle(path);
  if (number) {
    const article = await getArticleByNumber(org.id, number);
    if (!article) notFound();
    // titular o sección cambiados: la URL vieja lleva a la nueva
    if (`/${path.join("/")}` !== article.url) permanentRedirect(article.url);
    return <ArticlePage article={article} org={org} />;
  }

  const found = await resolveSection(org.id, path.map(decodeURIComponent));
  if (!found) notFound();
  const { section, parent } = found;
  const top = parent ?? section;
  const tree = await getSectionTree(org.id);
  const children = tree.find((s) => s.id === top.id)?.children ?? [];
  const filter = { sectionId: section.id };
  const page = await listArticles(org.id, filter);

  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader
        kind={parent ? parent.name : "Sección"}
        title={section.name}
        tabs={
          children.length
            ? [{ name: "Todo", href: `/${top.slug}`, current: !parent }, ...children.map((c) => ({ name: c.name, href: `/${top.slug}/${c.slug}`, current: c.id === section.id }))]
            : undefined
        }
      />
      <Listing org={org} page={page} filter={filter} empty={{ title: "Todavía no hay notas aquí", text: "Cuando se publique la primera nota de esta sección, aparecerá en esta página." }} />
    </div>
  );
}
