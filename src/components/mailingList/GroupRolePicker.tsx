import { Fragment } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeaderButton } from "@/components/customUI/SectionHeader";
import { useMailingListGroups } from "@/hooks/useMailingListGroups";
import { useKeySet } from "@/hooks/useKeySet";
import { bySection } from "@/lib/groupSections";
import { getErrMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  MEMBER_ROLE_OPTIONS,
  type MailingListMemberRole,
} from "@/types/mailingList";

export interface GroupRolePickerProps {
  /** Group keys (emails) currently ticked. */
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  /** What the role control shows for a group — the caller owns the fallback. */
  roleFor: (groupKey: string) => MailingListMemberRole;
  onRoleChange: (groupKey: string, role: MailingListMemberRole) => void;
  className?: string;
}

/**
 * The club's mailing lists, bucketed by org-chart section, each with a checkbox
 * and the role to hold on it.
 *
 * Shared by the two places that write group membership: `EditGroupsDialog`,
 * where the ticks start from what someone is already on, and `AddMemberDialog`,
 * where they start empty. It owns no membership state of its own — which role a
 * blank pick means is the caller's decision, and getting that wrong silently
 * demotes people.
 */
export default function GroupRolePicker({
  selected,
  onSelectedChange,
  roleFor,
  onRoleChange,
  className,
}: GroupRolePickerProps) {
  const { has: isCollapsed, toggle: toggleCollapse } = useKeySet();
  const { data, isPending, error } = useMailingListGroups();

  const sections = bySection(data?.items ?? []);

  function toggleGroup(key: string) {
    const next = new Set(selected);
    if (!next.delete(key)) next.add(key);
    onSelectedChange(next);
  }

  /** Whole-section toggle: clears the section when it is already fully selected. */
  function toggleSectionAll(keys: string[], allSelected: boolean) {
    const next = new Set(selected);
    for (const key of keys) {
      if (allSelected) next.delete(key);
      else next.add(key);
    }
    onSelectedChange(next);
  }

  if (error) {
    return (
      <p className="text-destructive py-6 text-center text-sm">
        {getErrMessage(error, "Failed to load mailing lists")}
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 py-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {sections.map((section) => {
        const keys = section.groups.map((group) => group.email);
        const chosen = keys.filter((key) => selected.has(key)).length;
        const allChosen = chosen === keys.length;

        return (
          <Fragment key={section.key}>
            {/* Deliberately not sticky: several sections pinned at top-0 at
                once stack their headings on top of each other while scrolling. */}
            <div className="bg-muted/50 flex items-center gap-2 px-2 py-2">
              <SectionHeaderButton
                name={section.name}
                count={section.groups.length}
                expanded={!isCollapsed(section.key)}
                onToggle={() => toggleCollapse(section.key)}
                className="min-w-0 flex-1"
              />
              {/* Indeterminate is set imperatively: it is a DOM property
                  with no HTML attribute behind it. */}
              <input
                type="checkbox"
                className="accent-primary size-4"
                aria-label={`Select all in ${section.name}`}
                checked={allChosen}
                ref={(el) => {
                  if (el) el.indeterminate = chosen > 0 && !allChosen;
                }}
                onChange={() => toggleSectionAll(keys, allChosen)}
              />
            </div>

            {!isCollapsed(section.key) && (
              <div className="grid gap-1 px-2 py-2">
                {section.groups.map((group) => {
                  const key = group.email;
                  const isOn = selected.has(key);
                  const name = group.displayName || key;

                  return (
                    <div
                      key={group.id}
                      className="hover:bg-accent/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-primary size-4"
                          checked={isOn}
                          onChange={() => toggleGroup(key)}
                        />
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                      </label>

                      {/* On an unchecked group this is the role they would
                          be added with, so it stays usable but muted. */}
                      <Select
                        value={roleFor(key)}
                        onValueChange={(value) =>
                          onRoleChange(key, value as MailingListMemberRole)
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label={`Role in ${name}`}
                          className={cn("w-32", !isOn && "opacity-60")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBER_ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
