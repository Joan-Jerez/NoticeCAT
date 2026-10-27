import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Info } from "lucide-react";
import { getOAuthProviders, getSessionUser, safeNext } from "@/lib/auth";
import { usingSupabase } from "@/lib/data";
import { getCurrentOrg, getCurrentStaff } from "@/lib/org";
import { Button, ButtonLink } from "@/components/ui/button";
import { AuthForm } from "@/components/account/auth-form";
import { listFollowing } from "@/lib/follows";
import { signInWithProvider, signOut } from "../actions";

// S08 / S09 y "Mi cuenta", con Supabase Auth.
const modes = {
  entrar: { title: "Entrar", button: "Entrar", alt: { text: "¿No tienes cuenta?", link: "Crear una", href: "/cuenta/registro" } },
  registro: { title: "Crear cuenta", button: "Crear cuenta", alt: { text: "¿Ya tienes cuenta?", link: "Entrar", href: "/cuenta/entrar" } },
  recuperar: { title: "Recuperar contraseña", button: "Enviar enlace", alt: { text: "¿La recordaste?", link: "Volver a entrar", href: "/cuenta/entrar" } },
  "nueva-clave": { title: "Elige una contraseña nueva", button: "Guardar contraseña", alt: null },
} as const;

const linkErrors: Record<string, string> = {
  enlace: "Ese enlace ya se usó o caducó. Pide uno nuevo.",
  oauth: "No pudimos entrar con esa cuenta. Prueba de nuevo o usa tu correo.",
};

type Props = { params: Promise<{ modo?: string[] }>; searchParams: Promise<{ seguir?: string; siguiente?: string; error?: string; clave?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = (await params).modo?.[0];
  return { title: key ? (modes[key as keyof typeof modes]?.title ?? "Cuenta") : "Mi cuenta", robots: { index: false } };
}

export default async function AccountPage({ params, searchParams }: Props) {
  const { modo } = await params;
  const sp = await searchParams;
  const org = await getCurrentOrg();
  const user = await getSessionUser();

  if (!modo) {
    if (!user) redirect("/cuenta/entrar");
    return <AccountHome orgId={org.id} orgName={org.name} user={user} passwordChanged={!!sp.clave} />;
  }

  const key = modo[0] as keyof typeof modes;
  if (!(key in modes) || modo.length > 1) notFound();
  if (user && key !== "nueva-clave") redirect(safeNext(sp.siguiente));
  if (!user && key === "nueva-clave") redirect("/cuenta/recuperar");
  const m = modes[key];
  const next = safeNext(sp.siguiente, sp.seguir ? `/tema/${encodeURIComponent(sp.seguir)}` : "/cuenta");
  const providers = key === "entrar" || key === "registro" ? await getOAuthProviders() : [];

  return (
    <div className="container-page flex justify-center py-12 md:py-20">
      <div className="w-full max-w-card">
        <p className="eyebrow text-accent">{org.name}</p>
        <h1 className="mt-1 font-display text-heading">{m.title}</h1>
        {sp.seguir && <p className="mt-2 text-ui text-text-muted">Entra para seguir este tema y ver sus notas nuevas primero.</p>}

        {!usingSupabase && (
          <div role="note" className="mt-6 flex gap-2 rounded-sm bg-warning-bg p-3 text-ui-sm text-warning">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Las cuentas se activan al conectar Supabase (claves en .env.local).
          </div>
        )}
        {sp.error && linkErrors[sp.error] && (
          <p role="alert" className="mt-6 rounded-sm bg-danger-bg px-4 py-3 text-ui text-danger">
            {linkErrors[sp.error]}
          </p>
        )}

        <AuthForm mode={key} button={m.button} next={key === "entrar" ? next : undefined} />

        {key === "entrar" && (
          <p className="mt-3 text-right text-ui-sm">
            <Link href="/cuenta/recuperar" className="text-accent hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        )}
        {providers.length > 0 && (
          <div className="mt-6 space-y-2 border-t border-border pt-6">
            {providers.map((p) => (
              <form key={p} action={signInWithProvider}>
                <input type="hidden" name="provider" value={p} />
                <input type="hidden" name="siguiente" value={next} />
                <Button type="submit" variant="secondary" className="w-full">
                  Continuar con {p === "google" ? "Google" : "Facebook"}
                </Button>
              </form>
            ))}
          </div>
        )}
        {m.alt && (
          <p className="mt-6 text-center text-ui-sm text-text-muted">
            {m.alt.text}{" "}
            <Link href={m.alt.href} className="font-semibold text-accent hover:underline">
              {m.alt.link}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

async function AccountHome({ orgId, orgName, user, passwordChanged }: { orgId: string; orgName: string; user: { email: string; name: string }; passwordChanged: boolean }) {
  const [staff, topics] = await Promise.all([getCurrentStaff(), listFollowing(orgId)]);
  return (
    <div className="container-page flex justify-center py-12 md:py-20">
      <div className="w-full max-w-card">
        <p className="eyebrow text-accent">{orgName}</p>
        <h1 className="mt-1 font-display text-heading">Mi cuenta</h1>
        {passwordChanged && (
          <p role="status" className="mt-6 rounded-sm bg-success-bg px-4 py-3 text-ui text-success">
            Tu contraseña se cambió.
          </p>
        )}
        <dl className="mt-6 divide-y divide-border border-y border-border text-ui">
          {user.name && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-text-muted">Nombre</dt>
              <dd className="truncate font-semibold">{user.name}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-text-muted">Correo</dt>
            <dd className="truncate font-semibold">{user.email}</dd>
          </div>
        </dl>

        <section aria-labelledby="h-temas" className="mt-8">
          <h2 id="h-temas" className="font-display text-title">Temas que sigues</h2>
          {topics.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {topics.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tema/${t.slug}`} className="inline-block border border-border px-3 py-1 text-ui-sm hover:border-accent hover:text-accent">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ui-sm text-text-muted">Todavía ninguno. Abre un tema desde cualquier nota y pulsa «Seguir tema».</p>
          )}
        </section>

        <div className="mt-8 space-y-2">
          {staff && (
            <ButtonLink href="/admin" className="w-full">
              Ir al panel
            </ButtonLink>
          )}
          <ButtonLink href="/cuenta/nueva-clave" variant="secondary" className="w-full">
            Cambiar contraseña
          </ButtonLink>
          <form action={signOut}>
            <Button type="submit" variant="secondary" className="w-full">
              Salir
            </Button>
          </form>
          <form action={signOut}>
            <input type="hidden" name="todas" value="1" />
            <Button type="submit" variant="ghost" className="w-full">
              Salir en todos los dispositivos
            </Button>
          </form>
        </div>

        <section aria-labelledby="h-borrar" className="mt-10 border-t border-border pt-6">
          <h2 id="h-borrar" className="font-display text-title">Borrar la cuenta</h2>
          <p className="mt-1 text-ui-sm text-text-muted">Se borran tu cuenta, tus datos de lector y los temas que sigues. Tus votos en encuestas quedan anónimos. No se puede deshacer.</p>
          <AuthForm mode="borrar" button="Borrar mi cuenta" />
        </section>
      </div>
    </div>
  );
}
