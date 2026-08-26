import { api } from "@/lib/request/api";

/**
 * Admin only. Answers 204, which `api()` already special-cases.
 *
 * Addressed by email rather than the UUID `GET /api/users/{user_id}` takes:
 * someone who has never signed in has no local row, and therefore no UUID.
 */
export function removeRosterMember(email: string): Promise<unknown> {
  return api(`/api/users/${encodeURIComponent(email)}`, { method: "DELETE" });
}
