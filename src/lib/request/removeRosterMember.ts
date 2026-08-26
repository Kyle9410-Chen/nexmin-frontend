import { api } from "@/lib/request/api";

/**
 * Admin only. Answers 204, which `api()` already special-cases.
 *
 * Takes them off **every** list they are on, not just the login group — that
 * one alone would end their access while leaving them on the lists that carry
 * the club's mail. Idempotent: an address on none of them is still a 204, so
 * there is no "not a member" case to translate here. A 404 means the login
 * group itself could not be found, which points at the backend's
 * `google_group.login_group` being misconfigured.
 *
 * Addressed by email rather than the UUID `GET /api/users/{user_id}` takes:
 * someone who has never signed in has no local row, and therefore no UUID.
 */
export function removeRosterMember(email: string): Promise<unknown> {
  return api(`/api/users/${encodeURIComponent(email)}`, { method: "DELETE" });
}
