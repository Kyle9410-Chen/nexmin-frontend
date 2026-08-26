import { api } from "@/lib/request/api";
import type { AddRosterMemberInput, RosterEntry } from "@/types/roster";

/**
 * Admin only. 409 means they are already on the list.
 *
 * The list written to is whichever one the backend's `google_group.login_group`
 * names, so the caller does not need to know its address.
 */
export function addRosterMember(
  input: AddRosterMemberInput,
): Promise<RosterEntry> {
  return api<RosterEntry>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
