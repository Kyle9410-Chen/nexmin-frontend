import type { MailingListGroup } from "@/types/mailingList";

export interface GroupSectionGroup {
  key: string;
  name: string;
  groups: MailingListGroup[];
}

/**
 * Buckets a flat group list by section, **in encounter order**. The backend
 * already sorts organizationally — All Members, Governance, Departments, … with
 * anything unclassified last — so sorting again here would fight the org chart.
 */
export function bySection(groups: MailingListGroup[]): GroupSectionGroup[] {
  const sections = new Map<string, GroupSectionGroup>();

  for (const group of groups) {
    const { key, name } = group.section;
    const existing = sections.get(key);
    if (existing) {
      existing.groups.push(group);
    } else {
      sections.set(key, { key, name, groups: [group] });
    }
  }

  return [...sections.values()];
}

export interface KeyedSections {
  sections: GroupSectionGroup[];
  /**
   * Keys with no matching group. Normally empty; it fills in when the group
   * list has not loaded, or when someone is on a list that `GET /api/groups`
   * did not return.
   */
  unknown: string[];
}

/**
 * Resolves bare group keys — what the roster reports — against the full group
 * list, bucketed by section.
 *
 * Filtering the group list rather than mapping over the keys is what preserves
 * the backend's organizational order for free.
 */
export function sectionsForKeys(
  keys: string[],
  groups: MailingListGroup[],
): KeyedSections {
  const wanted = new Set(keys);
  const matched = groups.filter((group) => wanted.has(group.email));
  const found = new Set(matched.map((group) => group.email));

  return {
    sections: bySection(matched),
    unknown: keys.filter((key) => !found.has(key)),
  };
}
