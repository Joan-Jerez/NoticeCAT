"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, X } from "lucide-react";
import { uploadPhoto } from "@/app/admin/actions";
import type { Image as Img } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

// Subir una foto a la galería del medio. No es un <form>: vive dentro del
// formulario de la nota, así que arma su propio FormData al pulsar el botón.
export function PhotoUpload({ onUploaded, idPrefix }: { onUploaded: (image: Img) => void; idPrefix: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ src: string; w: number; h: number } | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return reset();
    if (f.size > 5 * 1024 * 1024) return setError("La foto pesa más de 5 MB. Redúcela antes de subirla.");
    const src = URL.createObjectURL(f);
    const img = new window.Image();
    img.onload = () => setPreview({ src, w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
    setFile(f);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setAlt("");
    setCaption("");
    setCredit("");
    if (input.current) input.current.value = "";
  }

  function send() {
    if (!file || !preview) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("alt", alt);
    fd.set("caption", caption);
    fd.set("credit", credit);
    fd.set("width", String(preview.w));
    fd.set("height", String(preview.h));
    start(async () => {
      const res = await uploadPhoto(fd);
      if (!res.ok) return setError(res.error);
      onUploaded(res.image);
      reset();
    });
  }

  return (
    <div className="space-y-3">
      {!preview ? (
        <label className="press flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-border-input/60 bg-surface px-4 py-5 text-center text-ui-sm hover:border-accent">
          <ImageUp className="size-5 text-accent" aria-hidden />
          <span className="font-semibold">Subir una foto</span>
          <span className="text-caption text-text-muted">JPG, PNG, WebP o AVIF, hasta 5 MB</span>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="space-y-2 rounded-md border border-border bg-surface p-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local antes de subir */}
            <img src={preview.src} alt="" className="aspect-video w-full rounded-sm object-cover" />
            <button type="button" aria-label="Quitar esta foto" title="Quitar" onClick={reset} className="press absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-raised/90 hover:bg-raised">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <label className="block text-ui-sm" htmlFor={`${idPrefix}-alt`}>
            Qué se ve en la foto <span className="text-danger">*</span>
          </label>
          <Input id={`${idPrefix}-alt`} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Grúas descargando un barco en el puerto" maxLength={300} />
          <label className="block text-ui-sm" htmlFor={`${idPrefix}-caption`}>
            Pie de foto
          </label>
          <Input id={`${idPrefix}-caption`} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} />
          <label className="block text-ui-sm" htmlFor={`${idPrefix}-credit`}>
            Crédito
          </label>
          <Input id={`${idPrefix}-credit`} value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Nombre del fotógrafo o agencia" maxLength={120} />
          <Button type="button" size="sm" className="w-full" loading={pending} disabled={alt.trim().length < 3} onClick={send} icon={<ImageUp className="size-3.5" aria-hidden />}>
            Subir a la galería
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
