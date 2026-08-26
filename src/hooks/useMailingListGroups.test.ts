import { describe, expect, it } from "vitest";
import { findGroupByKey } from "@/hooks/useMailingListGroups";
import type { MailingListGroup } from "@/types/mailingList";

function group(overrides: Partial<MailingListGroup> = {}): MailingListGroup {
  return {
    id: "gid-1",
    email: "all@sdc.nycu.club",
    name: "NYCU SDC All Members",
    displayName: "All Members",
    section: { key: "all", name: "All Members Section" },
    description: "",
    directMembersCount: 3,
    aliases: null,
    adminCreated: true,
    ...overrides,
  };
}

describe("findGroupByKey", () => {
  const groups = [
    group(),
    group({
      id: "gid-2",
      email: "core@sdc.nycu.club",
      name: "Core Team",
      aliases: ["board@sdc.nycu.club"],
    }),
  ];

  it("matches on email", () => {
    expect(findGroupByKey(groups, "core@sdc.nycu.club")?.name).toBe(
      "Core Team",
    );
  });

  it("matches on the immutable id, which the backend accepts too", () => {
    expect(findGroupByKey(groups, "gid-2")?.name).toBe("Core Team");
  });

  it("matches on an alias", () => {
    expect(findGroupByKey(groups, "board@sdc.nycu.club")?.name).toBe(
      "Core Team",
    );
  });

  it("ignores case, as the backend's EqualFold comparison does", () => {
    expect(findGroupByKey(groups, "CORE@SDC.NYCU.CLUB")?.name).toBe(
      "Core Team",
    );
  });

  it("returns undefined for an unknown key rather than throwing", () => {
    expect(findGroupByKey(groups, "nope@sdc.nycu.club")).toBeUndefined();
  });

  it("tolerates a null aliases list", () => {
    // Go marshals an empty slice as null, so this is the common shape.
    expect(findGroupByKey([group({ aliases: null })], "gid-1")).toBeDefined();
  });

  it("handles missing data and an empty key", () => {
    expect(findGroupByKey(undefined, "gid-1")).toBeUndefined();
    expect(findGroupByKey(groups, "")).toBeUndefined();
  });
});
