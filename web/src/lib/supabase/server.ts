import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Tres clientes, cada uno con su nivel de acceso:
// - publicClient: anónimo, sin sesión. Las páginas públicas: RLS solo deja ver lo publicado.
// - sessionClient: con la sesión del usuario (cookies). Panel y cuenta: RLS por rol.
// - serviceClient: service role, salta RLS. Solo para votos, límites de uso y borrar cuentas.

export const supabaseEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name} (ver .env.example).`);
  return v;
}

let anon: SupabaseClient | null = null;
export function publicClient() {
  anon ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anon;
}

export async function sessionClient() {
  const jar = await cookies();
  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // en un Server Component no se pueden escribir cookies; el middleware refresca la sesión
        }
      },
    },
  });
}

let service: SupabaseClient | null = null;
export function serviceClient() {
  service ??= createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return service;
}
