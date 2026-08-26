import { useQueries, useQuery } from "@tanstack/react-query";
import { getMailingListMembers } from "@/lib/request/getMailingListMembers";

function membersQuery(groupKey: string) {
  return {
    queryKey: ["mailingList", groupKey, "members"],
    queryFn: () => getMailingListMembers(groupKey),
  };
}

export function useMailingListMembers(groupKey: string, enabled = true) {
  return useQuery({
    ...membersQuery(groupKey),
    enabled: !!groupKey && enabled,
  });
}

/**
 * The member lists of several groups at once, for resolving one person's role in
 * each of them.
 *
 * Same query keys as the single-group hook, so these share cache entries with
 * the members page; on the backend they hit the same member cache the roster
 * itself is built from, so a warm server answers without calling Google.
 */
export function useMailingListMembersFor(groupKeys: string[], enabled = true) {
  return useQueries({
    queries: groupKeys.map((groupKey) => ({
      ...membersQuery(groupKey),
      enabled,
    })),
  });
}
