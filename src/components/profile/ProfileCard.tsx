import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import GravatarAvatar from "@/components/profile/GravatarAvatar";
import ProfileForm from "@/components/profile/ProfileForm";
import { useMyProfile } from "@/hooks/useMyProfile";
import { getErrMessage } from "@/lib/errors";
import { JwtRoleAdmin } from "@/types/auth";

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}

export default function ProfileCard() {
  const { data: profile, isPending, error } = useMyProfile();

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive py-6 text-center text-sm">
            {getErrMessage(error, "Failed to load your profile")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const isAdmin = profile.role === JwtRoleAdmin;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <GravatarAvatar email={profile.email} name={profile.name} size={80} />
          <div className="min-w-0">
            <CardTitle className="truncate text-2xl">
              {profile.name || profile.email}
            </CardTitle>
            <p className="text-muted-foreground truncate text-sm">
              {profile.email}
            </p>
            <Badge variant={isAdmin ? "default" : "secondary"} className="mt-2">
              {isAdmin ? "Admin" : "Member"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Re-keyed on updatedAt so a saved profile re-seeds the fields. */}
        <ProfileForm profile={profile} key={profile.updatedAt} />

        <Separator />

        <div className="flex flex-col gap-2">
          <ReadOnlyRow label="Email" value={profile.email} />
          {/* Role comes from the login mailing list, so it is not editable
              here — it can only be changed there. */}
          <ReadOnlyRow label="Role" value={isAdmin ? "Admin" : "Member"} />
          <ReadOnlyRow
            label="Member since"
            value={new Date(profile.createdAt).toLocaleDateString()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
