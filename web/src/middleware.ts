import { NextResponse, type NextRequest } from "next/server";

// Solo desarrollo: ?org=costa fija el medio y ?como=user-redactor el usuario
// del panel, con cookies, y limpia la URL.
export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.next();
  const org = req.nextUrl.searchParams.get("org");
  const como = req.nextUrl.searchParams.get("como");
  if (!org && !como) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete("org");
  url.searchParams.delete("como");
  const res = NextResponse.redirect(url);
  if (org) res.cookies.set("org", org, { path: "/" });
  if (como) res.cookies.set("dev-user", como, { path: "/" });
  if (org && !como) res.cookies.delete("dev-user");
  return res;
}

export const config = { matcher: ["/((?!_next|seed|favicon.ico).*)"] };
