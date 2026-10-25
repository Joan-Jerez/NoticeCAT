import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { getCurrentOrg } from "@/lib/org";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

// S08 / S09. Formularios listos; el envío se conecta a Supabase Auth en /replica-backend.
const modes = {
  entrar: { title: "Entrar", button: "Entrar", alt: { text: "¿No tienes cuenta?", link: "Crear una", href: "/cuenta/registro" } },
  registro: { title: "Crear cuenta", button: "Crear cuenta", alt: { text: "¿Ya tienes cuenta?", link: "Entrar", href: "/cuenta/entrar" } },
  recuperar: { title: "Recuperar contraseña", button: "Enviar enlace", alt: { text: "¿La recordaste?", link: "Volver a entrar", href: "/cuenta/entrar" } },
} as const;

type Props = { params: Promise<{ modo?: string[] }>; searchParams: Promise<{ seguir?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = ((await params).modo?.[0] ?? "entrar") as keyof typeof modes;
  return { title: modes[key]?.title ?? "Cuenta", robots: { index: false } };
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { modo } = await params;
  const key = (modo?.[0] ?? "entrar") as keyof typeof modes;
  if (!(key in modes) || (modo && modo.length > 1)) notFound();
  const m = modes[key];
  const { seguir } = await searchParams;
  const org = await getCurrentOrg();

  return (
    <div className="container-page flex justify-center py-12 md:py-20">
      <div className="w-full max-w-card">
        <p className="eyebrow text-accent">{org.name}</p>
        <h1 className="mt-1 font-display text-heading">{m.title}</h1>
        {seguir && <p className="mt-2 text-ui text-text-muted">Entra para seguir este tema y ver sus notas nuevas primero.</p>}

        <div role="note" className="mt-6 flex gap-2 rounded-xs bg-warning-bg p-3 text-ui-sm text-warning">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Las cuentas de lector se activan al conectar la base de datos. El formulario todavía no envía nada.
        </div>

        <form className="mt-6 space-y-4">
          {key === "registro" && (
            <Field id="nombre" label="Nombre">
              <Input id="nombre" name="nombre" autoComplete="name" />
            </Field>
          )}
          <Field id="email" label="Correo">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          {key !== "recuperar" && (
            <Field id="password" label="Contraseña" hint={key === "registro" ? "Al menos 8 caracteres." : undefined}>
              <Input id="password" name="password" type="password" autoComplete={key === "registro" ? "new-password" : "current-password"} minLength={8} required aria-describedby={key === "registro" ? "password-hint" : undefined} />
            </Field>
          )}
          <Button type="submit" className="w-full" disabled>
            {m.button}
          </Button>
        </form>

        {key === "entrar" && (
          <p className="mt-3 text-right text-ui-sm">
            <Link href="/cuenta/recuperar" className="text-accent hover:underline">¿Olvidaste tu contraseña?</Link>
          </p>
        )}
        {key !== "recuperar" && (
          <div className="mt-6 space-y-2 border-t border-border pt-6">
            <Button variant="secondary" className="w-full" disabled>Continuar con Google</Button>
            <Button variant="secondary" className="w-full" disabled>Continuar con Facebook</Button>
          </div>
        )}
        <p className="mt-6 text-center text-ui-sm text-text-muted">
          {m.alt.text}{" "}
          <Link href={m.alt.href} className="font-semibold text-accent hover:underline">{m.alt.link}</Link>
        </p>
      </div>
    </div>
  );
}
