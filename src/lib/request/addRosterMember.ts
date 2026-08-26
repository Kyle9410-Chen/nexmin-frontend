import { api } from "@/lib/request/api";
import type { AddRosterMemberInput, RosterEntry } from "@/types/roster";

/**
 * Admin only.
 *
 * The login group — whichever one the backend's `google_group.login_group`
 * names — is always written, so the caller does not need to know its address;
 * everything in `groups` goes on top of it. **Being on a list already is not an
 * error**: the request says where the person should end up, and that part of it
 * is simply already true. Keys and roles are validated before the first write,
 * but the writes themselves are not atomic — nothing is rolled back, and the
 * recovery is to send the identical request again, since every write is
 * idempotent.
 */
export function addRosterMember(
  input: AddRosterMemberInput,
): Promise<RosterEntry> {
  return api<RosterEntry>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
