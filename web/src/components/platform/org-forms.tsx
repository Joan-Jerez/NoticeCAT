"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, LogIn, Plus, Star, Trash2 } from "lucide-react";
import {
  addDomain,
  addSection,
  createOrg,
  deleteOrg,
  deleteSection,
  enterOrgPanel,
  moveSection,
  removeDomain,
  setBilling,
  setPrimaryDomain,
  updateOrg,
  updateSection,
  type PlatformResult,
} from "@/app/plataforma/actions";
import type { OrgDetail } from "@/lib/platform";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Flash, useRun } from "./shared";

function Submit({ children, variant = "primary" as const, icon }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} icon={icon}>
      {children}
    </Button>
  );
}

const iconBtn = "press grid size-9 place-items-center rounded-full text-text-muted hover:bg-surface-tint hover:text-text disabled:opacity-40";

export function CreateOrgForm() {
  const [state, action] = useActionState<PlatformResult | null, FormData>(createOrg, null);
  return (
    <form action={action} className="space-y-4 rounded-lg bg-raised p-6 shadow-card">
      <Field id="name" label="Nombre del medio">
        <Input id="name" name="name" required maxLength={80} placeholder="El Diario del Este" />
      </Field>
      <Field id="slug" label="Identificador" hint="Opcional. Sale del nombre si lo dejas vacío. Se usa en local con ?org=…">
        <Input id="slug" name="slug" maxLength={40} placeholder="diario-del-este" />
      </Field>
      <Field id="tagline" label="Lema">
        <Input id="tagline" name="tagline" maxLength={140} placeholder="Noticias del este, cada día." />
      </Field>
      <Field id="host" label="Dominio" hint="Opcional, por ejemplo diariodeleste.com. Luego hay que apuntar su DNS al hosting.">
        <Input id="host" name="host" placeholder="diariodeleste.com" />
      </Field>
      <Field id="ownerEmail" label="Correo del dueño" hint="Opcional. La cuenta debe existir. Si lo dejas vacío, el dueño eres tú.">
        <Input id="ownerEmail" name="ownerEmail" type="email" placeholder="dueno@diariodeleste.com" />
      </Field>
      <Flash result={state} />
      <Submit icon={<Plus className="size-4" aria-hidden />}>Crear medio</Submit>
    </form>
  );
}

export function OrgDetailsForm({ org }: { org: OrgDetail }) {
  const [state, action] = useActionState<PlatformResult | null, FormData>(updateOrg, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={org.id} />
      <Field id="name" label="Nombre">
        <Input id="name" name="name" defaultValue={org.name} required maxLength={80} />
      </Field>
      <Field id="slug" label="Identificador">
        <Input id="slug" name="slug" defaultValue={org.slug} required maxLength={40} />
      </Field>
      <Field id="tagline" label="Lema" className="sm:col-span-2">
        <Input id="tagline" name="tagline" defaultValue={org.tagline} maxLength={140} />
      </Field>
      <Field id="timezone" label="Zona horaria" hint="Fechas de las notas y sus URLs.">
        <Input id="timezone" name="timezone" defaultValue={org.timezone} list="zonas" />
      </Field>
      <datalist id="zonas">
        {["America/Santo_Domingo", "America/New_York", "America/Mexico_City", "America/Bogota", "America/Caracas", "America/Puerto_Rico", "Europe/Madrid"].map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
      <Field id="locale" label="Idioma y país" hint="Formato como es-DO.">
        <Input id="locale" name="locale" defaultValue={org.locale} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Submit>Guardar datos</Submit>
        <Flash result={state} />
      </div>
    </form>
  );
}

const plans = [
  ["trial", "Prueba"],
  ["starter", "Starter"],
  ["pro", "Pro"],
  ["newsroom", "Redacción"],
] as const;
const statuses = [
  ["trialing", "En prueba"],
  ["active", "Al día"],
  ["past_due", "Pago atrasado"],
  ["canceled", "Cancelado"],
  ["incomplete", "Incompleto"],
] as const;

export function BillingForm({ org }: { org: OrgDetail }) {
  const [plan, setPlan] = useState(org.plan);
  const [status, setStatus] = useState(org.billingStatus);
  const { flash, pending, run } = useRun();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="w-44 text-ui-sm">
        Plan
        <Select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1">
          {plans.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>
      <label className="w-48 text-ui-sm">
        Estado del pago
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1">
          {statuses.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>
      <Button type="button" variant="secondary" loading={pending} disabled={plan === org.plan && status === org.billingStatus} onClick={() => run(() => setBilling(org.id, plan, status))}>
        Guardar plan
      </Button>
      <Flash result={flash} className="basis-full" />
    </div>
  );
}

export function DomainsEditor({ org }: { org: OrgDetail }) {
  const [host, setHost] = useState("");
  const { flash, pending, run } = useRun();
  return (
    <div className="space-y-3">
      {org.domains.length === 0 && <p className="text-ui-sm text-text-muted">Sin dominio. En producción el medio no se ve hasta que tenga uno.</p>}
      <ul className="space-y-2">
        {org.domains.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2">
            <span className="flex-1 font-mono text-ui-sm">{d.host}</span>
            {d.isPrimary ? (
              <span className="eyebrow rounded-pill bg-surface-tint px-2 py-0.5 text-accent">Principal</span>
            ) : (
              <button type="button" title="Hacer principal" aria-label={`Hacer principal ${d.host}`} disabled={pending} onClick={() => run(() => setPrimaryDomain(org.id, d.id))} className={iconBtn}>
                <Star className="size-4" aria-hidden />
              </button>
            )}
            <button type="button" title="Quitar dominio" aria-label={`Quitar ${d.host}`} disabled={pending} onClick={() => run(() => removeDomain(d.id))} className={cx(iconBtn, "hover:bg-danger-bg hover:text-danger")}>
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!host.trim()) return;
          run(async () => {
            const res = await addDomain(org.id, host);
            if (res.ok) setHost("");
            return res;
          });
        }}
      >
        <label htmlFor="nuevo-dominio" className="sr-only">
          Dominio nuevo
        </label>
        <div className="min-w-56 flex-1">
          <Input id="nuevo-dominio" value={host} onChange={(e) => setHost(e.target.value)} placeholder="midiario.com" />
        </div>
        <Button type="submit" variant="secondary" disabled={!host.trim() || pending} icon={<Plus className="size-4" aria-hidden />}>
          Añadir dominio
        </Button>
      </form>
      <Flash result={flash} />
    </div>
  );
}

