"use client";

import { useActionState, useMemo, useState } from "react";
import { Ban, KeyRound, MailCheck, Plus, Search, ShieldCheck, Trash2, Unlock, UserPlus } from "lucide-react";
import { confirmEmail, createUser, deleteUser, removeMembership, sendPasswordReset, setBlocked, setMembership, type PlatformResult } from "@/app/plataforma/actions";
import { cx } from "@/lib/cx";
import { fmtDate } from "@/lib/format";
import type { UserRow } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Flash, useRun } from "./shared";

type Org = { id: string; name: string };
const roles = [
  ["owner", "Dueño"],
  ["admin", "Administración"],
  ["editor", "Edición"],
  ["writer", "Redacción"],
] as const;

function RoleOptions() {
  return roles.map(([v, l]) => (
    <option key={v} value={v}>
      {l}
    </option>
  ));
}

export function UserTable({ users, orgs, meId }: { users: UserRow[]; orgs: Org[]; meId: string }) {
  const [q, setQ] = useState("");
  const [onlyStaff, setOnlyStaff] = useState(false);
  const { flash, pending, run } = useRun();
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "Medio borrado";

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => (!onlyStaff || u.memberships.length > 0) && (!needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle)));
  }, [users, q, onlyStaff]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-64 flex-1">
          <span className="sr-only">Buscar por correo o nombre</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por correo o nombre" className="pl-9" />
        </label>
        <label className="flex items-center gap-2 text-ui">
          <input type="checkbox" checked={onlyStaff} onChange={(e) => setOnlyStaff(e.target.checked)} className="size-4 accent-accent" />
          Solo personal de medios
        </label>
        <p className="text-ui-sm text-text-muted">{shown.length} de {users.length}</p>
      </div>

      <Flash result={flash} />

      <ul className="space-y-3" aria-busy={pending || undefined}>
        {shown.map((u) => (
          <UserCard key={u.id} user={u} orgs={orgs} orgName={orgName} isMe={u.id === meId} pending={pending} run={run} />
        ))}
      </ul>
    </div>
  );
}

