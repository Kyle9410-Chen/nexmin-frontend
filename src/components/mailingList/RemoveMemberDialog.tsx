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
import { useRemoveMailingListMember } from "@/hooks/useMailingListMemberMutations";
import { memberKeyOf } from "@/lib/memberKey";
import type { MailingListMember } from "@/types/mailingList";

export interface RemoveMemberDialogProps {
  member: MailingListMember | null;
  /** Titles the dialog with the list they are coming off. */
  groupKey: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RemoveMemberDialog({
  member,
  groupKey,
  groupName,
  open,
  onOpenChange,
}: RemoveMemberDialogProps) {
  const payload = useJwtPayload();
  const { mutate: remove } = useRemoveMailingListMember();

  // Removing yourself from *this* list is fine unless it happens to be the
  // login group, which this side cannot tell apart — so warn rather than block,
  // exactly as the roster's own removal dialog does.
  const isSelf =
    !!member && member.email.toLowerCase() === payload?.email?.toLowerCase();
  const who = member?.profile?.name || member?.email;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {who} from {groupName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They come off this one list only — they stay in the club and on
            every other list they are on, and can be added back at any time.
            {isSelf &&
              " This is your own address: if this is the list that gates sign-in, you will not be able to sign back in."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              member && remove({ groupKey, memberKey: memberKeyOf(member) })
            }
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSelf ? "Remove myself" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
