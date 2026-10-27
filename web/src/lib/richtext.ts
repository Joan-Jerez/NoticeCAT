import type { RichMark, RichNode } from "./types";

// Documento de las notas (forma de Tiptap). El editor visual lo produce
// directamente y sanitizeDoc lo valida en el servidor. El formato de texto de
// abajo sigue sirviendo para importar archivos:
//   línea en blanco      -> párrafo nuevo
//   "## " / "### "       -> subtítulo
//   "- "                 -> lista
//   "> "                 -> cita
//   "[[nota:ID]]"        -> caja "Lee además"
//   "[[foto:ID]]"        -> foto de la galería del medio
//   **negrita**, *cursiva*, [texto](https://enlace)

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;

function inline(text: string): RichNode[] {
  const out: RichNode[] = [];
  for (const piece of text.split(INLINE)) {
    if (!piece) continue;
    let m: RegExpMatchArray | null;
    if ((m = piece.match(/^\*\*([^*]+)\*\*$/))) out.push(textNode(m[1]!, [{ type: "bold" }]));
    else if ((m = piece.match(/^\*([^*]+)\*$/))) out.push(textNode(m[1]!, [{ type: "italic" }]));
    else if ((m = piece.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)))
      out.push(textNode(m[1]!, [{ type: "link", attrs: { href: m[2]! } }]));
    else out.push(textNode(piece));
  }
  return out;
}

function textNode(text: string, marks?: RichMark[]): RichNode {
  return marks ? { type: "text", text, marks } : { type: "text", text };
}

export function textToDoc(source: string): RichNode {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const content: RichNode[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map((l) => l.trim());
    let m: RegExpMatchArray | null;
    if ((m = block.match(/^\[\[nota:([\w-]+)\]\]$/))) {
      content.push({ type: "relatedArticle", attrs: { articleId: m[1]! } });
    } else if ((m = block.match(/^\[\[foto:([\w-]+)\]\]$/))) {
      content.push({ type: "image", attrs: { imageId: m[1]! } });
    } else if ((m = block.match(/^(#{2,3})\s+(.+)$/))) {
      content.push({ type: "heading", attrs: { level: m[1]!.length as 2 | 3 }, content: inline(m[2]!) });
    } else if (lines.every((l) => l.startsWith("- "))) {
      content.push({
        type: "bulletList",
        content: lines.map((l) => ({ type: "listItem", content: [{ type: "paragraph", content: inline(l.slice(2)) }] })),
      });
    } else if (lines.every((l) => l.startsWith(">"))) {
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" ")) }],
      });
    } else {
      content.push({ type: "paragraph", content: inline(lines.join(" ")) });
    }
  }
  return { type: "doc", content };
}

function inlineToText(nodes: RichNode[] | undefined, withMarks: boolean): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type !== "text") return "";
      if (!withMarks || !n.marks?.length) return n.text;
      let t = n.text;
      for (const mark of n.marks) {
        if (mark.type === "bold") t = `**${t}**`;
        else if (mark.type === "italic") t = `*${t}*`;
        else if (mark.type === "link") t = `[${t}](${mark.attrs.href})`;
      }
      return t;
    })
    .join("");
}

function blocks(doc: RichNode): RichNode[] {
  return doc.type === "doc" ? doc.content : [];
}

// Inverso de textToDoc, para volver a editar una nota.
export function docToText(doc: RichNode): string {
  return blocks(doc)
    .map((b) => {
      switch (b.type) {
        case "paragraph":
          return inlineToText(b.content, true);
        case "heading":
          return `${"#".repeat(b.attrs.level)} ${inlineToText(b.content, true)}`;
        case "bulletList":
          return b.content.map((li) => `- ${li.type === "listItem" ? docToText({ type: "doc", content: li.content }) : ""}`).join("\n");
        case "blockquote":
          return `> ${docToText({ type: "doc", content: b.content })}`;
        case "relatedArticle":
          return `[[nota:${b.attrs.articleId}]]`;
        case "image":
          return `[[foto:${b.attrs.imageId}]]`;
        default:
          return "";
      }
    })
    .join("\n\n");
}

