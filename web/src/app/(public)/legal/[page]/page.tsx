import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import { PageHeader } from "@/components/news/listing";

// S11. Plantillas para que cada medio las reemplace con su texto legal real
// (desde el panel, cuando exista la sección de ajustes).
const pages = {
  "aviso-legal": {
    title: "Aviso legal",
    body: (org: string) => [
      `${org} es responsable de los contenidos publicados en este sitio.`,
      "Puedes compartir enlaces a nuestras notas libremente. Para reproducir textos, fotos o videos completos, escríbenos antes.",
      "Este texto es una plantilla de CatCoding. El medio debe sustituirlo por su aviso legal revisado por un abogado.",
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    body: (org: string) => [
      `${org} solo guarda los datos que necesitas para usar tu cuenta: tu correo, tu nombre si lo das y los temas que sigues.`,
      "Puedes borrar tu cuenta y todos sus datos en cualquier momento desde tu perfil.",
      "Este texto es una plantilla de CatCoding. El medio debe sustituirlo por su política real, con la lista de proveedores que procesan datos.",
    ],
  },
} as const;

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pages[(await params).page as keyof typeof pages];
  return p ? { title: p.title } : {};
}

export default async function LegalPage({ params }: Props) {
  const p = pages[(await params).page as keyof typeof pages];
  if (!p) notFound();
  const org = await getCurrentOrg();
  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader kind="Legal" title={p.title} />
      <div className="mt-8 max-w-article space-y-6 font-serif text-body">
        {p.body(org.name).map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
    </div>
  );
}
