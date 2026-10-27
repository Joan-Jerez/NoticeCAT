"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ConflictError, deleteArticle, ForbiddenError, publishArticle, saveArticle, unpublishArticle } from "@/lib/data";
import { zonedLocalToUtc } from "@/lib/format";
import { getCurrentOrg, getCurrentStaff } from "@/lib/org";
import { textToDoc } from "@/lib/richtext";
import { articleTitle, audit } from "@/lib/audit";

export type EditorState = { error?: string; fieldErrors?: Record<string, string>; savedAt?: string; updatedAt?: string; id?: string };

const schema = z.object({
  id: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
  title: z.string().trim().min(1, "El título es obligatorio.").max(300, "Máximo 300 caracteres."),
  dek: z.string().trim().max(500, "Máximo 500 caracteres."),
  body: z.string().max(200_000, "El texto es demasiado largo."),
  sectionId: z.string().min(1, "Elige una sección."),
  authorId: z.string(),
  placeTagId: z.string(),
  coverImageId: z.string(),
  tagIds: z.array(z.string()).max(10, "Máximo 10 temas."),
  isFeatured: z.boolean(),
  isSponsored: z.boolean(),
  intent: z.enum(["save", "publish", "schedule"]),
  publishAt: z.string(),
});

export async function submitArticle(_prev: EditorState, form: FormData): Promise<EditorState> {
  const org = await getCurrentOrg();
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const parsed = schema.safeParse({
    id: form.get("id") || undefined,
    expectedUpdatedAt: form.get("expectedUpdatedAt") || undefined,
    title: form.get("title") ?? "",
    dek: form.get("dek") ?? "",
    body: form.get("body") ?? "",
    sectionId: form.get("sectionId") ?? "",
    authorId: form.get("authorId") ?? "",
    placeTagId: form.get("placeTagId") ?? "",
    coverImageId: form.get("coverImageId") ?? "",
    tagIds: form.getAll("tagIds").map(String),
    isFeatured: form.get("isFeatured") === "on",
    isSponsored: form.get("isSponsored") === "on",
    intent: form.get("intent"),
    publishAt: form.get("publishAt") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Revisa los campos marcados.", fieldErrors };
  }
  const v = parsed.data;

  let publishAt: string | null = null;
  if (v.intent === "schedule") {
    publishAt = zonedLocalToUtc(v.publishAt, org.timezone);
    if (!publishAt) return { error: "Revisa la fecha.", fieldErrors: { publishAt: "Elige fecha y hora." } };
    if (new Date(publishAt).getTime() <= Date.now()) return { error: "Revisa la fecha.", fieldErrors: { publishAt: "La fecha tiene que ser futura." } };
  }

  let id: string;
  let updatedAt: string;
  try {
    const saved = await saveArticle(
      org.id,
      staff.user.id,
      v.id ?? null,
      {
        title: v.title,
        dek: v.dek || null,
        body: textToDoc(v.body),
        sectionId: v.sectionId,
        authorId: v.authorId || null,
        placeTagId: v.placeTagId || null,
        coverImageId: v.coverImageId || null,
        tagIds: v.tagIds,
        isFeatured: v.isFeatured,
        isSponsored: v.isSponsored,
      },
      v.expectedUpdatedAt,
    );
    id = saved.id;
    updatedAt = saved.updatedAt;
    if (v.intent !== "save") {
      const published = await publishArticle(org.id, staff.user.id, id, publishAt);
      updatedAt = published.updatedAt;
    }
  } catch (e) {
    if (e instanceof ConflictError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }

  const verb = v.intent === "publish" ? "published" : v.intent === "schedule" ? "scheduled" : v.id ? "saved" : "created";
  const what = { published: "Publicó", scheduled: "Programó", saved: "Guardó cambios en", created: "Creó el borrador" }[verb];
  await audit({
    action: `article.${verb}`,
    summary: `${what} «${v.title}»${verb === "scheduled" && publishAt ? ` para el ${publishAt.slice(0, 16).replace("T", " ")} UTC` : ""}`,
    orgId: org.id,
    targetType: "article",
    targetId: id,
    details: { role: staff.role },
  });

  revalidatePath("/", "layout");
  if (!v.id) redirect(`/admin/notas/${id}?creada=1`);
  return { savedAt: new Date().toISOString(), updatedAt, id };
}

export async function unpublish(id: string) {
  const org = await getCurrentOrg();
  const staff = await getCurrentStaff();
  if (!staff) return;
  const title = await articleTitle(id);
  await unpublishArticle(org.id, staff.user.id, id);
  await audit({ action: "article.unpublished", summary: `Retiró «${title ?? id}» (vuelve a borrador)`, orgId: org.id, targetType: "article", targetId: id });
  revalidatePath("/", "layout");
}

export async function remove(id: string) {
  const org = await getCurrentOrg();
  const staff = await getCurrentStaff();
  if (!staff) return;
  const title = await articleTitle(id);
  await deleteArticle(org.id, staff.user.id, id);
  await audit({ action: "article.deleted", summary: `Borró «${title ?? id}»`, orgId: org.id, targetType: "article", targetId: id });
  revalidatePath("/", "layout");
  redirect("/admin?borrada=1");
}
