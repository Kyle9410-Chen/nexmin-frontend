import { api } from "@/lib/request/api";
import type { MyGroupsResponse } from "@/types/membership";

export function getMyGroups(): Promise<MyGroupsResponse> {
  return api<MyGroupsResponse>("/api/users/me/groups");
}
