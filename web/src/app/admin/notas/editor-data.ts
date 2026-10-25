import "server-only";
import { getSectionTree, listAuthors, listImages, listTags } from "@/lib/data";

export async function loadEditorOptions(orgId: string) {
  const [tree, authors, tags, covers] = await Promise.all([getSectionTree(orgId), listAuthors(orgId), listTags(orgId), listImages(orgId)]);
  return {
    sections: tree.flatMap((s) => [{ id: s.id, name: s.name, depth: 0 }, ...s.children.map((c) => ({ id: c.id, name: c.name, depth: 1 }))]),
    authors: authors.map((a) => ({ id: a.id, name: a.name })),
    places: tags.filter((t) => t.kind === "place").map((t) => ({ id: t.id, name: t.name })),
    topics: tags.filter((t) => t.kind === "topic").map((t) => ({ id: t.id, name: t.name })),
    covers,
  };
}
