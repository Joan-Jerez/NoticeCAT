import "server-only";
import { getSectionTree, listArticles, listAuthors, listImages, listTags } from "@/lib/data";

export async function loadEditorOptions(orgId: string) {
  const [tree, authors, tags, covers, recent] = await Promise.all([getSectionTree(orgId), listAuthors(orgId), listTags(orgId), listImages(orgId), listArticles(orgId, {}, { limit: 60 })]);
  return {
    sections: tree.flatMap((s) => [{ id: s.id, name: s.name, depth: 0 }, ...s.children.map((c) => ({ id: c.id, name: c.name, depth: 1 }))]),
    authors: authors.map((a) => ({ id: a.id, name: a.name })),
    places: tags.filter((t) => t.kind === "place").map((t) => ({ id: t.id, name: t.name })),
    topics: tags.filter((t) => t.kind === "topic").map((t) => ({ id: t.id, name: t.name })),
    covers,
    // para la caja "Lee además": las notas publicadas más recientes
    related: recent.items.map((a) => ({ id: a.id, title: a.title })),
  };
}
