import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useMailingListMembersFor } from "@/hooks/useMailingListMembers";
import {
  useUpdateMemberGroups,
  type GroupRoleChange,
} from "@/hooks/useMailingListMemberMutations";
import { useKeySet } from "@/hooks/useKeySet";
import { bySection } from "@/lib/groupSections";
import { getErrMessage } from "@/lib/errors";
import { roleInGroup } from "@/lib/memberKey";
import { cn } from "@/lib/utils";
import {
  MEMBER_ROLE_OPTIONS,
  MemberRoleMember,
  type MailingListMemberRole,
} from "@/types/mailingList";
import type { RosterEntry } from "@/types/roster";

export interface EditGroupsDialogProps {
  entry: RosterEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Body({
  entry,
  onOpenChange,
}: {
  entry: RosterEntry;
  onOpenChange: (open: boolean) => void;
}) {
  // Seeded once per mount; the dialog is keyed on the entry's email, so opening
  // it for someone else re-seeds rather than carrying the last person's edits.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(entry.groups),
  );
  // Only what the user actually changed. The displayed value falls back to the
  // fetched role, so the server's answer flows in as it arrives without an
  // effect copying it into state.
  const [roles, setRoles] = useState<Map<string, MailingListMemberRole>>(
    () => new Map(),
  );
  const { has: isCollapsed, toggle: toggleCollapse } = useKeySet();

  const { data, isPending, error } = useMailingListGroups();
  const { mutate: save, isPending: isSaving } = useUpdateMemberGroups();

  // The roster carries keys but no roles, so they are read from each list this
  // person is already on.
  const memberQueries = useMailingListMembersFor(entry.groups);
  const currentRoles = new Map<string, string | undefined>(
    entry.groups.map((key, i) => [
      key,
      roleInGroup(memberQueries[i]?.data?.items ?? [], entry.email),
    ]),
  );

  const sections = bySection(data?.items ?? []);
  const current = new Set(entry.groups);

  /** What the control shows: the user's pick, else the real role, else MEMBER. */
  function roleFor(key: string): MailingListMemberRole {
    return (
      roles.get(key) ??
      (currentRoles.get(key) as MailingListMemberRole | undefined) ??
      MemberRoleMember
    );
  }

  const add: GroupRoleChange[] = [...selected]
    .filter((key) => !current.has(key))
    .map((groupKey) => ({ groupKey, role: roleFor(groupKey) }));
  const remove = [...current].filter((key) => !selected.has(key));
  const update: GroupRoleChange[] = [...selected]
    .filter((key) => current.has(key))
    // Only when the real role is known: without it there is nothing to compare
    // against, and guessing could silently demote someone.
    .filter((key) => {
      const known = currentRoles.get(key);
      return known !== undefined && known !== roleFor(key);
    })
    .map((groupKey) => ({ groupKey, role: roleFor(groupKey) }));

  const isDirty = add.length > 0 || remove.length > 0 || update.length > 0;

  function toggleGroup(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  /** Whole-section toggle: clears the section when it is already fully selected. */
  function toggleSectionAll(keys: string[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  function setRole(key: string, role: MailingListMemberRole) {
    setRoles((prev) => new Map(prev).set(key, role));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit groups</DialogTitle>
        <DialogDescription>
          {entry.profile?.name
            ? `${entry.profile.name} · ${entry.email}`
            : entry.email}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[50vh] overflow-y-auto">
        {error ? (
          <p className="text-destructive py-6 text-center text-sm">
            {getErrMessage(error, "Failed to load mailing lists")}
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-2 py-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          sections.map((section) => {
            const keys = section.groups.map((group) => group.email);
            const chosen = keys.filter((key) => selected.has(key)).length;
            const allChosen = chosen === keys.length;

            return (
              <Fragment key={section.key}>
                <div className="bg-muted/50 sticky top-0 flex items-center gap-2 px-2 py-2">
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
                            <span className="min-w-0 flex-1 truncate">
                              {name}
                            </span>
                          </label>

                          {/* On an unchecked group this is the role they would
                              be added with, so it stays usable but muted. */}
                          <Select
                            value={roleFor(key)}
                            onValueChange={(value) =>
                              setRole(key, value as MailingListMemberRole)
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
          })
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={!isDirty || isSaving}
          onClick={() =>
            save(
              { email: entry.email, add, remove, update },
              { onSuccess: () => onOpenChange(false) },
            )
          }
        >
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}

export default function EditGroupsDialog({
  entry,
  open,
  onOpenChange,
}: EditGroupsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {entry && (
          <Body key={entry.email} entry={entry} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}
