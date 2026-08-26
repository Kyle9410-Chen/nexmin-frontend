import { api } from "@/lib/request/api";
import type { RosterResponse } from "@/types/roster";

/** Admin only: a member gets a 403 problem+json. */
export function getRoster(): Promise<RosterResponse> {
  return api<RosterResponse>("/api/users");
}
