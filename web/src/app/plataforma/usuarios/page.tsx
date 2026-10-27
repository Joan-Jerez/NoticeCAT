import type { Metadata } from "next";
import { getPlatformAdmin, listOrgs, listUsers } from "@/lib/platform";
import { CreateUserForm, UserTable } from "@/components/platform/user-table";
import { Panel } from "@/components/platform/shared";

export const metadata: Metadata = { title: "Usuarios" };

export default async function PlatformUsers() {
  const [users, orgs, me] = await Promise.all([listUsers(), listOrgs(), getPlatformAdmin()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-heading-lg font-semibold">Usuarios</h1>
        <p className="mt-1 text-ui text-text-muted">
          Cuentas de Supabase Auth con su rol en cada medio. Los cambios se aplican al momento; bloquear impide entrar sin borrar nada.
        </p>
      </header>
      <Panel title="Nueva cuenta" description="Después de crearla, dale un rol en un medio desde su tarjeta.">
        <CreateUserForm />
      </Panel>
      <UserTable users={users} orgs={orgs.map((o) => ({ id: o.id, name: o.name }))} meId={me!.id} />
    </div>
  );
}
