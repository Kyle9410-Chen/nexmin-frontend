import { api } from "@/lib/request/api";
import type { MailingListMembersResponse } from "@/types/mailingList";

export function getMailingListMembers(
  groupKey: string,
): Promise<MailingListMembersResponse> {
  // `group_key` may be an email address or Google's immutable group ID, so it
  // has to be encoded.
  return api<MailingListMembersResponse>(
    `/api/groups/${encodeURIComponent(groupKey)}/members`,
  );
}
