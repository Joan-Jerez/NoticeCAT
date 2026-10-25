"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// "Ver más notas": pide la siguiente página a una server action que ya
// devuelve las tarjetas pintadas, y mueve el foco a la primera nueva.
export function LoadMore({ initialCursor, load }: { initialCursor: string | null; load: (cursor: string) => Promise<{ html: ReactNode; nextCursor: string | null }> }) {
  const [pages, setPages] = useState<ReactNode[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const firstNew = useRef<HTMLDivElement>(null);

  function more() {
    if (!cursor) return;
    setError(false);
    start(async () => {
      try {
        const res = await load(cursor);
        setPages((p) => [...p, res.html]);
        setCursor(res.nextCursor);
        requestAnimationFrame(() => firstNew.current?.querySelector("a")?.focus());
      } catch {
        setError(true);
      }
    });
  }

  return (
    <>
      {pages.map((html, i) => (
        <div key={i} ref={i === pages.length - 1 ? firstNew : undefined} className="mt-4 border-t border-border pt-4">
          {html}
        </div>
      ))}
      <div className="mt-8" aria-live="polite">
        {error ? (
          <div className="text-center">
            <p className="text-ui-sm text-danger">No se pudieron cargar más notas.</p>
            <Button variant="secondary" className="mt-2 w-full" onClick={more}>
              Reintentar
            </Button>
          </div>
        ) : cursor ? (
          <Button variant="secondary" className="w-full" loading={pending} onClick={more}>
            {pending ? "Cargando…" : "Ver más notas"}
          </Button>
        ) : (
          (pages.length > 0 || initialCursor) && <p className="text-center text-ui-sm text-text-muted">No hay más notas.</p>
        )}
      </div>
    </>
  );
}
