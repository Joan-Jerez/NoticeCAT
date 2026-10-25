import { listArticles, listSections } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(req: Request, { params }: { params: Promise<{ feed: string }> }) {
  const { feed } = await params;
  const slug = feed.replace(/\.xml$/, "");
  const org = await getCurrentOrg();
  const section = slug === "portada" ? null : (await listSections(org.id)).find((s) => !s.parentId && s.slug === slug && s.rssEnabled);
  if (slug !== "portada" && !section) return new Response("Feed no encontrado", { status: 404 });

  const origin = new URL(req.url).origin;
  const { items } = await listArticles(org.id, section ? { sectionId: section.id } : {}, { limit: 30 });
  const title = section ? `${org.name}: ${section.name}` : org.name;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(title)}</title>
<link>${origin}${section ? `/${section.slug}` : "/"}</link>
<description>${esc(org.tagline)}</description>
<language>${org.locale.toLowerCase()}</language>
<atom:link href="${origin}/rss/${slug}.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (a) => `<item>
<title>${esc(a.title)}</title>
<link>${origin}${a.url}</link>
<guid isPermaLink="false">${org.slug}-${a.number}</guid>
<pubDate>${new Date(a.publishedAt!).toUTCString()}</pubDate>
<category>${esc(a.section.name)}</category>
${a.author ? `<author>noreply@noticecat.app (${esc(a.author.name)})</author>` : ""}
${a.dek ? `<description>${esc(a.dek)}</description>` : ""}
</item>`,
  )
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
