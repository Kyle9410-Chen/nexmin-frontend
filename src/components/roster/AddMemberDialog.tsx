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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddRosterMember } from "@/hooks/useRosterMutations";
import {
  MEMBER_ROLE_OPTIONS,
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
  const [role, setRole] = useState<MailingListMemberRole>(MemberRoleMember);

  const { mutate: add, isPending } = useAddRosterMember();

  // MANAGER and OWNER of the login group map onto this service's admin role, so
  // this field is how administrative access is handed out.
  const grantsAdmin = role === MemberRoleManager || role === MemberRoleOwner;

  function handleAdd() {
    const trimmed = email.trim();
    // Deliberately shallow: the backend validates properly. This only avoids an
    // obvious round trip.
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }

    add({ email: trimmed, role }, { onSuccess: () => onOpenChange(false) });
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
          <Label htmlFor="add-member-role">Role on the mailing list</Label>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as MailingListMemberRole)}
          >
            <SelectTrigger id="add-member-role">
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

        {grantsAdmin && (
          <p className="text-destructive flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Manager and Owner of the club list are administrators of this app:
            they can edit anyone's groups and add or remove members.
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