export function SectionsEditor({ org }: { org: OrgDetail }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { flash, pending, run } = useRun();
  const top = org.sections.filter((s) => !s.parentId);
  const childrenOf = (id: string) => org.sections.filter((s) => s.parentId === id);

  const row = (s: OrgDetail["sections"][number], i: number, list: OrgDetail["sections"], child = false) => (
    <li key={s.id} className={cx("flex flex-wrap items-center gap-1 rounded-md bg-surface py-1.5 pl-3 pr-1.5", child && "ml-6")}>
      {editing === s.id ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(null);
            run(() => updateSection(s.id, { name: draft }));
          }}
        >
          <label htmlFor={`sec-${s.id}`} className="sr-only">
            Nombre de la sección
          </label>
          <div className="flex-1">
            <Input id={`sec-${s.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus className="h-9" />
          </div>
          <Button type="submit" size="sm">
            Guardar
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => (setEditing(s.id), setDraft(s.name))} className={cx("flex-1 text-left text-ui hover:text-accent", !s.inMenu && "text-text-muted")} title="Cambiar nombre">
          {s.name} <span className="text-caption text-text-muted">/{s.slug} · {s.articles} notas</span>
        </button>
      )}
      <button type="button" title="Subir" aria-label={`Subir ${s.name}`} disabled={pending || i === 0} onClick={() => run(() => moveSection(s.id, -1))} className={iconBtn}>
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button type="button" title="Bajar" aria-label={`Bajar ${s.name}`} disabled={pending || i === list.length - 1} onClick={() => run(() => moveSection(s.id, 1))} className={iconBtn}>
        <ArrowDown className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        title={s.inMenu ? "Ocultar del menú" : "Mostrar en el menú"}
        aria-label={s.inMenu ? `Ocultar ${s.name} del menú` : `Mostrar ${s.name} en el menú`}
        disabled={pending}
        onClick={() => run(() => updateSection(s.id, { inMenu: !s.inMenu }))}
        className={iconBtn}
      >
        {s.inMenu ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </button>
      <button type="button" title="Borrar sección" aria-label={`Borrar ${s.name}`} disabled={pending} onClick={() => run(() => deleteSection(s.id))} className={cx(iconBtn, "hover:bg-danger-bg hover:text-danger")}>
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {top.map((s, i) => [row(s, i, top), ...childrenOf(s.id).map((c, j, list) => row(c, j, list, true))])}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(async () => {
            const res = await addSection(org.id, name);
            if (res.ok) setName("");
            return res;
          });
        }}
      >
        <label htmlFor="nueva-seccion" className="sr-only">
          Sección nueva
        </label>
        <div className="min-w-56 flex-1">
          <Input id="nueva-seccion" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tecnología" />
        </div>
        <Button type="submit" variant="secondary" disabled={!name.trim() || pending} icon={<Plus className="size-4" aria-hidden />}>
          Añadir sección
        </Button>
      </form>
      <Flash result={flash} />
    </div>
  );
}

export function EnterPanelButton({ orgId }: { orgId: string }) {
  return (
    <form action={enterOrgPanel.bind(null, orgId)}>
      <Submit variant="secondary" icon={<LogIn className="size-4" aria-hidden />}>
        Entrar a su panel como dueño
      </Submit>
    </form>
  );
}

export function DeleteOrgForm({ org }: { org: OrgDetail }) {
  const [state, action] = useActionState<PlatformResult | null, FormData>(deleteOrg, null);
  const [typed, setTyped] = useState("");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={org.id} />
      <Field id="confirm" label={`Escribe «${org.slug}» para confirmar`}>
        <Input id="confirm" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Field>
      <Flash result={state} />
      <Button type="submit" variant="danger" disabled={typed !== org.slug} icon={<Trash2 className="size-4" aria-hidden />}>
        Borrar el medio y todo su contenido
      </Button>
    </form>
  );
}
