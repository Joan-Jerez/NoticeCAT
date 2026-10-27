"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { EditorContent, mergeAttributes, Node, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type Editor, type NodeViewProps } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, Newspaper, Quote, Redo2, Trash2, Undo2, X } from "lucide-react";
import { textToDoc } from "@/lib/richtext";
import type { Image as Img, RichNode } from "@/lib/types";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { PhotoUpload } from "./photo-upload";

type Related = { id: string; title: string };

// Datos que necesitan las cajas dentro del texto (títulos de notas, fotos).
const EditorData = createContext<{ related: Related[]; gallery: Img[] }>({ related: [], gallery: [] });

// ------------------------------------------------------------------ nodos propios

function RelatedView({ node, deleteNode, selected }: NodeViewProps) {
  const { related } = useContext(EditorData);
  const title = related.find((r) => r.id === node.attrs.articleId)?.title;
  return (
    <NodeViewWrapper data-drag-handle className={cx("my-3 flex items-center gap-3 rounded-md border-y-2 border-accent/30 bg-surface px-4 py-3 font-sans", selected && "ring-2 ring-accent")}>
      <Newspaper className="size-4 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-accent">Lee además</p>
        <p className="truncate font-display text-title-sm">{title ?? "Nota que ya no está publicada"}</p>
      </div>
      <button type="button" contentEditable={false} aria-label="Quitar la caja" title="Quitar" onClick={deleteNode} className="press grid size-8 place-items-center rounded-full text-text-muted hover:bg-danger-bg hover:text-danger">
        <Trash2 className="size-4" aria-hidden />
      </button>
    </NodeViewWrapper>
  );
}

function ImageView({ node, deleteNode, selected }: NodeViewProps) {
  const { gallery } = useContext(EditorData);
  const img = gallery.find((g) => g.id === node.attrs.imageId);
  return (
    <NodeViewWrapper data-drag-handle className={cx("relative my-3", selected && "rounded-md ring-2 ring-accent")}>
      {img ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- vista dentro del editor */}
          <img src={img.src} alt={img.alt} className="aspect-video w-full rounded-md object-cover" />
          {(img.caption || img.credit) && (
            <figcaption className="mt-1 font-sans text-caption text-text-muted">
              {img.caption} {img.credit && <span className="eyebrow">Foto: {img.credit}</span>}
            </figcaption>
          )}
        </figure>
      ) : (
        <p className="rounded-md bg-surface p-4 font-sans text-ui-sm text-text-muted">Foto que ya no está en la galería</p>
      )}
      <button type="button" contentEditable={false} aria-label="Quitar la foto" title="Quitar" onClick={deleteNode} className="press absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-raised/90 text-text hover:bg-danger-bg hover:text-danger">
        <Trash2 className="size-4" aria-hidden />
      </button>
    </NodeViewWrapper>
  );
}

const RelatedArticle = Node.create({
  name: "relatedArticle",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ articleId: { default: null } }),
  parseHTML: () => [{ tag: "aside[data-related]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", mergeAttributes({ "data-related": "" }, HTMLAttributes)],
  addNodeView: () => ReactNodeViewRenderer(RelatedView),
});

const BodyImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ imageId: { default: null } }),
  parseHTML: () => [{ tag: "figure[data-image]" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes({ "data-image": "" }, HTMLAttributes)],
  addNodeView: () => ReactNodeViewRenderer(ImageView),
});

// ------------------------------------------------------------------ editor

function initialDoc(value: string): RichNode | undefined {
  if (!value.trim()) return undefined;
  if (value.trimStart().startsWith("{")) {
    try {
      return JSON.parse(value) as RichNode;
    } catch {
      // cae a texto
    }
  }
  return textToDoc(value);
}

