import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addRosterMember } from "@/lib/request/addRosterMember";
import { removeRosterMember } from "@/lib/request/removeRosterMember";
import { getErrMessage } from "@/lib/errors";
import { optimisticUpdate } from "@/lib/optimistic";
import type {
  AddRosterMemberInput,
  RosterEntry,
  RosterResponse,
} from "@/types/roster";

/** The roster is sorted by the name each person goes by, then their address. */
function sortKey(entry: RosterEntry): string {
  return (entry.profile?.name || entry.email).toLowerCase();
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
          // Already there: the write succeeds — it is idempotent now — but the
          // row exists, and inserting a duplicate would have the rollback
          // remove the *existing* one.
          if (old.items.some((entry) => entry.email === input.email)) {
            return old;
          }

          const added: RosterEntry = {
            email: input.email,
            // Not guessed: whether this grants admin depends on which of the
            // named lists is the login group, which only the backend knows. The
            // roster's role is server-derived anyway, so the refetch settles it.
            role: "member",
            // The login group is written without being named, so its key is
            // missing here until the refetch fills it in.
            groups: input.groups?.map((group) => group.key) ?? [],
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
 * Removal covers **every** list the person is on, not just the login group, and
 * is idempotent — an address on none of them still answers 204 — so there is no
 * "they were not on the list" failure left to translate.
 */
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
      toast.error(getErrMessage(err, "Failed to remove the member"), {
        id: ctx?.id,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      queryClient.invalidateQueries({ queryKey: ["mailingList"] });
    },
  });
}
