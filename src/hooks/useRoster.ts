import { useQuery } from "@tanstack/react-query";
import { getRoster } from "@/lib/request/getRoster";

export function useRoster() {
  return useQuery({
    queryKey: ["roster"],
    queryFn: getRoster,
  });
}
