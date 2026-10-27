"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ImageUp, Trash2, TriangleAlert } from "lucide-react";
import { removeLogo, updateContact, updateTheme, uploadLogo, type PlatformResult } from "@/app/plataforma/actions";
import type { OrgDetail } from "@/lib/platform";
import { accentPalette, FONT_SETS, PAPERS, previewVars, type OrgTheme } from "@/lib/theme";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Flash, useRun } from "./shared";

// colores de partida que se ven bien con los tres papeles
const SWATCHES = ["#A2441F", "#B91C1C", "#9D174D", "#6D28D9", "#1D4ED8", "#0E7490", "#047857", "#4D7C0F", "#A16207", "#334155"];

export function ThemeEditor({ org }: { org: OrgDetail }) {
  const [theme, setTheme] = useState<OrgTheme>(org.theme);
  const { flash, pending, run } = useRun();
  const set = <K extends keyof OrgTheme>(k: K, v: OrgTheme[K]) => setTheme((t) => ({ ...t, [k]: v }));
  const palette = useMemo(() => accentPalette(theme.accent, theme.paper), [theme.accent, theme.paper]);
  const dirty = JSON.stringify(theme) !== JSON.stringify(org.theme);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <fieldset>
          <legend className="text-ui-sm font-semibold">Color principal</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Usar ${c}`}
                aria-pressed={theme.accent.toUpperCase() === c}
                onClick={() => set("accent", c)}
                className="press grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-raised aria-pressed:ring-2 aria-pressed:ring-text"
                style={{ background: c }}
              >
                {theme.accent.toUpperCase() === c && <Check className="size-4 text-white" aria-hidden />}
              </button>
            ))}
            <label className="ml-1 flex items-center gap-2 text-ui-sm">
              <span className="sr-only">Otro color</span>
              <input type="color" value={theme.accent} onChange={(e) => set("accent", e.target.value.toUpperCase())} className="size-8 cursor-pointer rounded-full border border-border bg-transparent" />
              <Input value={theme.accent} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set("accent", e.target.value.toUpperCase())} className="h-8 w-24 font-mono" aria-label="Código del color" />
            </label>
          </div>
          {palette.adjusted && (
            <p className="mt-2 flex items-start gap-1.5 text-caption text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Ese color no se lee bien sobre el papel: se usará {palette.accent}, un poco más oscuro.
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-ui-sm font-semibold">Papel</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(PAPERS) as OrgTheme["paper"][]).map((p) => (
              <button key={p} type="button" aria-pressed={theme.paper === p} onClick={() => set("paper", p)} className="press flex items-center gap-2 rounded-pill border border-border px-3 py-1.5 text-ui-sm aria-pressed:border-accent aria-pressed:bg-surface-tint">
                <span className="size-4 rounded-full border border-border" style={{ background: PAPERS[p].c.bg }} aria-hidden />
                {PAPERS[p].label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-ui-sm font-semibold">Tipografías</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(FONT_SETS) as OrgTheme["fonts"][]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={theme.fonts === f}
                onClick={() => set("fonts", f)}
                className="press rounded-md border border-border px-3 py-2 text-left aria-pressed:border-accent aria-pressed:bg-surface-tint"
              >
                <span className="block text-title-sm font-semibold" style={{ fontFamily: `var(${FONT_SETS[f].display})` }}>
                  {FONT_SETS[f].label}
                </span>
                <span className="block text-caption text-text-muted">{FONT_SETS[f].sample}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-ui-sm font-semibold">Esquinas</legend>
          <div className="mt-2 flex gap-2">
            {(["suaves", "rectas"] as const).map((c) => (
              <button key={c} type="button" aria-pressed={theme.corners === c} onClick={() => set("corners", c)} className="press rounded-pill border border-border px-3 py-1.5 text-ui-sm capitalize aria-pressed:border-accent aria-pressed:bg-surface-tint">
                {c}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-ui">
          <input type="checkbox" checked={theme.showName} onChange={(e) => set("showName", e.target.checked)} className="size-4 accent-accent" />
          Con logo, mostrar también el nombre del medio
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" loading={pending} disabled={!dirty} onClick={() => run(() => updateTheme(org.id, theme))}>
            Guardar apariencia
          </Button>
          {dirty && (
            <button type="button" onClick={() => setTheme(org.theme)} className="text-ui-sm text-text-muted hover:text-accent">
              Deshacer cambios
            </button>
          )}
          <Flash result={flash} />
        </div>
      </div>

      <Preview org={org} theme={theme} />
    </div>
  );
}

// Una cabecera y una tarjeta con el tema aplicado solo dentro de esta caja.
function Preview({ org, theme }: { org: OrgDetail; theme: OrgTheme }) {
  return (
    <div aria-label="Vista previa" className="self-start overflow-hidden rounded-lg border border-border shadow-card" style={previewVars(theme) as React.CSSProperties}>
      <div className="bg-bg text-text">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {org.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa: el logo ya viene optimizado del bucket
            <img src={org.logo.src} alt="" className="h-7 w-auto max-w-32 object-contain" />
          ) : (
            <span className="grid size-7 place-items-center rounded-md bg-accent font-display text-title-sm font-semibold text-on-accent">{org.name.replace(/^(La|El|Los|Las|Diario)\s+/i, "").charAt(0)}</span>
          )}
          {(!org.logo || theme.showName) && <span className="truncate font-display text-title-sm font-semibold">{org.name}</span>}
          <span className="ml-auto rounded-pill bg-accent px-2.5 py-1 font-sans text-caption font-semibold text-on-accent">Portada</span>
        </div>
        <div className="space-y-4 p-4">
          <div className="overflow-hidden rounded-lg bg-raised shadow-card">
            <div className="h-28 bg-surface-tint" style={{ backgroundImage: "url(/seed/photo-01.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="p-4">
              <span className="inline-flex rounded-pill bg-surface-tint px-2.5 py-0.5 font-sans text-caption font-semibold text-accent">Economía</span>
              <p className="mt-2 font-display text-title font-semibold leading-tight">El puerto amplía su terminal y reduce la espera</p>
              <p className="mt-1 font-serif text-body-sm text-text-muted">La obra empieza en enero y estará lista antes de la temporada alta.</p>
              <p className="mt-3 font-sans text-caption text-text-muted">
                <b className="text-text">Laura Méndez</b> · hace 2 h
              </p>
            </div>
          </div>
          <div className="flex gap-2 font-sans">
            <span className="rounded-pill bg-accent px-4 py-2 text-ui-sm font-semibold text-on-accent">Votar</span>
            <span className="rounded-pill border border-border bg-raised px-4 py-2 text-ui-sm font-semibold">Ver todo</span>
          </div>
        </div>
        <div className="bg-inverse px-4 py-3 font-sans text-caption text-on-inverse-muted">
          <span className="font-display text-ui font-semibold text-on-inverse">{org.name}</span> · pie de página
        </div>
      </div>
    </div>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {children}
    </Button>
  );
}

export function LogoForm({ org }: { org: OrgDetail }) {
  const [state, action] = useActionState<PlatformResult | null, FormData>(uploadLogo, null);
  const [preview, setPreview] = useState<{ src: string; w: number; h: number } | null>(null);
  const { flash, pending, run } = useRun();
  const form = useRef<HTMLFormElement>(null);

  // el tamaño real se lee en el navegador y viaja con el archivo
  function pick(file: File | undefined) {
    if (!file) return setPreview(null);
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setPreview({ src, w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }

  const current = preview?.src ?? org.logo?.src;
  return (
    <div className="space-y-3">
      <div className="grid h-24 place-items-center rounded-md border border-dashed border-border-input/50 bg-surface">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local antes de subir
          <img src={current} alt="Logo actual" className="max-h-16 max-w-56 object-contain" />
        ) : (
          <p className="text-ui-sm text-text-muted">Sin logo: se usa la inicial sobre el color principal.</p>
        )}
      </div>
      <form ref={form} action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="orgId" value={org.id} />
        <input type="hidden" name="width" value={preview?.w ?? ""} />
        <input type="hidden" name="height" value={preview?.h ?? ""} />
        <label className="press inline-flex h-10 cursor-pointer items-center gap-2 rounded-pill border border-border bg-raised px-4 text-ui font-semibold hover:border-text">
          <ImageUp className="size-4" aria-hidden />
          Elegir archivo
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {preview && <Submit>Subir logo</Submit>}
        {org.logo && !preview && (
          <Button type="button" variant="secondary" disabled={pending} icon={<Trash2 className="size-4" aria-hidden />} onClick={() => run(() => removeLogo(org.id))}>
            Quitar logo
          </Button>
        )}
      </form>
      <p className="text-caption text-text-muted">PNG con fondo transparente, máximo 2 MB. Se muestra a 36 px de alto.</p>
      <Flash result={state ?? flash} />
    </div>
  );
}

export function ContactForm({ org }: { org: OrgDetail }) {
  const [state, action] = useActionState<PlatformResult | null, FormData>(updateContact, null);
  const s = org.social;
  const c = org.contact;
  const net = [
    ["instagram", "Instagram", s.instagram],
    ["facebook", "Facebook", s.facebook],
    ["x", "X (Twitter)", s.x],
    ["youtube", "YouTube", s.youtube],
    ["tiktok", "TikTok", s.tiktok],
    ["whatsapp", "WhatsApp (enlace wa.me)", s.whatsapp],
  ] as const;
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="orgId" value={org.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        {net.map(([k, label, v]) => (
          <Field key={k} id={`red-${k}`} label={label}>
            <Input id={`red-${k}`} name={k} type="url" defaultValue={v ?? ""} placeholder="https://" />
          </Field>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="about" label="Sobre el medio" hint="Una o dos frases en el pie de página." className="sm:col-span-2">
          <Textarea id="about" name="about" rows={2} maxLength={400} defaultValue={c.about ?? ""} />
        </Field>
        <Field id="c-email" label="Correo de la redacción">
          <Input id="c-email" name="email" type="email" defaultValue={c.email ?? ""} />
        </Field>
        <Field id="c-phone" label="Teléfono">
          <Input id="c-phone" name="phone" defaultValue={c.phone ?? ""} maxLength={40} />
        </Field>
        <Field id="c-address" label="Dirección" className="sm:col-span-2">
          <Input id="c-address" name="address" defaultValue={c.address ?? ""} maxLength={160} />
        </Field>
      </div>
      <div className={cx("flex flex-wrap items-center gap-4")}>
        <Submit>Guardar redes y contacto</Submit>
        <Flash result={state} />
      </div>
    </form>
  );
}
