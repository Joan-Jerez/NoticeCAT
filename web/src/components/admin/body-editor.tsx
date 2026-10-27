"use client";

import { useRef, useState } from "react";
import { Bold, Heading2, Italic, Link2, List, Newspaper, Quote, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type Related = { id: string; title: string };
type Panel = "link" | "related" | null;

// Campo de texto con barra de botones. Los botones escriben los mismos
// símbolos que entiende lib/richtext.ts, así lo guardado no cambia.
export function BodyEditor({ defaultValue, related, invalid, describedBy }: { defaultValue: string; related: Related[]; invalid: boolean; describedBy?: string }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [href, setHref] = useState("https://");
  const [linkText, setLinkText] = useState("");
  const [relatedId, setRelatedId] = useState("");

  // Reemplaza [start, end) por text con execCommand, que respeta Ctrl+Z;
  // si el navegador no lo permite, cae a setRangeText.
  function replace(start: number, end: number, text: string, selStart: number, selEnd: number) {
    const el = area.current!;
    el.focus();
    el.setSelectionRange(start, end);
    if (!document.execCommand("insertText", false, text)) {
      el.setRangeText(text, start, end, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    el.setSelectionRange(selStart, selEnd);
  }

  // **negrita** y *cursiva*: envuelve la selección, o la quita si ya está.
  function wrap(mark: string, placeholder: string) {
    const el = area.current!;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const inner = value.slice(s, e);
    if (value.slice(s - mark.length, s) === mark && value.slice(e, e + mark.length) === mark) {
      replace(s - mark.length, e + mark.length, inner, s - mark.length, e - mark.length);
      return;
    }
    const text = inner || placeholder;
    replace(s, e, mark + text + mark, s + mark.length, s + mark.length + text.length);
  }

  // ## , - y > van al principio de cada línea seleccionada; un segundo clic los quita.
  function prefix(mark: string) {
    const el = area.current!;
    const { value } = el;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    let end = value.indexOf("\n", el.selectionEnd);
    if (end === -1) end = value.length;
    const lines = value.slice(start, end).split("\n");
    const filled = lines.filter((l) => l.trim());
    const all = filled.length > 0 && filled.every((l) => l.startsWith(mark));
    const text = lines
      .map((l) => {
        if (all) return l.startsWith(mark) ? l.slice(mark.length) : l;
        if (lines.length > 1 && !l.trim()) return l; // las líneas en blanco separan párrafos
        return mark + l.replace(/^(##+ |- |> )/, ""); // cambia de subtítulo a lista, etc.
      })
      .join("\n");
    replace(start, end, text, start + (all ? 0 : mark.length), start + text.length);
  }

  // Un bloque propio (caja "Lee además"): va al final del párrafo donde está
  // el cursor, nunca en medio de una frase, separado por líneas en blanco.
  function insertBlock(block: string) {
    const el = area.current!;
    const { value } = el;
    const next = value.indexOf("\n\n", el.selectionEnd);
    const e = next === -1 ? value.length : next;
    const before = value.slice(0, e).replace(/\s*$/, "");
    const after = value.slice(e).replace(/^\s*/, "");
    const text = (before ? "\n\n" : "") + block + (after ? "\n\n" : "");
    const from = before.length;
    const to = value.length - after.length;
    replace(from, to, text, from + text.length, from + text.length);
  }

  function openLink() {
    const el = area.current!;
    setLinkText(el.value.slice(el.selectionStart, el.selectionEnd));
    setHref("https://");
    setPanel(panel === "link" ? null : "link");
  }

  function insertLink() {
    if (!/^https?:\/\/\S+\.\S+/.test(href)) return;
    const el = area.current!;
    const { selectionStart: s, selectionEnd: e } = el;
    const label = linkText.trim() || href;
    const text = `[${label}](${href.trim()})`;
    setPanel(null);
    replace(s, e, text, s + text.length, s + text.length);
  }

  function insertRelated() {
    if (!relatedId) return;
    setPanel(null);
    insertBlock(`[[nota:${relatedId}]]`);
    setRelatedId("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      wrap("**", "texto en negrita");
    } else if (k === "i") {
      e.preventDefault();
      wrap("*", "texto en cursiva");
    } else if (k === "k") {
      e.preventDefault();
      openLink();
    }
  }

  const tools = [
    { label: "Subtítulo", icon: Heading2, run: () => prefix("## ") },
    { label: "Negrita (Ctrl+B)", icon: Bold, run: () => wrap("**", "texto en negrita") },
    { label: "Cursiva (Ctrl+I)", icon: Italic, run: () => wrap("*", "texto en cursiva") },
    { label: "Lista", icon: List, run: () => prefix("- ") },
    { label: "Cita destacada", icon: Quote, run: () => prefix("> ") },
    { label: "Enlace (Ctrl+K)", icon: Link2, run: openLink, active: panel === "link" },
    { label: "Caja «Lee además»", icon: Newspaper, run: () => setPanel(panel === "related" ? null : "related"), active: panel === "related" },
  ];

  return (
    <div className="overflow-hidden rounded-sm border border-border-input bg-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus aria-invalid:border-danger" aria-invalid={invalid || undefined}>
      <div role="toolbar" aria-label="Botones de formato" aria-controls="body" className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-1.5 py-1">
        {tools.map(({ label, icon: Icon, run, active }, n) => (
          <span key={label} className="contents">
            {(n === 1 || n === 3 || n === 5) && <span aria-hidden className="mx-1 h-5 w-px bg-border" />}
            <button
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active ?? undefined}
              // no robar el foco: así la selección del texto se conserva
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
              className={cx("press grid size-9 place-items-center rounded-sm text-text hover:bg-surface-tint", active && "bg-surface-tint text-accent")}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          </span>
        ))}
      </div>

      {panel === "link" && (
        <div className="animate-fade-in flex flex-wrap items-end gap-2 border-b border-border bg-surface-tint/50 p-3">
          <label className="min-w-40 flex-1 text-ui-sm">
            Texto que se verá
            <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="el informe oficial" className="mt-1" />
          </label>
          <label className="min-w-56 flex-[2] text-ui-sm">
            Dirección
            <Input
              type="url"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertLink();
                }
              }}
              className="mt-1"
              autoFocus
            />
          </label>
          <Button type="button" size="md" onClick={insertLink} disabled={!/^https?:\/\/\S+\.\S+/.test(href)}>
            Poner enlace
          </Button>
          <button type="button" aria-label="Cerrar" title="Cerrar" onClick={() => setPanel(null)} className="press grid size-10 place-items-center rounded-full hover:bg-surface">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {panel === "related" && (
        <div className="animate-fade-in flex flex-wrap items-end gap-2 border-b border-border bg-surface-tint/50 p-3">
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
          <Button type="button" size="md" onClick={insertRelated} disabled={!relatedId}>
            Insertar caja
          </Button>
          <button type="button" aria-label="Cerrar" title="Cerrar" onClick={() => setPanel(null)} className="press grid size-10 place-items-center rounded-full hover:bg-surface">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <textarea
        ref={area}
        id="body"
        name="body"
        rows={18}
        defaultValue={defaultValue}
        onKeyDown={onKeyDown}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="block w-full resize-y bg-raised px-4 py-3 font-serif text-body text-text placeholder:text-text-muted focus-visible:outline-none"
      />
    </div>
  );
}
