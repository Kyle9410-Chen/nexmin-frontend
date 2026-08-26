import { api } from "@/lib/request/api";
import {
  MemberRoleMember,
  type MailingListMember,
  type MailingListMemberRole,
} from "@/types/mailingList";

export interface AddGroupMemberInput {
  groupKey: string;
  email: string;
  role?: MailingListMemberRole;
}

/** Admin only. 409 when the address is already on the list. */
export function addGroupMember({
  groupKey,
  email,
  role = MemberRoleMember,
}: AddGroupMemberInput): Promise<MailingListMember> {
  return api<MailingListMember>(
    `/api/groups/${encodeURIComponent(groupKey)}/members`,
    { method: "POST", body: JSON.stringify({ email, role }) },
  );
}
