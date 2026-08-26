import { api } from "@/lib/request/api";
import type {
  MailingListMember,
  UpdateMemberRoleInput,
} from "@/types/mailingList";

/** Admin-only on the backend: a non-admin caller gets a 403 problem+json. */
export function updateMailingListMemberRole({
  groupKey,
  memberKey,
  role,
}: UpdateMemberRoleInput): Promise<MailingListMember> {
  // Both keys are email addresses, so both have to be encoded; Go's ServeMux
  // un-escapes the path wildcards on the way back out.
  return api<MailingListMember>(
    `/api/groups/${encodeURIComponent(groupKey)}/members/${encodeURIComponent(memberKey)}`,
    { method: "PATCH", body: JSON.stringify({ role }) },
  );
}