// ¿Texto pegado con símbolos de Markdown? Entonces se convierte a formato.
const looksLikeMarkdown = (t: string) => /(^|\n)(#{2,3} |- |> )|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:/.test(t);

export function RichEditor({ defaultValue, related, gallery, onGalleryAdd, invalid, describedBy }: { defaultValue: string; related: Related[]; gallery: Img[]; onGalleryAdd: (img: Img) => void; invalid: boolean; describedBy?: string }) {
  const [json, setJson] = useState(() => JSON.stringify(initialDoc(defaultValue) ?? { type: "doc", content: [] }));
  // handlePaste se define una vez: lee el editor por referencia
  const ref = useRef<Editor | null>(null);
  const editor = useEditor({
    immediatelyRender: false, // evita diferencias entre servidor y navegador
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        orderedList: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer", target: null } },
      }),
      Placeholder.configure({ placeholder: "Escribe la nota. Usa los botones de arriba para dar formato, añadir fotos o una caja «Lee además»." }),
      RelatedArticle,
      BodyImage,
    ],
    content: initialDoc(defaultValue),
    editorProps: {
      attributes: {
        id: "body",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Texto",
        ...(describedBy && { "aria-describedby": describedBy }),
        ...(invalid && { "aria-invalid": "true" }),
        class: "prose-nota min-h-96 px-4 py-3 font-serif text-body text-text focus-visible:outline-none",
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const html = event.clipboardData?.getData("text/html") ?? "";
        if (html || !looksLikeMarkdown(text)) return false; // Word y Docs traen HTML: lo entiende Tiptap
        const doc = textToDoc(text) as { content: unknown[] };
        ref.current?.commands.insertContent(doc.content);
        return true;
      },
    },
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
  });
  useEffect(() => {
    ref.current = editor;
  }, [editor]);

  return (
    <EditorData.Provider value={{ related, gallery }}>
      <div className={cx("rounded-sm border bg-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus", invalid ? "border-danger" : "border-border-input")}>
        <input type="hidden" name="body" value={json} />
        {editor && <Toolbar editor={editor} related={related} gallery={gallery} onGalleryAdd={onGalleryAdd} />}
        <EditorContent editor={editor} />
      </div>
    </EditorData.Provider>
  );
}

// ------------------------------------------------------------------ barra

type Panel = "link" | "photo" | "related" | null;

