import { Crown, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MEMBER_ROLE_OPTIONS,
  MemberRoleManager,
  MemberRoleMember,
  MemberRoleOwner,
} from "@/types/mailingList";

// MANAGER and MEMBER read almost identically at a glance — same initial, same
// length, same casing — so the word alone is not enough to tell two rows apart.
// Each role carries an icon and a colour as well, and the three icons differ in
// silhouette rather than only in detail.
const ROLE_STYLES: Record<string, { icon: LucideIcon; className: string }> = {
  [MemberRoleOwner]: {
    icon: Crown,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  [MemberRoleManager]: {
    icon: ShieldCheck,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  [MemberRoleMember]: {
    icon: User,
    className: "border-border bg-muted text-muted-foreground",
  },
};

/**
 * `MailingListMember.role` is typed as a bare `string` on purpose, so an
 * unfamiliar value from the Directory API still has to render. It falls back to
 * the raw value, unstyled and without an icon, rather than being mistaken for
 * one of the three known roles.
 */
function roleLabel(role: string) {
  return MEMBER_ROLE_OPTIONS.find((r) => r.id === role)?.label ?? role;
}

/**
 * Just the icon, for places that already supply their own label — the role
 * pickers, where the badge's pill would fight the menu item's own layout.
 */
export function RoleIcon({
  role,
  className,
}: {
  role: string;
  className?: string;
}) {
  const Icon = ROLE_STYLES[role]?.icon;
  if (!Icon) return null;
  return <Icon className={cn("size-4 opacity-70", className)} aria-hidden />;
}

export default function RoleBadge({
  role,
  className,
}: {
  role: string;
  className?: string;
}) {
  const style = ROLE_STYLES[role];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", style?.className, className)}
    >
      <RoleIcon role={role} className="opacity-100" />
      {roleLabel(role)}
    </Badge>
  );
}
