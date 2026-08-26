import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateMyProfile } from "@/hooks/useProfileMutations";
import {
  MaxDepartmentLength,
  MaxNameLength,
  MaxNicknameLength,
  type UpdateProfileInput,
  type UserProfile,
} from "@/types/profile";

export interface ProfileFormProps {
  profile: UserProfile;
}

/**
 * Code points, not UTF-16 units, to match the backend's rune count — otherwise
 * a Chinese name would be rejected here for a length the backend accepts.
 */
function runeLength(value: string): number {
  return [...value].length;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  // Seeded once on mount. The card re-keys this component on `updatedAt`, so a
  // saved profile re-seeds the fields without an effect syncing props to state.
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [department, setDepartment] = useState(profile.department);

  const { mutate: save, isPending } = useUpdateMyProfile();

  // Only what actually changed: the backend leaves an omitted field alone, so
  // sending the whole profile back would be a needless write.
  const changes: UpdateProfileInput = {};
  if (name.trim() !== profile.name) changes.name = name.trim();
  if (nickname.trim() !== profile.nickname) changes.nickname = nickname.trim();
  if (department.trim() !== profile.department) {
    changes.department = department.trim();
  }
  const isDirty = Object.keys(changes).length > 0;

  function handleSave() {
    // Mirrors internal/user/profile.go, so the common mistakes are caught
    // before a round trip. The backend still validates.
    if (!name.trim()) {
      toast.error("Name must not be empty");
      return;
    }
    if (runeLength(name.trim()) > MaxNameLength) {
      toast.error(`Name must be at most ${MaxNameLength} characters`);
      return;
    }
    if (runeLength(nickname.trim()) > MaxNicknameLength) {
      toast.error(`Nickname must be at most ${MaxNicknameLength} characters`);
      return;
    }
    if (runeLength(department.trim()) > MaxDepartmentLength) {
      toast.error(
        `Department must be at most ${MaxDepartmentLength} characters`,
      );
      return;
    }

    save(changes);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-nickname">Nickname</Label>
        <Input
          id="profile-nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="What the club calls you"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profile-department">Department</Label>
        <Input
          id="profile-department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Computer Science"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending || !isDirty}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
