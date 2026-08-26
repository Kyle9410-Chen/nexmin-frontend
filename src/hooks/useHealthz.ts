import { useQuery } from "@tanstack/react-query";
import { getHealthz } from "@/lib/request/getHealthz";

export function useHealthz() {
  return useQuery({
    queryKey: ["healthz"],
    queryFn: getHealthz,
  });
}