// Texto plano: búsqueda y tiempo de lectura.
export function docToPlain(doc: RichNode): string {
  return blocks(doc)
    .map((b) => {
      switch (b.type) {
        case "paragraph":
        case "heading":
          return inlineToText(b.content, false);
        case "bulletList":
        case "blockquote":
          return b.content
            .map((c) => (c.type === "listItem" ? docToPlain({ type: "doc", content: c.content }) : inlineToText("content" in c ? (c.content as RichNode[]) : [], false)))
            .join("\n");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export function safeHref(href: string) {
  return /^(https?:\/\/|\/|mailto:)/.test(href) ? href : "#";
}

// ------------------------------------------------------------------ validar

const ID = /^[\w-]{1,64}$/;
const MAX_NODES = 5000;

// Lo que llega del editor visual (JSON del navegador) se reconstruye con una
// lista cerrada de nodos y marcas; lo demás se descarta. Los enlaces solo
// pueden ser http(s), rutas internas o mailto. Devuelve null si no es un documento.
export function sanitizeDoc(input: unknown): RichNode | null {
  let budget = MAX_NODES;
  const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
  const list = (v: unknown) => (Array.isArray(v) ? v : []);

  function marks(raw: unknown): RichMark[] | undefined {
    const out: RichMark[] = [];
    for (const m of list(raw)) {
      const o = obj(m);
      if (!o) continue;
      if (o.type === "bold" || o.type === "italic") out.push({ type: o.type });
      else if (o.type === "link") {
        const href = String(obj(o.attrs)?.href ?? "").trim();
        if (/^(https?:\/\/|\/|mailto:)/i.test(href) && href.length <= 2000) out.push({ type: "link", attrs: { href } });
      }
    }
    return out.length ? out : undefined;
  }

  function inlines(raw: unknown): RichNode[] {
    const out: RichNode[] = [];
    for (const n of list(raw)) {
      const o = obj(n);
      if (!o || budget-- <= 0) continue;
      if (o.type === "text" && typeof o.text === "string" && o.text) {
        const m = marks(o.marks);
        const text = o.text.slice(0, 20000);
        out.push(m ? { type: "text", text, marks: m } : { type: "text", text });
      } else if (o.type === "hardBreak") out.push({ type: "text", text: " " });
    }
    return out;
  }

  function block(raw: unknown): RichNode | null {
    const o = obj(raw);
    if (!o || budget-- <= 0) return null;
    const attrs = obj(o.attrs) ?? {};
    switch (o.type) {
      case "paragraph":
        return { type: "paragraph", content: inlines(o.content) };
      case "heading":
        return { type: "heading", attrs: { level: attrs.level === 3 ? 3 : 2 }, content: inlines(o.content) };
      case "bulletList": {
        const items = list(o.content)
          .map(obj)
          .filter((li) => li?.type === "listItem")
          .map((li) => ({ type: "listItem" as const, content: list(li!.content).map(block).filter((b): b is RichNode => b?.type === "paragraph") }))
          .filter((li) => li.content.length);
        return items.length ? { type: "bulletList", content: items } : null;
      }
      case "blockquote": {
        const content = list(o.content).map(block).filter((b): b is RichNode => b?.type === "paragraph");
        return content.length ? { type: "blockquote", content } : null;
      }
      case "relatedArticle":
        return typeof attrs.articleId === "string" && ID.test(attrs.articleId) ? { type: "relatedArticle", attrs: { articleId: attrs.articleId } } : null;
      case "image":
        return typeof attrs.imageId === "string" && ID.test(attrs.imageId) ? { type: "image", attrs: { imageId: attrs.imageId } } : null;
      default:
        return null;
    }
  }

  const root = obj(input);
  if (!root || root.type !== "doc") return null;
  const content = list(root.content)
    .map(block)
    .filter((b): b is RichNode => !!b)
    // el editor deja un párrafo vacío al final: no se guarda
    .filter((b, i, all) => !(b.type === "paragraph" && !b.content?.length && i === all.length - 1));
  return { type: "doc", content };
}
