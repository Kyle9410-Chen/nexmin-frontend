import { useQuery } from "@tanstack/react-query";
import { gravatarUrl } from "@/lib/gravatar";

/**
 * A digest is not server state, but `crypto.subtle` is async and this repo does
 * not reach for `useEffect` — so the hashing rides on the query client, which
 * also memoizes it. The result never goes stale: the same address always hashes
 * to the same URL.
 */
export function useGravatarUrl(email: string, size = 160) {
  return useQuery({
    queryKey: ["gravatar", email, size],
    queryFn: () => gravatarUrl(email, size),
    enabled: !!email,
    staleTime: Infinity,
  });
}
