import { api } from "@/lib/request/api";
import type { TokenResponse } from "@/types/auth";

/**
 * The refresh token goes in the body rather than the URL so it stays out of
 * access logs and `Referer` headers. The backend rotates on every use: the
 * presented token is invalidated once its replacement exists.
 */
export function refreshAuthToken(refreshToken: string): Promise<TokenResponse> {
  if (!refreshToken) {
    return Promise.reject(new Error("No refresh token to refresh with"));
  }

  return api<TokenResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
