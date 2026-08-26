// Shapes returned by GET /api/groups/{group_key}/members, which the backend
// proxies from the Google Workspace Admin SDK (its `internal/googlegroup`).

/**
 * What this service knows about a member beyond their address. Nested rather
 * than flattened so that `null` — never signed in here — stays distinct from a
 * member who signed in and left every field blank.
 */
export interface MemberProfile {
  name: string;
  nickname: string;
  department: string;
}

/** One member of a Google group. Mirrors the backend's `MemberResponse`. */
export interface MailingListMember {
  id: string;
  email: string;
  /**
   * Whatever the Directory API returned — normally one of
   * `MailingListMemberRole`, but left wide so an unfamiliar value still renders
   * instead of failing to type-check.
   */
  role: string;
  type: string;
  /**
   * Membership status. **An empty string is normal**: the Directory API only
   * fills this in for identities inside the Workspace account, so every member
   * from an outside domain — most of the club — reports `""`.
   */
  status: string;
  /** `null` when this address has never signed in here. */
  profile: MemberProfile | null;
}

/**
 * The backend's `ListMembersResponse`. Deliberately **not**
 * `PaginatedResponse<T>` — the Directory API is not paged through here, so
 * there is no page, size or hasNextPage, only a count.
 */
export interface MailingListMembersResponse {
  items: MailingListMember[];
  totalItems: number;
}

/**
 * Where a mailing list sits in the club's structure, from the backend's
 * `internal/orgchart`. A list the chart does not mention reports the synthetic
 * `unsectioned` section rather than being left out — a newly created group has
 * to be visible before anyone can classify it.
 */
export interface MailingListSection {
  key: string;
  name: string;
}

/** One Google group. Mirrors the backend's `GroupResponse`. */
export interface MailingListGroup {
  id: string;
  email: string;
  /** The name set in the Google admin console, `NYCU SDC ` prefix and all. */
  name: string;
  /** The club's own name for this list, falling back to the bare group name. */
  displayName: string;
  section: MailingListSection;
  description: string;
  directMembersCount: number;
  /**
   * A Go nil slice marshals to `null`, not `[]`, so an alias-less group sends
   * `"aliases": null`. Always read this through `?? []`.
   */
  aliases: string[] | null;
  adminCreated: boolean;
}

/**
 * The backend's `ListGroupsResponse`. Like the members envelope, deliberately
 * **not** `PaginatedResponse<T>`: `GET /api/groups` accepts no query params and
 * returns every group at once, so there is nothing to page through.
 */
export interface MailingListGroupsResponse {
  items: MailingListGroup[];
  totalItems: number;
}

// =========================
// Member roles
//
// The three roles the Directory API accepts, mirroring the backend's
// `internal/googlegroup` constants. Its `NormalizeRole` compares
// case-insensitively and rejects anything else with a 400.
// =========================
export const MemberRoleOwner = "OWNER";
export const MemberRoleManager = "MANAGER";
export const MemberRoleMember = "MEMBER";

export const MemberRoles = [
  MemberRoleOwner,
  MemberRoleManager,
  MemberRoleMember,
] as const;

export type MailingListMemberRole = (typeof MemberRoles)[number];

export const MEMBER_ROLE_OPTIONS: {
  id: MailingListMemberRole;
  label: string;
}[] = [
  { id: MemberRoleOwner, label: "Owner" },
  { id: MemberRoleManager, label: "Manager" },
  { id: MemberRoleMember, label: "Member" },
];

/** PATCH /api/groups/{group_key}/members/{member_key} */
export interface UpdateMemberRoleInput {
  groupKey: string;
  /** The member's email, or their immutable ID — the API takes either. */
  memberKey: string;
  role: MailingListMemberRole;
}
