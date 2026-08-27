import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MemberRow, { MemberMobileRow } from "@/components/mailingList/MemberRow";
import RemoveMemberDialog from "@/components/mailingList/RemoveMemberDialog";
import { useMailingListMembers } from "@/hooks/useMailingListMembers";
import {
  findGroupByKey,
  useMailingListGroups,
} from "@/hooks/useMailingListGroups";
import { useUpdateMailingListMemberRole } from "@/hooks/useMailingListMemberMutations";
import { useJwtPayload } from "@/hooks/useJwtPayload";
import { getErrMessage } from "@/lib/errors";
import { memberKeyOf } from "@/lib/memberKey";
import { JwtRoleAdmin } from "@/types/auth";
import type {
  MailingListMember,
  MailingListMemberRole,
} from "@/types/mailingList";

export interface MemberTableProps {
  groupKey: string;
}

export default function MemberTable({ groupKey }: MemberTableProps) {
  const { data, isPending, error } = useMailingListMembers(groupKey);

  // Only to title the card. Free when arriving from the groups table, since the
  // query is already cached; on a direct URL hit it fetches on demand. The
  // member list never waits on it.
  const { data: groupsData } = useMailingListGroups();
  const group = findGroupByKey(groupsData?.items, groupKey);

  // The PATCH route is admin-only. The claim is set at sign-in from the login
  // mailing list and is not re-read on refresh, so a fresh promotion needs a
  // fresh sign-in — see CLAUDE.md.
  const canEdit = useJwtPayload()?.role === JwtRoleAdmin;

  const { mutate: updateRole } = useUpdateMailingListMemberRole();

  // Kept on the table rather than per row so the confirmation is mounted once,
  // and the member is held after closing so the copy does not blank out during
  // the dialog's close animation.
  const [removing, setRemoving] = useState<MailingListMember | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const rowProps = (member: MailingListMember) => ({
    member,
    canEdit,
    onRoleChange: (target: MailingListMember, role: MailingListMemberRole) =>
      updateRole({ groupKey, memberKey: memberKeyOf(target), role }),
    onRemove: (target: MailingListMember) => {
      setRemoving(target);
      setRemoveOpen(true);
    },
  });

  const members = data?.items ?? [];

  return (
    // Like GroupTable: no PaginationControl and no filters. The members
    // envelope is { items, totalItems }, not PaginatedResponse — the Directory
    // API is not paged through here.
    <Card className="gap-0 overflow-hidden md:gap-6">
      <CardHeader>
        {/* Falls back to the raw key while the groups query is in flight, or
            when the key matches nothing, rather than rendering an empty title. */}
        <CardTitle className="text-2xl">
          {group?.displayName || group?.name || groupKey}
        </CardTitle>
        <CardDescription>
          {group ? `${group.email} · ` : ""}
          {data
            ? `${data.totalItems} member${data.totalItems === 1 ? "" : "s"}`
            : "Group members"}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 md:px-6">
        {error ? (
          <p className="text-destructive px-6 py-10 text-center text-sm md:px-0">
            {getErrMessage(error, "Failed to load members")}
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3 px-6 py-4 md:px-0">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground px-6 py-10 text-center text-sm md:px-0">
            No members found.
          </p>
        ) : (
          <>
            <div className="md:hidden">
              {members.map((member) => (
                <MemberMobileRow key={member.id} {...rowProps(member)} />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[420px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[55%]">Member</TableHead>
                    <TableHead className="w-[35%]">Role</TableHead>
                    <TableHead className="w-[10%]">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <MemberRow key={member.id} {...rowProps(member)} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <RemoveMemberDialog
        member={removing}
        groupKey={groupKey}
        groupName={group?.displayName || group?.name || groupKey}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </Card>
  );
}
