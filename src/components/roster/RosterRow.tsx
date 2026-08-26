import { Fragment } from "react";
import { Link } from "react-router";
import { ChevronDown, Settings2, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { sectionsForKeys } from "@/lib/groupSections";
import { JwtRoleAdmin } from "@/types/auth";
import type { MailingListGroup } from "@/types/mailingList";
import type { RosterEntry } from "@/types/roster";

export interface RosterRowProps {
  entry: RosterEntry;
  /**
   * The full group list, for resolving the entry's bare keys into names and
   * sections. Empty while it loads, or if it failed — the badges then fall back
   * to the raw keys rather than showing nothing.
   */
  groups: MailingListGroup[];
  expanded: boolean;
  onToggle: () => void;
  /** Admins only: the group routes behind the dialog are admin-gated. */
  canEdit: boolean;
  onEditGroups: (entry: RosterEntry) => void;
  onRemove: (entry: RosterEntry) => void;
}

/**
 * Who this person is. Someone on the mailing list who has never signed in here
 * has no profile, so their address is all there is to show.
 */
export function RosterIdentity({ entry }: { entry: RosterEntry }) {
  const profile = entry.profile;

  if (!profile?.name) {
    return <span className="block truncate">{entry.email}</span>;
  }

  return (
    <>
      <span className="block truncate">
        {profile.name}
        {profile.nickname && ` (${profile.nickname})`}
      </span>
      <span className="text-muted-foreground block truncate text-xs">
        {entry.email}
      </span>
    </>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === JwtRoleAdmin;
  return (
    <Badge variant={isAdmin ? "default" : "secondary"}>
      {isAdmin ? "Admin" : "Member"}
    </Badge>
  );
}

function GroupBadge({ groupKey, label }: { groupKey: string; label: string }) {
  return (
    <Link
      to={`/mailing-lists/${encodeURIComponent(groupKey)}`}
      title={groupKey}
    >
      <Badge variant="outline" className="hover:bg-accent">
        {label}
      </Badge>
    </Link>
  );
}

/**
 * The lists someone is on, bucketed by the club's own classification and
 * labelled with its own names, each badge linking to that list's members page.
 *
 * The keys the roster reports carry no names or sections of their own, so they
 * are resolved against the group list; anything that does not resolve is still
 * shown, under "Other", rather than silently dropped.
 */
export function GroupBadges({
  keys,
  groups,
}: {
  keys: string[];
  groups: MailingListGroup[];
}) {
  const { sections, unknown } = sectionsForKeys(keys, groups);

  return (
    <span className="flex flex-col gap-4">
      {sections.map((section) => (
        <span key={section.key} className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            {section.name}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {section.groups.map((group) => (
              <GroupBadge
                key={group.id}
                groupKey={group.email}
                label={group.displayName || group.email}
              />
            ))}
          </span>
        </span>
      ))}

      {unknown.length > 0 && (
        <span className="flex flex-col gap-1">
          {/* Only labelled when there is something to contrast it with: on its
              own — the group list has not loaded — a heading would be noise. */}
          {sections.length > 0 && (
            <span className="text-muted-foreground text-xs font-medium">
              Other
            </span>
          )}
          <span className="flex flex-wrap gap-1.5">
            {unknown.map((key) => (
              <GroupBadge key={key} groupKey={key} label={key} />
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

export function GroupsToggle({
  count,
  expanded,
  onToggle,
  label,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
    >
      <ChevronDown
        className={cn("size-4 transition-transform", !expanded && "-rotate-90")}
      />
      {count} list{count === 1 ? "" : "s"}
      <span className="sr-only">for {label}</span>
    </button>
  );
}

export default function RosterRow({
  entry,
  groups,
  expanded,
  onToggle,
  canEdit,
  onEditGroups,
  onRemove,
}: RosterRowProps) {
  return (
    <Fragment>
      <TableRow className="[&>td]:py-4">
        <TableCell className="font-medium">
          <RosterIdentity entry={entry} />
        </TableCell>
        <TableCell>
          <RoleBadge role={entry.role} />
        </TableCell>
        <TableCell>
          <GroupsToggle
            count={entry.groups.length}
            expanded={expanded}
            onToggle={onToggle}
            label={entry.email}
          />
        </TableCell>
        <TableCell className="text-right">
          {canEdit && (
            <span className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit groups for ${entry.email}`}
                onClick={() => onEditGroups(entry)}
              >
                <Settings2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${entry.email} from the club`}
                onClick={() => onRemove(entry)}
              >
                <UserMinus className="size-4" />
              </Button>
            </span>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="bg-muted/30 pt-3 pb-4">
            {entry.groups.length > 0 ? (
              <GroupBadges keys={entry.groups} groups={groups} />
            ) : (
              <span className="text-muted-foreground text-sm">
                On no mailing lists.
              </span>
            )}
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

export function RosterMobileRow({
  entry,
  groups,
  expanded,
  onToggle,
  canEdit,
  onEditGroups,
  onRemove,
}: RosterRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 font-medium">
          <RosterIdentity entry={entry} />
        </span>
        <RoleBadge role={entry.role} />
        {canEdit && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit groups for ${entry.email}`}
              onClick={() => onEditGroups(entry)}
            >
              <Settings2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${entry.email} from the club`}
              onClick={() => onRemove(entry)}
            >
              <UserMinus className="size-4" />
            </Button>
          </>
        )}
      </div>

      <GroupsToggle
        count={entry.groups.length}
        expanded={expanded}
        onToggle={onToggle}
        label={entry.email}
      />
      {expanded && entry.groups.length > 0 && (
        <GroupBadges keys={entry.groups} groups={groups} />
      )}
    </div>
  );
}
