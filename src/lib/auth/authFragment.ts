import { jwtDecode } from "jwt-decode";
import {
  REFRESH_TOKEN_TTL_MS,
  setAccessToken,
  setRefreshToken,
} from "@/lib/token";
import type { AccessTokenClaims } from "@/types/auth";

export interface AuthFragmentResult {
  /** A backend `#error=<reason>`, or null when there was nothing to consume. */
  error: string | null;
}

/**
 * Consumes the tokens the OAuth callback leaves in the URL fragment.
 *
 * The backend redirects to its configured `frontend_url` — the bare root, not a
 * dedicated callback route — with everything after a `#`:
 *
 *   {frontend_url}#accessToken=<jwt>&refreshToken=<uuid>&expiresIn=900&redirect=<path>
 *
 * Fragments are never sent to servers, which is exactly why the tokens travel
 * there: they stay out of access logs, `Referer` headers and proxy records.
 *
 * Called synchronously from `main.tsx` **before React mounts**, not from an
 * effect. Doing it in an effect would flash the login dialog for a frame and
 * could let a protected page fire queries before the token exists. It writes
 * cookies through `lib/token.ts` rather than `CookiesProvider`, so the very
 * first render already sees a session.
 */
export function consumeAuthFragment(): AuthFragmentResult {
  const hash = window.location.hash.slice(1);
  if (!hash) return { error: null };

  const params = new URLSearchParams(hash);
  const accessToken = params.get("accessToken");
  const error = params.get("error");

  // An ordinary `#section` anchor must survive untouched.
  if (!accessToken && !error) return { error: null };

  if (error) {
    window.history.replaceState(null, "", "/");
    return { error };
  }

  const refreshToken = params.get("refreshToken");
  if (!accessToken || !refreshToken) {
    window.history.replaceState(null, "", "/");
    return { error: "server_error" };
  }

  try {
    const { exp } = jwtDecode<AccessTokenClaims>(accessToken);
    setAccessToken(accessToken, exp ? new Date(exp * 1000) : undefined);
  } catch {
    // A fragment we cannot decode is not a session; fail to the login dialog
    // rather than storing a token every request would then 401 on.
    window.history.replaceState(null, "", "/");
    return { error: "server_error" };
  }

  setRefreshToken(refreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));

  // `redirect` round-tripped through the signed OAuth state, so it is the path
  // the user asked for before being sent to Google.
  const redirect = params.get("redirect");
  window.history.replaceState(null, "", redirect || "/");
  return { error: null };
}