function UserCard({ user: u, orgs, orgName, isMe, pending, run }: { user: UserRow; orgs: Org[]; orgName: (id: string) => string; isMe: boolean; pending: boolean; run: (fn: () => Promise<PlatformResult>) => void }) {
  const free = orgs.filter((o) => !u.memberships.some((m) => m.orgId === o.id));
  const [addOrg, setAddOrg] = useState("");
  const [addRole, setAddRole] = useState("writer");
  // borrar pide un segundo clic
  const [arming, setArming] = useState(false);

  return (
    <li className={cx("rounded-lg bg-raised p-5 shadow-card", u.banned && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="truncate">{u.email}</span>
            {isMe && (
              <span className="eyebrow inline-flex items-center gap-1 rounded-pill bg-surface-tint px-2 py-0.5 text-accent">
                <ShieldCheck className="size-3" aria-hidden /> Tú
              </span>
            )}
            {!u.confirmed && <span className="eyebrow rounded-pill bg-warning-bg px-2 py-0.5 text-warning">Sin confirmar</span>}
            {u.banned && <span className="eyebrow rounded-pill bg-danger-bg px-2 py-0.5 text-danger">Bloqueado</span>}
          </p>
          <p className="mt-0.5 text-caption text-text-muted">
            <a href={`/plataforma/actividad?usuario=${u.id}`} className="font-semibold text-accent hover:underline">
              Ver actividad
            </a>
            {" · "}
            {u.name || "Sin nombre"} · alta {fmtDate(u.createdAt)} · último acceso {fmtDate(u.lastSignInAt)}
            {u.readerOf.length > 0 && ` · lector en ${u.readerOf.map(orgName).join(", ")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!u.confirmed && (
            <Button type="button" size="sm" variant="secondary" disabled={pending} icon={<MailCheck className="size-3.5" aria-hidden />} onClick={() => run(() => confirmEmail(u.id))}>
              Confirmar correo
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" disabled={pending} icon={<KeyRound className="size-3.5" aria-hidden />} onClick={() => run(() => sendPasswordReset(u.id))}>
            Enviar cambio de contraseña
          </Button>
          {!isMe && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              icon={u.banned ? <Unlock className="size-3.5" aria-hidden /> : <Ban className="size-3.5" aria-hidden />}
              onClick={() => run(() => setBlocked(u.id, !u.banned))}
            >
              {u.banned ? "Desbloquear" : "Bloquear"}
            </Button>
          )}
          {!isMe && (
            <Button
              type="button"
              size="sm"
              variant={arming ? "danger" : "secondary"}
              disabled={pending}
              onBlur={() => setArming(false)}
              icon={<Trash2 className="size-3.5" aria-hidden />}
              onClick={() => {
                if (!arming) return setArming(true);
                setArming(false);
                run(() => deleteUser(u.id));
              }}
            >
              {arming ? "¿Borrar la cuenta?" : "Borrar"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {u.memberships.length === 0 && <p className="text-ui-sm text-text-muted">No pertenece al equipo de ningún medio.</p>}
        {u.memberships.map((m) => (
          <div key={m.orgId} className="flex flex-wrap items-center gap-2 rounded-md bg-surface px-3 py-2">
            <span className="min-w-40 flex-1 text-ui">{orgName(m.orgId)}</span>
            <label className="sr-only" htmlFor={`rol-${u.id}-${m.orgId}`}>
              Rol en {orgName(m.orgId)}
            </label>
            {/* el ancho va en el contenedor: el campo base trae w-full */}
            <div className="w-44">
              <Select id={`rol-${u.id}-${m.orgId}`} value={m.role} disabled={pending} onChange={(e) => run(() => setMembership(u.id, m.orgId, e.target.value))} className="h-9">
                <RoleOptions />
              </Select>
            </div>
            <button
              type="button"
              aria-label={`Quitar de ${orgName(m.orgId)}`}
              title="Quitar del equipo"
              disabled={pending}
              onClick={() => run(() => removeMembership(u.id, m.orgId))}
              className="press grid size-9 place-items-center rounded-full text-text-muted hover:bg-danger-bg hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ))}

        {free.length > 0 && (
          <form
            className="flex flex-wrap items-center gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!addOrg) return;
              run(() => setMembership(u.id, addOrg, addRole));
              setAddOrg("");
            }}
          >
            <label className="sr-only" htmlFor={`medio-${u.id}`}>
              Añadir a un medio
            </label>
            <div className="min-w-40 flex-1">
              <Select id={`medio-${u.id}`} value={addOrg} onChange={(e) => setAddOrg(e.target.value)} className="h-9">
                <option value="">Añadir a un medio…</option>
                {free.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
            <label className="sr-only" htmlFor={`nuevo-rol-${u.id}`}>
              Rol
            </label>
            <div className="w-44">
              <Select id={`nuevo-rol-${u.id}`} value={addRole} onChange={(e) => setAddRole(e.target.value)} className="h-9">
                <RoleOptions />
              </Select>
            </div>
            <Button type="submit" size="sm" variant="secondary" disabled={!addOrg || pending} icon={<Plus className="size-3.5" aria-hidden />}>
              Añadir
            </Button>
          </form>
        )}
      </div>
    </li>
  );
}

export function CreateUserForm() {
  const [state, action] = useActionState<PlatformResult | null, FormData>(createUser, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <Field id="nu-email" label="Correo">
        <Input id="nu-email" name="email" type="email" required autoComplete="off" />
      </Field>
      <Field id="nu-name" label="Nombre">
        <Input id="nu-name" name="name" maxLength={80} autoComplete="off" />
      </Field>
      <Field id="nu-password" label="Contraseña" hint="Vacía: le llega una invitación para elegirla.">
        <Input id="nu-password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
        <Button type="submit" icon={<UserPlus className="size-4" aria-hidden />}>
          Crear cuenta
        </Button>
        <Flash result={state} />
      </div>
    </form>
  );
}
