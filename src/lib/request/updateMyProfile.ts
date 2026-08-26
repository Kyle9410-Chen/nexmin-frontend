import { api } from "@/lib/request/api";
import type { UpdateProfileInput, UserProfile } from "@/types/profile";

export function updateMyProfile(
  input: UpdateProfileInput,
): Promise<UserProfile> {
  return api<UserProfile>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
