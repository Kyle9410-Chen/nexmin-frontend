import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addRosterMember } from "@/lib/request/addRosterMember";
import { removeRosterMember } from "@/lib/request/removeRosterMember";
import { getErrMessage } from "@/lib/errors";
import { optimisticUpdate } from "@/lib/optimistic";
import { JwtRoleAdmin } from "@/types/auth";
import {
  MemberRoleManager,
  MemberRoleOwner,
  type MailingListMemberRole,
} from "@/types/mailingList";
import type {
  AddRosterMemberInput,
  RosterEntry,
  RosterResponse,
} from "@/types/roster";

/** The roster is sorted by the name each person goes by, then their address. */
function sortKey(entry: RosterEntry): string {
  return (entry.profile?.name || entry.email).toLowerCase();
}

/** Mirrors the backend: MANAGER or OWNER of the login group is an admin here. */
function localRoleFor(role: MailingListMemberRole | undefined): string {
  return role === MemberRoleManager || role === MemberRoleOwner
    ? JwtRoleAdmin
    : "member";
}

export function useAddRosterMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddRosterMemberInput) => addRosterMember(input),
    onMutate: async (input) => {
      const rollback = await optimisticUpdate<RosterResponse>(
        queryClient,
        ["roster"],
        (old) => {
          // Already there: the server will answer 409, and inserting a
          // duplicate would have the rollback remove the *existing* row.
          if (old.items.some((entry) => entry.email === input.email)) {
            return old;
          }

          const added: RosterEntry = {
            email: input.email,
            role: localRoleFor(input.role),
            // The login group's key is the backend's business, so there is
            // nothing to put here; the refetch fills it in.
            groups: [],
            profile: null,
          };

          return {
            ...old,
            items: [...old.items, added].sort((a, b) =>
              sortKey(a).localeCompare(sortKey(b)),
            ),
            totalItems: old.totalItems + 1,
          };
        },
      );

      return { id: `add-member-${input.email}`, rollback };
    },
    onSuccess: (_entry, vars, ctx) => {
      toast.success(`${vars.email} added to the club`, { id: ctx.id });
    },
    onError: (err, _vars, ctx) => {
      ctx?.rollback();
      toast.error(getErrMessage(err, "Failed to add the member"), {
        id: ctx?.id,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      // The login group's own member list just changed too.
      queryClient.invalidateQueries({ queryKey: ["mailingList"] });
    },
  });
}

/**
 * Google's wording for "this member key resolves to nothing", passed through by
 * the backend as a 400 rather than a 404. Meaningless to a club officer, so it
 * is translated rather than shown raw.
 */
const NOT_ON_LIST = "Missing required field: memberKey";

export function useRemoveRosterMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => removeRosterMember(email),
    onMutate: async (email) => {
      const rollback = await optimisticUpdate<RosterResponse>(
        queryClient,
        ["roster"],
        (old) => ({
          ...old,
          items: old.items.filter((entry) => entry.email !== email),
          totalItems: Math.max(0, old.totalItems - 1),
        }),
      );

      return { id: `remove-member-${email}`, rollback };
    },
    onSuccess: (_data, email, ctx) => {
      toast.success(`${email} removed from the club`, { id: ctx.id });
    },
    onError: (err, _email, ctx) => {
      ctx?.rollback();
      const message = getErrMessage(err, "Failed to remove the member");
      toast.error(
        message.includes(NOT_ON_LIST)
          ? "That address is not on the club mailing list."
          : message,
        { id: ctx?.id },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["mailingList"] });
    },
  });
}
