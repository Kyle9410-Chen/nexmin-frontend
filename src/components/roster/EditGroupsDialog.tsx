import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GroupRolePicker from "@/components/mailingList/GroupRolePicker";
import { useMailingListMembersFor } from "@/hooks/useMailingListMembers";
import {
  useUpdateMemberGroups,
  type GroupRoleChange,
} from "@/hooks/useMailingListMemberMutations";
import { roleInGroup } from "@/lib/memberKey";
import {
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

      <GroupRolePicker
        className="max-h-[50vh] overflow-y-auto"
        selected={selected}
        onSelectedChange={setSelected}
        roleFor={roleFor}
        onRoleChange={setRole}
      />

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
