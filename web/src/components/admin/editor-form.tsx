"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarClock, Eye, Save, Send, Trash2, Undo2 } from "lucide-react";
import { remove, submitArticle, unpublish, type EditorState } from "@/app/admin/actions";
import { cx } from "@/lib/cx";
import type { ArticleStatus, Image as Img } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusChip } from "@/components/ui/misc";
import { BodyEditor } from "./body-editor";

export interface EditorInitial {
  id: string | null;
  updatedAt: string | null;
  status: ArticleStatus;
  url: string | null;
  publishAtLocal: string;
  title: string;
  dek: string;
  body: string;
  sectionId: string;
  authorId: string;
  placeTagId: string;
  coverImageId: string;
  tagIds: string[];
  isFeatured: boolean;
  isSponsored: boolean;
}

type Option = { id: string; name: string };

function SubmitButtons({ canPublish, status }: { canPublish: boolean; status: ArticleStatus }) {
  const { pending, data } = useFormStatus();
  const intent = pending ? data?.get("intent") : null;
  const live = status === "published";
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" name="intent" value="save" variant="secondary" loading={intent === "save"} disabled={pending} icon={<Save className="size-4" aria-hidden />}>
        {live ? "Guardar cambios" : "Guardar borrador"}
      </Button>
      {canPublish && !live && (
        <Button type="submit" name="intent" value="publish" loading={intent === "publish"} disabled={pending} icon={<Send className="size-4" aria-hidden />}>
          Publicar ahora
        </Button>
      )}
    </div>
  );
}

