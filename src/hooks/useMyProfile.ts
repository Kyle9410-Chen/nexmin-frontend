import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/request/getMyProfile";

export function useMyProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: getMyProfile,
  });
}
