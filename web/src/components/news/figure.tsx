"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Expand, X } from "lucide-react";
import type { Image as Img } from "@/lib/types";

export function Figure({ image, priority = false }: { image: Img; priority?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    const onClick = (e: MouseEvent) => e.target === d && d?.close();
    d?.addEventListener("click", onClick);
    return () => d?.removeEventListener("click", onClick);
  }, []);

  return (
    <figure>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-tint">
        <Image src={image.src} alt={image.alt} fill priority={priority} sizes="(min-width: 768px) 760px, 100vw" className="object-cover" />
        <button type="button" onClick={() => dialog.current?.showModal()} aria-label="Ampliar foto" title="Ampliar foto" className="press absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-raised/90 opacity-80 hover:bg-raised hover:opacity-100 md:size-9">
          <Expand className="size-4" aria-hidden />
        </button>
      </div>
      {(image.caption || image.credit) && (
        <figcaption className="mt-2 text-caption text-text-muted">
          {image.caption} {image.credit && <span className="eyebrow">Foto: {image.credit}</span>}
        </figcaption>
      )}
      <dialog ref={dialog} aria-label="Foto ampliada" className="enter-fade m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-scrim/80">
        <div className="relative">
          <Image src={image.src} alt={image.alt} width={image.width} height={image.height} className="max-h-[90vh] w-auto max-w-[95vw] rounded-lg" />
          <form method="dialog">
            <button aria-label="Cerrar" title="Cerrar" className="press absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-raised text-text">
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      </dialog>
    </figure>
  );
}
