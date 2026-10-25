import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentOrg, getCurrentStaff, canPublish } from "@/lib/org";
import { EditorForm } from "@/components/admin/editor-form";
import { loadEditorOptions } from "../editor-data";

export const metadata: Metadata = { title: "Nueva nota" };

export default async function NewArticle() {
  const org = await getCurrentOrg();
  const staff = (await getCurrentStaff())!;
  const options = await loadEditorOptions(org.id);
  const me = options.authors.find((a) => a.name === staff.user.name);

  return (
    <div className="mx-auto max-w-content">
      <Link href="/admin" className="text-ui-sm text-text-muted hover:underline">← Notas</Link>
      <h1 className="mt-2 font-display text-heading-lg">Nueva nota</h1>
      <div className="mt-6">
        <EditorForm
          initial={{ id: null, updatedAt: null, status: "draft", url: null, publishAtLocal: "", title: "", dek: "", body: "", sectionId: "", authorId: me?.id ?? "", placeTagId: "", coverImageId: "", tagIds: [], isFeatured: false, isSponsored: false }}
          {...options}
          canPublish={canPublish(staff.role)}
          justCreated={false}
        />
      </div>
    </div>
  );
}
