import type { Metadata } from "next";
import { getCurrentOrg } from "@/lib/org";
import { PageHeader } from "@/components/news/listing";

export const metadata: Metadata = { title: "Contacto" };

// S12. Provisional: el formulario de contacto llega con el envío de correos (Resend).
export default async function ContactPage() {
  const org = await getCurrentOrg();
  return (
    <div className="container-page pt-8 md:pt-12">
      <PageHeader kind={org.name} title="Contacto" />
      <div className="mt-8 max-w-article space-y-6 font-serif text-body">
        <p>¿Tienes una historia, una corrección o una pregunta? Queremos leerla.</p>
        <p className="text-text-muted">El formulario de contacto se activa cuando el medio configure su correo de redacción.</p>
      </div>
    </div>
  );
}
