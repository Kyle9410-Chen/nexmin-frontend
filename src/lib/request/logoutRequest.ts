import { api } from "@/lib/request/api";

/**
 * Revokes every refresh token belonging to the caller. Outstanding access
 * tokens stay valid until they expire — inherent to stateless JWTs, with the
 * 15-minute lifetime as the mitigation.
 */
export function logoutRequest(): Promise<unknown> {
  return api("/api/auth/logout", { method: "POST" });
}
