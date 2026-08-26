// Shapes returned by GET /api/users, defined in the backend's
// `docs/api/service/user.tsp`. Despite the path this is the **club roster**, not
// a user table: the login mailing list decides who exists, and the local `users`
// row — when there is one — only supplies the profile they filled in here.

import type { MailingListMemberRole } from "@/types/mailingList";

/** What this service knows about someone beyond their membership. */
export interface RosterProfile {
  id: string;
  name: string;
  nickname: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

/** One person on the club roster. */
export interface RosterEntry {
  email: string;
  /** Derived from the login mailing list, live on every read. */
  role: string;
  /**
   * The lists this person reaches, **direct and nested**. There is no per-entry
   * `direct` flag, so a list reached only through a nested group is
   * indistinguishable here — which is why removing one can fail. Always
   * populated, unlike `UserProfile.groups`.
   */
  groups: string[];
  /** `null` for someone on the mailing list who has never signed in here. */
  profile: RosterProfile | null;
}

/** Like the mailing list envelopes, deliberately not `PaginatedResponse<T>`. */
export interface RosterResponse {
  items: RosterEntry[];
  totalItems: number;
}

/**
 * POST /api/users — add someone to the club.
 *
 * There is no local account to create: the login mailing list decides who
 * exists, so adding them to it is the whole operation, and a local row appears
 * by itself when they first sign in.
 */
export interface AddRosterMemberInput {
  email: string;
  /**
   * The role on the **login mailing list**, not this service's role. Omit for
   * MEMBER. `MANAGER` and `OWNER` there map onto this service's `admin`, so
   * either one **grants administrative access**.
   */
  role?: MailingListMemberRole;
}
