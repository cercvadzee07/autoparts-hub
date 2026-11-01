import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, isLocale } from "@/i18n/config";

/** Keeps the Supabase auth cookie fresh (only when Supabase is configured). */
async function refreshSupabaseSession(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  await supabase.auth.getUser();
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];

  // Georgian is the main language: unprefixed URLs always open in Georgian,
  // regardless of browser language. Visitors switch with the language picker.
  if (!isLocale(first)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Only admin pages need an auth session; skip the round trip for shoppers.
  if (pathname.startsWith(`/${first}/admin`)) await refreshSupabaseSession(req, res);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|parts|images|favicon.ico|icon|apple-icon|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)"],
};
