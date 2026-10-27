import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { getSystemInfo } from "@/lib/platform";
import { ClearRateLimits } from "@/components/platform/system-actions";
import { Panel } from "@/components/platform/shared";

export const metadata: Metadata = { title: "Sistema" };

export default async function PlatformSystem() {
  const info = await getSystemInfo();
  const counters = [
    { label: "Encuestas", value: info.polls },
    { label: "Votos", value: info.votes },
    { label: "Eventos de Stripe", value: info.stripeEvents },
    { label: "Contadores de límite de uso", value: info.rateLimitRows },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-heading-lg font-semibold">Sistema</h1>
        <p className="mt-1 text-ui text-text-muted">Estado de la conexión y de la configuración. Los valores secretos nunca se muestran, solo si están puestos.</p>
      </header>

      <Panel title="Base de datos">
        <p className="flex items-center gap-2 text-ui">
          {info.dbOk ? <CheckCircle2 className="size-5 text-success" aria-hidden /> : <XCircle className="size-5 text-danger" aria-hidden />}
          {info.dbOk ? "Supabase responde." : `Supabase no responde: ${info.dbError}`}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counters.map((c) => (
            <div key={c.label} className="rounded-md bg-surface p-3">
              <dt className="text-caption text-text-muted">{c.label}</dt>
              <dd className="mt-0.5 font-display text-title font-semibold tabular-nums">{c.value.toLocaleString("es-DO")}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Variables de entorno">
        <ul className="divide-y divide-border">
          {info.env.map((e) => (
            <li key={e.name} className="flex items-center gap-3 py-2.5">
              {e.set ? <CheckCircle2 className="size-4.5 shrink-0 text-success" aria-label="Puesta" /> : <CircleDashed className="size-4.5 shrink-0 text-text-muted" aria-label="Sin poner" />}
              <code className="font-mono text-ui-sm">{e.name}</code>
              <span className="ml-auto text-ui-sm text-text-muted">{e.note}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Límites de uso" description="Cuentan intentos por IP (entrar, registrarse, votar). Reiniciarlos desbloquea a quien se quedó fuera por demasiados intentos.">
        <ClearRateLimits />
      </Panel>
    </div>
  );
}
