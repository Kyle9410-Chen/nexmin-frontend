import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addGroupMember } from "@/lib/request/addGroupMember";
import { removeGroupMember } from "@/lib/request/removeGroupMember";
import { updateMailingListMemberRole } from "@/lib/request/updateMailingListMemberRole";
import { getErrMessage } from "@/lib/errors";
import { memberKeyOf } from "@/lib/memberKey";
import { optimisticUpdate } from "@/lib/optimistic";
import type {
  MailingListMemberRole,
  MailingListMembersResponse,
  UpdateMemberRoleInput,
} from "@/types/mailingList";
import type { RosterResponse } from "@/types/roster";

export interface GroupRoleChange {
  groupKey: string;
  role: MailingListMemberRole;
}

export interface UpdateMemberGroupsInput {
  email: string;
  /** Lists to join, each with the role to join as. */
  add: GroupRoleChange[];
  /** Lists to leave. */
  remove: string[];
  /** Role changes on lists they are already on. */
  update: GroupRoleChange[];
}

/**
 * A stable per-entity toast id. There is no loading toast — the change is
 * already on screen — but keeping the id means a second save replaces the first
 * toast rather than stacking one on top of it.
 */
function toastId(id: string) {
  return id;
}

export function useUpdateMailingListMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMemberRoleInput) =>
      updateMailingListMemberRole(input),
    onMutate: async (input) => {
      const rollback = await optimisticUpdate<MailingListMembersResponse>(
        queryClient,
        ["mailingList", input.groupKey, "members"],
        (old) => ({
          ...old,
          items: old.items.map((member) =>
            memberKeyOf(member) === input.memberKey
              ? { ...member, role: input.role }
              : member,
          ),
        }),
      );

      return { id: toastId(`update-member-role-${input.memberKey}`), rollback };
    },
    onSuccess: (_data, _vars, ctx) => {
      toast.success("Role updated", { id: ctx.id });
    },
    onError: (err, _vars, ctx) => {
      ctx?.rollback();
      toast.error(getErrMessage(err, "Failed to update role"), { id: ctx?.id });
    },
    // In onSettled rather than onSuccess: after a rollback the cache should
    // resync from the server too.
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["mailingList", vars.groupKey, "members"],
      });
    },
  });
}

/**
 * Applies one person's group changes as a batch.
 *
 * Every change is attempted rather than stopping at the first failure, because a
 * removal can legitimately fail on its own: the roster reports the lists someone
 * *reaches*, so unchecking one they only get to through a nested group is a
 * DELETE for a membership Google does not have. The failures come back named so
 * the UI can say which ones did not apply.
 */
export function useUpdateMemberGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      add,
      remove,
      update,
    }: UpdateMemberGroupsInput) => {
      const results = await Promise.allSettled([
        ...add.map(({ groupKey, role }) =>
          addGroupMember({ groupKey, email, role }),
        ),
        ...remove.map((groupKey) =>
          removeGroupMember({ groupKey, memberKey: email }),
        ),
        ...update.map(({ groupKey, role }) =>
          updateMailingListMemberRole({ groupKey, memberKey: email, role }),
        ),
      ]);

      const keys = [
        ...add.map((c) => c.groupKey),
        ...remove,
        ...update.map((c) => c.groupKey),
      ];
      return results.flatMap((result, i) =>
        result.status === "rejected"
          ? [
              {
                groupKey: keys[i],
                message: getErrMessage(result.reason, "failed"),
              },
            ]
          : [],
      );
    },
    onMutate: async (input) => {
      const added = input.add.map((c) => c.groupKey);

      // Membership moves on the roster. A join is *not* written into that
      // group's member list: there is no member id or profile to invent, and a
      // fabricated row would be worse than a short refetch.
      const rollbacks = [
        await optimisticUpdate<RosterResponse>(
          queryClient,
          ["roster"],
          (old) => ({
            ...old,
            items: old.items.map((entry) =>
              entry.email === input.email
                ? {
                    ...entry,
                    groups: [
                      ...entry.groups.filter(
                        (key) => !input.remove.includes(key),
                      ),
                      ...added.filter((key) => !entry.groups.includes(key)),
                    ],
                  }
                : entry,
            ),
          }),
        ),
      ];

      // A role change *can* be applied locally: the dialog just read that
      // member list, so the row is already there.
      for (const { groupKey, role } of input.update) {
        rollbacks.push(
          await optimisticUpdate<MailingListMembersResponse>(
            queryClient,
            ["mailingList", groupKey, "members"],
            (old) => ({
              ...old,
              items: old.items.map((member) =>
                memberKeyOf(member).toLowerCase() === input.email.toLowerCase()
                  ? { ...member, role }
                  : member,
              ),
            }),
          ),
        );
      }

      return {
        id: toastId(`update-groups-${input.email}`),
        rollback: () => rollbacks.forEach((undo) => undo()),
      };
    },
    onSuccess: (failures, _vars, ctx) => {
      if (failures.length === 0) {
        toast.success("Groups updated", { id: ctx.id });
      } else {
        // A partial failure resolves rather than rejecting, so it never reaches
        // onError: the onSettled invalidation is what corrects the optimistic
        // value here, not a rollback.
        toast.error(
          `Could not update ${failures.map((f) => f.groupKey).join(", ")}`,
          { id: ctx.id },
        );
      }
    },
    onError: (err, _vars, ctx) => {
      ctx?.rollback();
      toast.error(getErrMessage(err, "Failed to update groups"), {
        id: ctx?.id,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["mailingList"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export interface RemoveMailingListMemberInput {
  groupKey: string;
  /** The member's email, or their immutable ID — the API takes either. */
  memberKey: string;
}

/**
 * Takes one member off one list, unlike `useRemoveRosterMember`, which takes
 * them off every list the club has.
 *
 * A 404 here means the address is not a **direct** member of that group. The
 * members table only ever lists direct members, so that is a stale row rather
 * than a case to explain away — the `onSettled` invalidation corrects it.
 */
export function useRemoveMailingListMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveMailingListMemberInput) =>
      removeGroupMember(input),
    onMutate: async (input) => {
      const rollback = await optimisticUpdate<MailingListMembersResponse>(
        queryClient,
        ["mailingList", input.groupKey, "members"],
        (old) => {
          const items = old.items.filter(
            (member) => memberKeyOf(member) !== input.memberKey,
          );
          // Only count down for a row that was actually there, or a repeated
          // removal would drift the count away from the list.
          return {
            items,
            totalItems: old.totalItems - (old.items.length - items.length),
          };
        },
      );

      return {
        id: toastId(`remove-member-${input.groupKey}-${input.memberKey}`),
        rollback,
      };
    },
    onSuccess: (_data, vars, ctx) => {
      toast.success(`${vars.memberKey} removed from the list`, { id: ctx.id });
    },
    onError: (err, _vars, ctx) => {
      ctx?.rollback();
      toast.error(getErrMessage(err, "Failed to remove the member"), {
        id: ctx?.id,
      });
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["mailingList", vars.groupKey, "members"],
      });
      // The roster carries each person's group keys, and one of them just went.
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      // And their own view of the same domain, if they were looking at it.
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