function Toolbar({ editor, related, gallery, onGalleryAdd }: { editor: Editor; related: Related[]; gallery: Img[]; onGalleryAdd: (img: Img) => void }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [href, setHref] = useState("https://");
  const [relatedId, setRelatedId] = useState("");

  // la barra se repinta solo cuando cambia algo que muestra
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      list: e.isActive("bulletList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const validUrl = /^(https?:\/\/\S+\.\S+|\/\S*|mailto:\S+@\S+)$/.test(href.trim());
  const applyLink = () => {
    chain().extendMarkRange("link").setLink({ href: href.trim() }).run();
    setPanel(null);
  };
  // Un bloque (foto o caja) queda seleccionado al insertarlo y lo siguiente lo
  // reemplazaría: va seguido de un párrafo vacío donde queda el cursor.
  const insertBlock = (node: { type: "image"; attrs: { imageId: string } } | { type: "relatedArticle"; attrs: { articleId: string } }) => {
    chain().insertContent([node, { type: "paragraph" }]).run();
    setPanel(null);
  };

  const tools = [
    { label: "Subtítulo", icon: Heading2, on: s.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: "Subtítulo pequeño", icon: Heading3, on: s.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    { label: "Negrita (Ctrl+B)", icon: Bold, on: s.bold, run: () => chain().toggleBold().run(), sep: true },
    { label: "Cursiva (Ctrl+I)", icon: Italic, on: s.italic, run: () => chain().toggleItalic().run() },
    { label: "Lista", icon: List, on: s.list, run: () => chain().toggleBulletList().run(), sep: true },
    { label: "Cita destacada", icon: Quote, on: s.quote, run: () => chain().toggleBlockquote().run() },
    {
      label: s.link ? "Quitar enlace" : "Enlace",
      icon: Link2,
      on: s.link || panel === "link",
      run: () => (s.link ? chain().extendMarkRange("link").unsetLink().run() : (setHref("https://"), toggle("link"))),
      sep: true,
    },
    { label: "Foto", icon: ImagePlus, on: panel === "photo", run: () => toggle("photo") },
    { label: "Caja «Lee además»", icon: Newspaper, on: panel === "related", run: () => toggle("related") },
  ];

  return (
    <div className="sticky top-0 z-10 rounded-t-sm border-b border-border bg-surface">
      <div role="toolbar" aria-label="Botones de formato" aria-controls="body" className="flex flex-wrap items-center gap-0.5 px-1.5 py-1">
        {tools.map(({ label, icon: Icon, on, run, sep }) => (
          <span key={label} className="contents">
            {sep && <span aria-hidden className="mx-1 h-5 w-px bg-border" />}
            <button type="button" title={label} aria-label={label} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={run} className={cx("press grid size-9 place-items-center rounded-sm hover:bg-surface-tint", on && "bg-surface-tint text-accent")}>
              <Icon className="size-4" aria-hidden />
            </button>
          </span>
        ))}
        <span className="ml-auto flex gap-0.5">
          <button type="button" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" disabled={!s.canUndo} onClick={() => chain().undo().run()} className="press grid size-9 place-items-center rounded-sm hover:bg-surface-tint disabled:opacity-40">
            <Undo2 className="size-4" aria-hidden />
          </button>
          <button type="button" title="Rehacer (Ctrl+Y)" aria-label="Rehacer" disabled={!s.canRedo} onClick={() => chain().redo().run()} className="press grid size-9 place-items-center rounded-sm hover:bg-surface-tint disabled:opacity-40">
            <Redo2 className="size-4" aria-hidden />
          </button>
        </span>
      </div>

      {panel && (
        <div className="animate-fade-in border-t border-border bg-surface-tint/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-ui-sm font-semibold">{{ link: "Enlace", photo: "Foto en el texto", related: "Caja «Lee además»" }[panel]}</p>
            <button type="button" aria-label="Cerrar" title="Cerrar" onClick={() => setPanel(null)} className="press grid size-8 place-items-center rounded-full hover:bg-surface">
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {panel === "link" && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 text-ui-sm">
                Dirección (selecciona antes el texto que hará de enlace)
                <Input
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (validUrl) applyLink();
                    }
                  }}
                  className="mt-1"
                  autoFocus
                />
              </label>
              <Button type="button" disabled={!validUrl} onClick={applyLink}>
                Poner enlace
              </Button>
            </div>
          )}

          {panel === "photo" && (
            <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div>
                <p className="mb-2 text-caption text-text-muted">De la galería del medio: pulsa una para ponerla donde está el cursor.</p>
                <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {gallery.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      title={g.alt}
                      aria-label={`Insertar foto: ${g.alt}`}
                      onClick={() => insertBlock({ type: "image", attrs: { imageId: g.id } })}
                      className="press relative aspect-video overflow-hidden rounded-sm border border-border hover:ring-2 hover:ring-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de la galería */}
                      <img src={g.src} alt="" className="size-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
              <PhotoUpload
                idPrefix="foto-texto"
                onUploaded={(img) => {
                  onGalleryAdd(img);
                  insertBlock({ type: "image", attrs: { imageId: img.id } });
                }}
              />
            </div>
          )}

          {panel === "related" && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1 text-ui-sm">
                Nota que quieres recomendar
                <Select value={relatedId} onChange={(e) => setRelatedId(e.target.value)} className="mt-1" autoFocus>
                  <option value="">Elige una nota publicada…</option>
                  {related.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="button" disabled={!relatedId} onClick={() => {
                  insertBlock({ type: "relatedArticle", attrs: { articleId: relatedId } });
                  setRelatedId("");
                }}
              >
                Insertar caja
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
