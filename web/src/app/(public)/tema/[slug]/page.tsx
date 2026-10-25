import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { getTagBySlug, listArticles } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { Button, ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isFollowing } from "@/lib/follows";
import { toggleFollow } from "../../actions";
import { Listing, PageHeader } from "@/components/news/listing";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await getCurrentOrg();
  const tag = await getTagBySlug(org.id, (await params).slug);
  return tag ? { title: tag.name } : {};
}

export default async function TagPage({ params }: Props) {
  const org = await getCurrentOrg();
  const tag = await getTagBySlug(org.id, (await params).slug);
  if (!tag) notFound();
  const filter = { tagId: tag.id };
  const page = await listArticles(org.id, filter);
  const signedIn = !!(await getSessionUser());
  const following = signedIn && (await isFollowing(org.id, tag.id));

  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader
        kind={tag.kind === "place" ? "Lugar" : "Tema"}
        title={tag.name}
        aside={
          tag.kind === "topic" &&
          (signedIn ? (
            <form action={toggleFollow}>
              <input type="hidden" name="slug" value={tag.slug} />
              <input type="hidden" name="seguir" value={following ? "0" : "1"} />
              <Button type="submit" variant={following ? "primary" : "secondary"} size="sm" aria-pressed={following}>
                {following ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                {following ? "Siguiendo" : "Seguir tema"}
              </Button>
            </form>
          ) : (
            <ButtonLink href={`/cuenta/entrar?seguir=${tag.slug}`} variant="secondary" size="sm">
              <Plus className="size-4" aria-hidden />
              Seguir tema
            </ButtonLink>
          ))
        }
      />
      <Listing org={org} page={page} filter={filter} empty={{ title: "Nada por aquí todavía", text: "No hay notas publicadas con este tema." }} />
    </div>
  );
}
