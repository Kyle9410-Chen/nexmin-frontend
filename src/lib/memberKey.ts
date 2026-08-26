import type { MailingListMember } from "@/types/mailingList";

/**
 * The Directory API accepts a member's email or their immutable ID as the key.
 * Email is what the row shows; the fallback covers a CUSTOMER-type member,
 * which is a whole domain and has none.
 */
export function memberKeyOf(member: MailingListMember): string {
  return member.email || member.id;
}

/**
 * One person's role in a group's member list, or `undefined` when they are not
 * in it — which is different from being a plain MEMBER, and is what lets a
 * caller avoid sending a role change it cannot justify.
 *
 * Addresses are compared case-insensitively: the backend compares with
 * `strings.EqualFold` and Google is not consistent about case.
 */
export function roleInGroup(
  members: MailingListMember[],
  email: string,
): string | undefined {
  const wanted = email.toLowerCase();
  return members.find((m) => memberKeyOf(m).toLowerCase() === wanted)?.role;
}
