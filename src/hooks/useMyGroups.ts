import { useQuery } from "@tanstack/react-query";
import { getMyGroups } from "@/lib/request/getMyGroups";

export function useMyGroups() {
  return useQuery({
    // Namespaced under the profile domain, so invalidating ["profile"] covers
    // this too.
    queryKey: ["profile", "me", "groups"],
    queryFn: getMyGroups,
  });
}
