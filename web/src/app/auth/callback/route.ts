import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { audit } from "@/lib/audit";
import { safeNext } from "@/lib/auth";
import { getCurrentOrg } from "@/lib/org";
import { sessionClient, supabaseEnabled } from "@/lib/supabase/server";

// Vuelta de los enlaces de email (confirmar cuenta, recuperar contraseña) y de OAuth.
// Canjea el código por una sesión en cookie http-only y manda a "siguiente".
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("siguiente"));
  const fail = NextResponse.redirect(new URL("/cuenta/entrar?error=enlace", url));
  if (!supabaseEnabled) return fail;

  const db = await sessionClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const { data, error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await db.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: { user: null }, error: new Error("sin código") };
  if (error || !data.user) return fail;

  const org = await getCurrentOrg();
  await db
    .from("readers")
    .upsert({ org_id: org.id, user_id: data.user.id, display_name: (data.user.user_metadata?.name as string | undefined) ?? null }, { onConflict: "org_id,user_id", ignoreDuplicates: true });
  const how = code ? "con Google, Facebook o un enlace" : type === "recovery" ? "con un enlace para cambiar la contraseña" : type === "invite" ? "aceptando una invitación" : "confirmando su correo";
  await audit({ action: "auth.signin_link", summary: `Entró ${how}`, actor: { id: data.user.id, email: data.user.email ?? "" }, orgId: org.id, details: { type: type ?? "code" } });
  return NextResponse.redirect(new URL(next, url));
}
