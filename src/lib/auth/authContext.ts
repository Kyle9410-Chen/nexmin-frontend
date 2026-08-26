import { createContext, useContext } from "react";

export interface AuthContextValue {
  /** Raw access JWT, or null when there is none stored. */
  accessToken: string | null;
  /**
   * Whether there is a live session. Tracks the **refresh** token, not the
   * access token: access tokens expire after 15 minutes, so gating on one
   * would eject a signed-in user every quarter hour.
   */
  isAuthenticated: boolean;
  /** Reason from the OAuth callback's `#error=…`, for the login dialog. */
  loginError: string | null;
  /** Full-page redirect into the backend's Google OAuth flow. */
  login: (redirectTo?: string) => void;
  logout: () => void;
  /** True while a token refresh is in flight. */
  isRefreshing: boolean;
}

export const authContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(authContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
