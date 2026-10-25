import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDefaultOrg, getOrgByHost, getOrgBySlug, getStaffUser, usingSupabase } from "./data";
import { getSessionUser } from "./auth";
import type { Organization, Role, StaffUser } from "./types";

// El medio sale del dominio (Host). En desarrollo, ?org=slug lo fija con una
// cookie (ver middleware.ts) para probar varios medios en localhost.
export const getCurrentOrg = cache(async (): Promise<Organization> => {
  const devSlug = process.env.NODE_ENV !== "production" ? (await cookies()).get("org")?.value : undefined;
  if (devSlug) {
    const org = await getOrgBySlug(devSlug);
    if (org) return org;
  }
  const host = (await headers()).get("host") ?? "";
  const org = await getOrgByHost(host);
  if (org) return org;
  if (process.env.NODE_ENV !== "production") return getDefaultOrg();
  notFound();
});

// Personal del medio actual. Con Supabase, la sesión real; sin él, en
// desarrollo se elige el usuario con la cookie dev-user (?como=user-redactor).
export const getCurrentStaff = cache(async (): Promise<{ user: StaffUser; role: Role } | null> => {
  const org = await getCurrentOrg();
  let userId: string | undefined;
  if (usingSupabase) userId = (await getSessionUser())?.id;
  else userId = (await cookies()).get("dev-user")?.value ?? (org.slug === "costa" ? "user-costa" : "user-editora");
  if (!userId) return null;
  const user = await getStaffUser(userId);
  const role = user?.memberships.find((m) => m.orgId === org.id)?.role;
  return user && role ? { user, role } : null;
});

export function canPublish(role: Role) {
  return role === "owner" || role === "admin" || role === "editor";
}
