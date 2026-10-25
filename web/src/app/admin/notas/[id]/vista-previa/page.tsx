import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleViewForStaff } from "@/lib/data";
import { getCurrentOrg } from "@/lib/org";
import { ArticlePage } from "@/components/news/article-page";

export const metadata = { title: "Vista previa" };

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getCurrentOrg();
  const a = await getArticleViewForStaff(org.id, id);
  if (!a) notFound();
  return (
    <div className="-mx-4 -my-6 bg-bg pb-16 md:-mx-10 md:-my-9">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-warning-bg px-4 py-2 text-ui-sm text-warning md:px-10">
        <span>Vista previa: así se verá la nota. Los lectores todavía no la ven.</span>
        <Link href={`/admin/notas/${id}`} className="font-semibold underline">Volver a editar</Link>
      </div>
      <ArticlePage article={a} org={org} preview />
    </div>
  );
}
