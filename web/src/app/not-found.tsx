import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenido" className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow text-accent">Error 404</p>
      <h1 className="mt-2 font-display text-headline">Esta página no existe</h1>
      <p className="mt-3 max-w-card font-serif text-dek text-text-muted">Puede que la nota se haya retirado o que el enlace esté mal escrito.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonClass("primary")}>Ir a la portada</Link>
        <Link href="/buscar" className={buttonClass("secondary")}>Buscar</Link>
      </div>
    </main>
  );
}
