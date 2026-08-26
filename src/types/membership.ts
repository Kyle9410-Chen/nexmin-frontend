// Shapes returned by GET /api/users/me/groups, defined in the backend's
// `docs/api/service/user.tsp` and served by `internal/membership`. Everything
// here comes from Google with nothing to degrade to, so an unconfigured
// Directory API answers 503 rather than an empty list.

/** The officer responsible for a list, from the club's org chart. */
export interface MembershipOfficerRole {
  key: string;
  name: string;
}

/** One mailing list the caller reaches. */
export interface MembershipItem {
  /** Bare group name — usable directly as `group_key` on the group routes. */
  key: string;
  /** Display name from the org chart, falling back to `key`. */
  name: string;
  memberCount: number;
  /** True when the caller is listed on this group themselves. */
  direct: boolean;
  /**
   * The chain of groups walked to reach this one, stopping short of it.
   * `null` when `direct` — Google reports direct membership only, so this
   * expansion is what makes an otherwise surprising entry explainable.
   */
  via: string[] | null;
  /** `null` for a list no officer owns. */
  ownerRole: MembershipOfficerRole | null;
}

export interface MembershipSection {
  key: string;
  name: string;
  items: MembershipItem[];
}

export interface MyGroupsResponse {
  /** In organizational order; anything unclassified lands in `unsectioned`. */
  sections: MembershipSection[];
  totalItems: number;
  /**
   * Whether the caller holds an officer position — but **not** which one. All
   * six office holders are MANAGER of every department group, so Google cannot
   * tell the positions apart.
   */
  leadership: boolean;
}
