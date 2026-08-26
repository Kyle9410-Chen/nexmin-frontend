import { api } from "@/lib/request/api";

export interface RemoveGroupMemberInput {
  groupKey: string;
  /** The member's email, or their immutable ID — the API takes either. */
  memberKey: string;
}

/**
 * Admin only. Answers 204, which `api()` already special-cases.
 *
 * 404 means the address is not a **direct** member of that list — someone who
 * only reaches it through a nested group cannot be removed from it.
 */
export function removeGroupMember({
  groupKey,
  memberKey,
}: RemoveGroupMemberInput): Promise<unknown> {
  return api(
    `/api/groups/${encodeURIComponent(groupKey)}/members/${encodeURIComponent(memberKey)}`,
    { method: "DELETE" },
  );
}
