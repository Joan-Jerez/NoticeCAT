import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(req: NextRequest) {
  // Solo desarrollo: ?org=costa fija el medio y ?como=user-redactor el usuario
  // del panel (este último solo sin Supabase), con cookies, y limpia la URL.
  if (process.env.NODE_ENV !== "production") {
    const org = req.nextUrl.searchParams.get("org");
    const como = req.nextUrl.searchParams.get("como");
    if (org || como) {
      const url = req.nextUrl.clone();
      url.searchParams.delete("org");
      url.searchParams.delete("como");
      const res = NextResponse.redirect(url);
      if (org) res.cookies.set("org", org, { path: "/" });
      if (como) res.cookies.set("dev-user", como, { path: "/" });
      if (org && !como) res.cookies.delete("dev-user");
      return res;
    }
  }

  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  // Refresca el token de Supabase si caducó y reescribe las cookies http-only.
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export const config = { matcher: ["/((?!_next|seed|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|xml)$).*)"] };
