import Link from "next/link";
import type { ReactNode } from "react";
import { getVisibleArticleById } from "@/lib/data";
import { safeHref } from "@/lib/richtext";
import type { RichNode } from "@/lib/types";

// Pinta el documento con una lista cerrada de nodos: nada de HTML guardado,
// así no hay forma de colar un <script> desde el editor o un Word importado.

function Inline({ nodes }: { nodes?: RichNode[] }) {
  return (
    <>
      {(nodes ?? []).map((n, i) => {
        if (n.type !== "text") return null;
        let el: ReactNode = n.text;
        for (const m of n.marks ?? []) {
          if (m.type === "bold") el = <b className="font-semibold">{el}</b>;
          else if (m.type === "italic") el = <i>{el}</i>;
          else if (m.type === "link")
            el = (
              <a href={safeHref(m.attrs.href)} className="text-accent underline underline-offset-2 hover:text-accent-hover" rel={m.attrs.href.startsWith("/") ? undefined : "noopener noreferrer"}>
                {el}
              </a>
            );
        }
        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

async function Related({ orgId, articleId }: { orgId: string; articleId: string }) {
  const a = await getVisibleArticleById(orgId, articleId);
  if (!a) return null; // nota borrada o despublicada: la caja desaparece
  return (
    <aside className="border-y border-border py-3 font-sans">
      <p className="eyebrow text-accent">Lee además</p>
      <Link href={a.url} className="font-display text-title-sm hover:underline">
        {a.title}
      </Link>
    </aside>
  );
}

function Block({ node, orgId }: { node: RichNode; orgId: string }) {
  switch (node.type) {
    case "paragraph":
      return (
        <p>
          <Inline nodes={node.content} />
        </p>
      );
    case "heading":
      return node.attrs.level === 2 ? (
        <h2 className="pt-2 font-display text-title">
          <Inline nodes={node.content} />
        </h2>
      ) : (
        <h3 className="font-display text-title-sm">
          <Inline nodes={node.content} />
        </h3>
      );
    case "bulletList":
      return (
        <ul className="list-disc space-y-2 pl-6 marker:text-accent">
          {node.content.map((li, i) => (
            <li key={i}>{li.type === "listItem" && li.content.map((c, j) => (c.type === "paragraph" ? <Inline key={j} nodes={c.content} /> : null))}</li>
          ))}
        </ul>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-accent pl-5 font-display text-title italic">
          {node.content.map((c, i) => (c.type === "paragraph" ? <p key={i}><Inline nodes={c.content} /></p> : null))}
        </blockquote>
      );
    case "relatedArticle":
      return <Related orgId={orgId} articleId={node.attrs.articleId} />;
    default:
      return null;
  }
}

export function ArticleBody({ doc, orgId }: { doc: RichNode; orgId: string }) {
  const blocks = doc.type === "doc" ? doc.content : [];
  return (
    <div className="space-y-6 font-serif text-body">
      {blocks.map((b, i) => (
        <Block key={i} node={b} orgId={orgId} />
      ))}
    </div>
  );
}
