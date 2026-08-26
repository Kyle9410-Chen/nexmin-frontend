// Shapes for the caller's own account, from GET/PATCH /api/users/me. These are
// the backend's real `internal/user.Response`. Note `/users` returns something
// different — the club roster, see `types/roster.ts`.

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  nickname: string;
  department: string;
  /**
   * "admin" or "member", recomputed from the login mailing list on every read,
   * so it can be fresher than the JWT's own `role` claim.
   */
  role: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Mailing lists this user reaches, direct and nested. Populated **only** on
   * `/users/me` — filling it on the list routes would cost one Google call per
   * user — and `null` means "could not be determined", which is different from
   * `[]`. For the full shape with sections and nesting paths, see
   * `types/membership.ts` and `GET /api/users/me/groups`.
   */
  groups: string[] | null;
}

/**
 * PATCH /api/users/me. A partial update: an omitted key is left as it is, so
 * only the fields that actually changed are worth sending. `nickname` and
 * `department` may be cleared with "", but `name` may not.
 */
export interface UpdateProfileInput {
  name?: string;
  nickname?: string;
  department?: string;
}

/**
 * Length limits, mirrored from the backend's `internal/user/profile.go`, which
 * is the authority. Counted in runes there, so count code points here.
 */
export const MaxNameLength = 100;
export const MaxNicknameLength = 50;
export const MaxDepartmentLength = 100;
