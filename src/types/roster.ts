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

/** One mailing list to put a new member on, and the role to give them there. */
export interface AddRosterMemberGroup {
  /**
   * Bare group name, full address, alias or immutable ID — every spelling the
   * group routes accept. A key naming no list in the account is rejected with
   * 400, **before anything is written**.
   */
  key: string;
  /** The role on **that list**, not this service's. Omit for MEMBER. */
  role?: MailingListMemberRole;
}

/**
 * POST /api/users — add someone to the club, and to whichever lists they should
 * be on.
 *
 * There is no local account to create: the login mailing list decides who
 * exists, so adding them to it is the whole operation, and a local row appears
 * by itself when they first sign in.
 */
export interface AddRosterMemberInput {
  email: string;
  /**
   * The lists to put them on **beyond the login group**, which is always
   * written and does not have to be named — callers do not need to know its
   * address. Omit, or send `[]`, for the login group alone.
   *
   * Naming the login group anyway is how a role is set on it: `MANAGER` or
   * `OWNER` there maps onto this service's `admin`, so listing it that way
   * **grants administrative access**. Which list that is stays the backend's
   * business, so this side cannot tell which entry does it.
   *
   * Listing one list twice, or a key that resolves to nothing, is a 400 — and
   * every key is checked before the first write, so a typo costs nothing.
   */
  groups?: AddRosterMemberGroup[];
}
