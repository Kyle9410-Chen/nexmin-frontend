import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useCookies } from "react-cookie";
import { useMutation } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { authContext, type AuthContextValue } from "@/lib/auth/authContext";
import { refreshAuthToken } from "@/lib/request/refreshAuthToken";
import { logoutRequest } from "@/lib/request/logoutRequest";
import { REFRESH_TOKEN_TTL_MS } from "@/lib/token";
import type { AccessTokenClaims, TokenResponse } from "@/types/auth";

/** Refresh this far before expiry, so a slow request still lands in time. */
const REFRESH_LEEWAY_MS = 60_000;

/** setTimeout treats anything larger as 1ms, which would spin. */
const MAX_TIMEOUT_MS = 2_147_483_647;

interface AuthProviderProps {
  /**
   * Reason left by the OAuth callback's `#error=…`, read by
   * `consumeAuthFragment` before React mounted.
   */
  loginError?: string | null;
  children: ReactNode;
}

export function AuthProvider({
  loginError = null,
  children,
}: AuthProviderProps) {
  const [cookies, setCookie, removeCookie] = useCookies([
    "accessToken",
    "refreshToken",
  ]);
  const accessToken: string | null = cookies.accessToken ?? null;
  const refreshToken: string | null = cookies.refreshToken ?? null;

  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  const setSession = useCallback(
    (data: TokenResponse) => {
      // The JWT's own `exp` is authoritative over the reported `expiresIn`.
      const { exp } = jwtDecode<AccessTokenClaims>(data.accessToken);
      setCookie("accessToken", data.accessToken, {
        path: "/",
        expires: exp ? new Date(exp * 1000) : undefined,
      });
      // The refresh token is an opaque row ID, not a JWT — its lifetime comes
      // from the backend constant mirrored in lib/token.ts.
      setCookie("refreshToken", data.refreshToken, {
        path: "/",
        expires: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      });
    },
    [setCookie],
  );

  const clearSession = useCallback(() => {
    clearTimer();
    removeCookie("accessToken", { path: "/" });
    removeCookie("refreshToken", { path: "/" });
  }, [clearTimer, removeCookie]);

  const refresh = useMutation({
    mutationFn: () => refreshAuthToken(refreshToken ?? ""),
    onMutate: () => {
      inFlight.current = true;
    },
    onSuccess: setSession,
    onError: () => {
      // Refresh tokens rotate on use, so a rejection means this one is spent,
      // revoked or expired. There is no way back without a new sign-in.
      clearSession();
      toast.error("Your session expired. Please sign in again.");
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const startRefresh = refresh.mutate;

  useEffect(() => {
    clearTimer();
    if (!refreshToken || inFlight.current) return;

    let delay = 0;
    if (accessToken) {
      try {
        const { exp } = jwtDecode<AccessTokenClaims>(accessToken);
        if (exp) delay = exp * 1000 - Date.now() - REFRESH_LEEWAY_MS;
      } catch {
        // An undecodable cookie is no better than none; replace it now.
        delay = 0;
      }
    }

    // A missing, expired, or nearly-expired access token clamps to 0 and
    // refreshes immediately — this is what restores a session on a fresh page
    // load. It assumes the backend's access token lifetime (15 min) comfortably
    // exceeds REFRESH_LEEWAY_MS; a shorter one would refresh in a tight loop.
    delay = Math.min(Math.max(delay, 0), MAX_TIMEOUT_MS);

    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      startRefresh();
    }, delay);

    return clearTimer;
  }, [accessToken, refreshToken, startRefresh, clearTimer]);

  const login = useCallback((redirectTo?: string) => {
    const target =
      redirectTo ?? `${window.location.pathname}${window.location.search}`;
    // A full-page navigation, not a fetch: the endpoint 302s to Google, which
    // no cross-origin request could follow. `redirect` is signed into the OAuth
    // state and handed back in the callback fragment.
    window.location.href = `${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/google/login?redirect=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(() => {
    // Fired before the cookies are dropped, since api() reads the access token
    // to authorize the call. Best-effort: a session the backend already
    // considers dead must still clear locally.
    logoutRequest().catch(() => {});
    clearSession();
    toast.info("Signed out");
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: !!refreshToken,
      loginError,
      login,
      logout,
      isRefreshing: refresh.isPending,
    }),
    [accessToken, refreshToken, loginError, login, logout, refresh.isPending],
  );

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
