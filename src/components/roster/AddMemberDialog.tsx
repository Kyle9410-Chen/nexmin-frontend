import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GroupRolePicker from "@/components/mailingList/GroupRolePicker";
import { useAddRosterMember } from "@/hooks/useRosterMutations";
import {
  MemberRoleManager,
  MemberRoleMember,
  MemberRoleOwner,
  type MailingListMemberRole,
} from "@/types/mailingList";

export interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Body({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [roles, setRoles] = useState<Map<string, MailingListMemberRole>>(
    () => new Map(),
  );

  const { mutate: add, isPending } = useAddRosterMember();

  /** Nobody is on anything yet, so an unpicked role is simply MEMBER. */
  function roleFor(key: string): MailingListMemberRole {
    return roles.get(key) ?? MemberRoleMember;
  }

  // MANAGER and OWNER of the *login* group map onto this service's admin role.
  // Which list that is, is the backend's business, so the warning covers any
  // Manager or Owner pick rather than pretending to know.
  const grantsAdmin = [...selected].some(
    (key) =>
      roleFor(key) === MemberRoleManager || roleFor(key) === MemberRoleOwner,
  );

  function setGroupRole(key: string, next: MailingListMemberRole) {
    setRoles((prev) => new Map(prev).set(key, next));
  }

  function handleAdd() {
    const trimmed = email.trim();
    // Deliberately shallow: the backend validates properly. This only avoids an
    // obvious round trip.
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }

    add(
      {
        email: trimmed,
        // The login group is written whether or not it is named, so this is only
        // the lists picked here — including, when it is ticked, the login group
        // itself, which is how a role is set on it.
        groups: [...selected].map((key) => ({ key, role: roleFor(key) })),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add member</DialogTitle>
        <DialogDescription>
          Adds the address to the club mailing list, which is what decides who
          appears on the roster and who can sign in. Their profile fills itself
          in the first time they sign in.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="add-member-email">Email</Label>
          <Input
            id="add-member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="someone@nycu.edu.tw"
          />
        </div>

        <div className="grid gap-2">
          <Label>Mailing lists</Label>
          <p className="text-muted-foreground text-sm">
            Optional — they can be added to these later from the roster.
          </p>
          <GroupRolePicker
            className="max-h-[35vh] overflow-y-auto rounded-md border"
            selected={selected}
            onSelectedChange={setSelected}
            roleFor={roleFor}
            onRoleChange={setGroupRole}
          />
        </div>

        {grantsAdmin && (
          <p className="text-destructive flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Manager and Owner of the club login list are administrators of this
            app: they can edit anyone's groups and add or remove members.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleAdd} disabled={isPending}>
          Add member
        </Button>
      </DialogFooter>
    </>
  );
}

export default function AddMemberDialog({
  open,
  onOpenChange,
}: AddMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Keyed on `open` so reopening starts from an empty form rather than the
          last attempt. */}
      <DialogContent>
        {open && <Body key={String(open)} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}
