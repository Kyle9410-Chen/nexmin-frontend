import { useQuery } from "@tanstack/react-query";
import { getMailingListGroups } from "@/lib/request/getMailingListGroups";
import type { MailingListGroup } from "@/types/mailingList";

export function useMailingListGroups(enabled = true) {
  return useQuery({
    queryKey: ["mailingList", "groups"],
    queryFn: getMailingListGroups,
    enabled,
  });
}

/**
 * Resolves a `group_key` from the URL back to its group.
 *
 * The backend addresses a group by email *or* by immutable ID interchangeably,
 * and compares addresses with `strings.EqualFold`, so this matches on email,
 * ID and aliases, case-insensitively. Returns undefined for an unknown key —
 * callers fall back to showing the raw key rather than blanking the page.
 */
export function findGroupByKey(
  groups: MailingListGroup[] | undefined,
  key: string,
): MailingListGroup | undefined {
  if (!groups || !key) return undefined;
  const needle = key.toLowerCase();

  return groups.find(
    (group) =>
      group.email.toLowerCase() === needle ||
      group.id.toLowerCase() === needle ||
      (group.aliases ?? []).some((alias) => alias.toLowerCase() === needle),
  );
}
