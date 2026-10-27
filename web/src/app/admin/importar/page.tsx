import type { Metadata } from "next";
import Link from "next/link";
import { FileUp } from "lucide-react";

export const metadata: Metadata = { title: "Importar archivo" };

// A03/A04: provisional. La extracción de Word/PDF va con /replica-backend
// (mammoth + pdfjs en el servidor, archivos de hasta 10 MB).
export default function ImportPage() {
  return (
    <div className="mx-auto max-w-article">
      <Link href="/admin" className="text-ui-sm text-text-muted hover:underline">← Notas</Link>
      <h1 className="mt-2 font-display text-heading-lg">Importar archivo</h1>
      <div className="mt-6 grid place-items-center rounded-sm border-2 border-dashed border-border-input bg-raised p-10 text-center">
        <FileUp className="size-8 text-text-muted" aria-hidden />
        <p className="mt-2 font-semibold">Importar desde Word, TXT o PDF</p>
        <p className="mt-1 max-w-card text-ui-sm text-text-muted">
          Esta función llega en el siguiente paso: subirás el archivo y el texto se repartirá en título, bajada y cuerpo para que lo revises.
        </p>
      </div>
    </div>
  );
}
