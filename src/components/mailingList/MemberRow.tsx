import { ChevronDown, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import RoleBadge, { RoleIcon } from "@/components/customUI/RoleBadge";
import { memberKeyOf } from "@/lib/memberKey";
import {
  MEMBER_ROLE_OPTIONS,
  type MailingListMember,
  type MailingListMemberRole,
} from "@/types/mailingList";

export interface MemberRowProps {
  member: MailingListMember;
  /**
   * Whether the signed-in user may change roles. The PATCH route is admin-only,
   * so a non-admin gets plain text rather than a control that can only 403.
   */
  canEdit: boolean;
  onRoleChange: (
    member: MailingListMember,
    role: MailingListMemberRole,
  ) => void;
  /** Same admin gate as the role control: DELETE is admin-only too. */
  onRemove: (member: MailingListMember) => void;
}

/**
 * Who this member is. A member who has never signed in here has no profile, so
 * the address is all there is to show — which is also how the table looked
 * before profiles existed.
 */
function MemberIdentity({ member }: { member: MailingListMember }) {
  const profile = member.profile;

  if (!profile?.name) {
    return <span className="block truncate">{member.email}</span>;
  }

  return (
    <>
      <span className="block truncate">
        {profile.name}
        {profile.nickname && ` (${profile.nickname})`}
      </span>
      <span className="text-muted-foreground block truncate text-xs">
        {member.email}
      </span>
    </>
  );
}

/**
 * Takes this one member off this one list. Confirmation lives in the dialog the
 * table owns, so the button only reports the intent.
 */
function RemoveControl({
  member,
  canEdit,
  onRemove,
}: Pick<MemberRowProps, "member" | "canEdit" | "onRemove">) {
  if (!canEdit) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Remove ${memberKeyOf(member)} from this group`}
      onClick={() => onRemove(member)}
    >
      <UserMinus className="size-4" />
    </Button>
  );
}

/** Identical on both breakpoints, so it lives in one place. */
function RoleControl({
  member,
  canEdit,
  onRoleChange,
}: Pick<MemberRowProps, "member" | "canEdit" | "onRoleChange">) {
  // No pending state: the new role is already on screen optimistically, so a
  // spinner over it would only hide the answer.
  if (!canEdit) {
    return <RoleBadge role={member.role} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 px-2 font-medium"
          aria-label={`Change role for ${memberKeyOf(member)}`}
        >
          <RoleBadge role={member.role} />
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MEMBER_ROLE_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={member.role === option.id}
            onCheckedChange={() => {
              // Re-picking the current role would spend a Directory API write
              // to change nothing.
              if (member.role !== option.id) onRoleChange(member, option.id);
            }}
          >
            <RoleIcon role={option.id} />
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MemberRow(props: MemberRowProps) {
  return (
    <TableRow className="[&>td]:py-4">
      <TableCell className="font-medium">
        <MemberIdentity member={props.member} />
      </TableCell>
      <TableCell>
        <RoleControl {...props} />
      </TableCell>
      <TableCell className="text-right">
        <RemoveControl {...props} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Mobile variant. A plain row, not a Link or a Drawer: unlike a group there is
 * nothing to drill into, and the one action a member has fits in the cell.
 */
export function MemberMobileRow(props: MemberRowProps) {
  return (
    <div className="flex w-full items-center gap-3 border-b px-4 py-4">
      <span className="min-w-0 flex-1 font-medium">
        <MemberIdentity member={props.member} />
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <RoleControl {...props} />
        <RemoveControl {...props} />
      </span>
    </div>
  );
}
