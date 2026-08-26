import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useJwtPayload } from "@/hooks/useJwtPayload";
import { useRemoveRosterMember } from "@/hooks/useRosterMutations";
import type { RosterEntry } from "@/types/roster";

export interface RemoveMemberDialogProps {
  entry: RosterEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RemoveMemberDialog({
  entry,
  open,
  onOpenChange,
}: RemoveMemberDialogProps) {
  const payload = useJwtPayload();
  const { mutate: remove } = useRemoveRosterMember();

  // Nothing on the backend stops an admin removing themselves, and doing so
  // leaves them unable to sign back in — recovering means being re-added from
  // the Google admin console. Say so rather than blocking it.
  const isSelf = !!entry && entry.email === payload?.email;
  const who = entry?.profile?.name || entry?.email;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {who} from the club?</AlertDialogTitle>
          <AlertDialogDescription>
            They come off the club mailing list, so they stop appearing on the
            roster and can no longer sign in. Their profile is kept, and comes
            back if they are added again.
            {isSelf &&
              " This is your own account: you will not be able to sign back in, and only a Google Workspace admin can restore your access."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => entry && remove(entry.email)}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSelf ? "Remove myself" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