export function EditorForm({ initial, sections, authors, places, topics, covers, related, canPublish, justCreated }: { initial: EditorInitial; sections: (Option & { depth: number })[]; authors: Option[]; places: Option[]; topics: Option[]; covers: Img[]; related: { id: string; title: string }[]; canPublish: boolean; justCreated: boolean }) {
  const [state, action] = useActionState<EditorState, FormData>(submitArticle, {});
  const [cover, setCover] = useState(initial.coverImageId);
  const [title, setTitle] = useState(initial.title);
  const updatedAt = state.updatedAt ?? initial.updatedAt;
  const errorBox = useRef<HTMLDivElement>(null);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.error) errorBox.current?.focus();
  }, [state]);

  const coverImg = covers.find((c) => c.id === cover);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {updatedAt && <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />}

      <div className="space-y-6">
        {state.error && (
          <div ref={errorBox} tabIndex={-1} role="alert" className="rounded-sm bg-danger-bg px-4 py-3 text-ui text-danger">
            {state.error}
          </div>
        )}
        {(state.savedAt || justCreated) && !state.error && (
          <p role="status" className="rounded-sm bg-success-bg px-4 py-3 text-ui text-success">
            {justCreated && !state.savedAt ? "Nota creada." : "Cambios guardados."}
          </p>
        )}

        <Field id="title" label="Título" error={fe.title} hint={`${title.length}/300`}>
          <Textarea id="title" name="title" rows={2} required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!fe.title || undefined} aria-describedby={describedBy("title", fe.title, true)} className="font-display text-title" />
        </Field>

        <Field id="dek" label="Bajada" error={fe.dek} hint="Una o dos frases que resuman la nota.">
          <Textarea id="dek" name="dek" rows={2} maxLength={500} defaultValue={initial.dek} aria-invalid={!!fe.dek || undefined} aria-describedby={describedBy("dek", fe.dek, true)} className="font-serif text-body-sm" />
        </Field>

        <Field
          id="body"
          label="Texto"
          error={fe.body}
          hint={
            <>
              Selecciona texto y usa los botones, o los atajos Ctrl+B, Ctrl+I y Ctrl+K. Para un párrafo nuevo, deja una línea en blanco (Enter dos veces).
            </>
          }
        >
          <BodyEditor defaultValue={initial.body} related={related.filter((r) => r.id !== initial.id)} invalid={!!fe.body} describedBy={describedBy("body", fe.body, true)} />
        </Field>
      </div>

      <div className="space-y-6">
        <section aria-label="Publicación" className="space-y-4 rounded-sm border border-border bg-raised p-5">
          <div className="flex items-center justify-between">
            <span className="text-ui-sm font-semibold">Estado</span>
            <StatusChip value={initial.status} />
          </div>
          <SubmitButtons canPublish={canPublish} status={initial.status} />
          {canPublish && initial.status !== "published" && (
            <div className="space-y-2 border-t border-border pt-4">
              <Field id="publishAt" label="Programar para" error={fe.publishAt} hint="Hora del medio.">
                <Input id="publishAt" name="publishAt" type="datetime-local" defaultValue={initial.publishAtLocal} aria-invalid={!!fe.publishAt || undefined} aria-describedby={describedBy("publishAt", fe.publishAt, true)} />
              </Field>
              <Button type="submit" name="intent" value="schedule" variant="secondary" className="w-full" icon={<CalendarClock className="size-4" aria-hidden />}>
                Programar
              </Button>
            </div>
          )}
          {!canPublish && <p className="text-caption text-text-muted">Tu rol puede guardar borradores. Un editor la publica.</p>}
          {initial.id && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-ui-sm">
              <Link href={initial.status === "published" && initial.url ? initial.url : `/admin/notas/${initial.id}/vista-previa`} target="_blank" className="inline-flex items-center gap-1.5 text-accent hover:underline">
                <Eye className="size-4" aria-hidden />
                {initial.status === "published" ? "Ver publicada" : "Vista previa"}
              </Link>
              {canPublish && initial.status !== "draft" && (
                <button type="button" onClick={() => unpublish(initial.id!)} className="inline-flex items-center gap-1.5 text-text-muted hover:text-text hover:underline">
                  <Undo2 className="size-4" aria-hidden />
                  Pasar a borrador
                </button>
              )}
              {canPublish && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Borrar esta nota? No se puede deshacer.")) remove(initial.id!);
                  }}
                  className="inline-flex items-center gap-1.5 text-danger hover:underline"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Borrar
                </button>
              )}
            </div>
          )}
        </section>

        <section aria-label="Clasificación" className="space-y-4 rounded-sm border border-border bg-raised p-5">
          <Field id="sectionId" label="Sección" error={fe.sectionId}>
            <Select id="sectionId" name="sectionId" defaultValue={initial.sectionId} required aria-invalid={!!fe.sectionId || undefined}>
              <option value="">Elige una sección</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.depth ? "— " : ""}
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="authorId" label="Firma">
            <Select id="authorId" name="authorId" defaultValue={initial.authorId}>
              <option value="">Redacción</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field id="placeTagId" label="Lugar">
            <Select id="placeTagId" name="placeTagId" defaultValue={initial.placeTagId}>
              <option value="">Sin lugar</option>
              {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-ui-sm font-semibold">Temas</legend>
            {fe.tagIds && <p className="mb-1.5 text-caption text-danger">{fe.tagIds}</p>}
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {topics.map((t) => (
                <label key={t.id} className="cursor-pointer">
                  <input type="checkbox" name="tagIds" value={t.id} defaultChecked={initial.tagIds.includes(t.id)} className="peer sr-only" />
                  <span className="inline-block rounded-pill border border-border px-3 py-1 text-ui-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                    {t.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-ui">
              <input type="checkbox" name="isFeatured" defaultChecked={initial.isFeatured} className="size-4.5 accent-accent" />
              Destacada en portada
            </label>
            <label className="flex items-center gap-2 text-ui">
              <input type="checkbox" name="isSponsored" defaultChecked={initial.isSponsored} className="size-4.5 accent-accent" />
              Contenido patrocinado
            </label>
          </div>
        </section>

        <section aria-label="Foto de portada" className="space-y-3 rounded-sm border border-border bg-raised p-5">
          <p className="text-ui-sm font-semibold">Foto de portada</p>
          <input type="hidden" name="coverImageId" value={cover} />
          <div className="relative aspect-video overflow-hidden bg-surface-tint">
            {coverImg ? <Image src={coverImg.src} alt={coverImg.alt} fill sizes="20rem" className="object-cover" /> : <span className="grid h-full place-items-center text-caption text-text-muted">Sin foto</span>}
          </div>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Elegir foto de la biblioteca">
            <button type="button" role="radio" aria-checked={cover === ""} onClick={() => setCover("")} className={cx("aspect-video rounded-sm border text-caption", cover === "" ? "border-accent ring-2 ring-accent" : "border-border")}>
              Ninguna
            </button>
            {covers.map((c, i) => (
              <button key={c.id} type="button" role="radio" aria-checked={cover === c.id} aria-label={`Foto ${i + 1}`} onClick={() => setCover(c.id)} className={cx("relative aspect-video overflow-hidden rounded-sm border", cover === c.id ? "border-accent ring-2 ring-accent" : "border-border")}>
                <Image src={c.src} alt="" fill sizes="5rem" className="object-cover" />
              </button>
            ))}
          </div>
          <p className="text-caption text-text-muted">Subir fotos propias llega con el almacenamiento (/replica-backend).</p>
        </section>
      </div>
    </form>
  );
}
