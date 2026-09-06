import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  const authCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(isSupabaseAuthCookie);

  // A public visitor without a Supabase session does not need an Auth
  // network request on every page load.
  if (authCookieNames.length === 0) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // Validate/refresh the session only when auth cookies actually exist.
    await supabase.auth.getClaims();
  } catch (error) {
    const status = getAuthErrorStatus(error);
    const code = getAuthErrorCode(error);

    // A stale browser session is common after a Supabase project has been
    // paused/restored. Remove only Supabase auth cookies and continue as a
    // signed-out visitor.
    if (
      status === 400 ||
      code === "refresh_token_not_found" ||
      code === "refresh_token_already_used"
    ) {
      authCookieNames.forEach((name) => {
        request.cookies.delete(name);

        supabaseResponse.cookies.set({
          name,
          value: "",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
      });
    }

    // For temporary upstream problems (for example 502 while Supabase is
    // restoring), do not break public pages. The session can be retried on
    // the next request after Supabase is healthy again.
  }

  return supabaseResponse;
}

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("auth-token");
}

function getAuthErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return null;
}

function getAuthErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return null;
}
