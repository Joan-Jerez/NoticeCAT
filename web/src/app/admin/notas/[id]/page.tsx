import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleForEdit, getArticleViewForStaff } from "@/lib/data";
import { utcToZonedLocal } from "@/lib/format";
import { canPublish, getCurrentOrg, getCurrentStaff } from "@/lib/org";
import { docToText } from "@/lib/richtext";
import { EditorForm } from "@/components/admin/editor-form";
import { loadEditorOptions } from "../editor-data";

export const metadata: Metadata = { title: "Editar nota" };

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creada?: string }> }) {
  const { id } = await params;
  const org = await getCurrentOrg();
  const staff = (await getCurrentStaff())!;
  const a = await getArticleForEdit(org.id, id);
  if (!a) notFound();
  const view = await getArticleViewForStaff(org.id, id);
  const options = await loadEditorOptions(org.id);
  const readOnly = staff.role === "writer" && a.createdBy !== staff.user.id;

  return (
    <div className="mx-auto max-w-content">
      <Link href="/admin" className="text-ui-sm text-text-muted hover:underline">← Notas</Link>
      <h1 className="mt-2 font-display text-heading-lg">Editar nota</h1>
      {readOnly ? (
        <p className="mt-6 rounded-xs bg-warning-bg px-4 py-3 text-ui text-warning">Solo puedes editar las notas que escribiste tú.</p>
      ) : (
        <div className="mt-6">
          <EditorForm
            initial={{
              id: a.id,
              updatedAt: a.updatedAt,
              status: a.status,
              url: view?.url ?? null,
              publishAtLocal: a.status === "scheduled" && a.publishedAt ? utcToZonedLocal(a.publishedAt, org.timezone) : "",
              title: a.title,
              dek: a.dek ?? "",
              body: docToText(a.body),
              sectionId: a.sectionId,
              authorId: a.authorId ?? "",
              placeTagId: a.placeTagId ?? "",
              coverImageId: a.coverImageId ?? "",
              tagIds: a.tagIds,
              isFeatured: a.isFeatured,
              isSponsored: a.isSponsored,
            }}
            {...options}
            canPublish={canPublish(staff.role)}
            justCreated={!!(await searchParams).creada}
          />
        </div>
      )}
    </div>
  );
}
