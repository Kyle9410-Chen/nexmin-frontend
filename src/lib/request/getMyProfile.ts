import { api } from "@/lib/request/api";
import type { UserProfile } from "@/types/profile";

export function getMyProfile(): Promise<UserProfile> {
  return api<UserProfile>("/api/users/me");
}
