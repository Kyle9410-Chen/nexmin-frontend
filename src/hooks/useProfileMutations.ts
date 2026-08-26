import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateMyProfile } from "@/lib/request/updateMyProfile";
import { getErrMessage } from "@/lib/errors";
import { optimisticUpdate } from "@/lib/optimistic";
import type { UpdateProfileInput, UserProfile } from "@/types/profile";

const PROFILE_KEY = ["profile", "me"];

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
    onMutate: async (input) => {
      const rollback = await optimisticUpdate<UserProfile>(
        queryClient,
        PROFILE_KEY,
        // `updatedAt` is deliberately left alone: ProfileCard keys the form on
        // it, so bumping it here would remount the form mid-request and wipe
        // whatever else the user had typed. The server's value arrives with the
        // response and remounts it once, as before.
        (old) => ({ ...old, ...input }),
      );

      return { id: "update-profile", rollback };
    },
    onSuccess: (_data, _vars, ctx) => {
      toast.success("Profile updated", { id: ctx.id });
    },
    onError: (err, _vars, ctx) => {
      ctx?.rollback();
      toast.error(getErrMessage(err, "Failed to update profile"), {
        id: ctx?.id,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}
