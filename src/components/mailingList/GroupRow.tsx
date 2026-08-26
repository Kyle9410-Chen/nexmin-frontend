import { Link, useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MailingListGroup } from "@/types/mailingList";

export interface GroupRowProps {
  group: MailingListGroup;
}

/** The key is an email address, so it has to be encoded into the path. */
export function groupHref(group: MailingListGroup): string {
  return `/mailing-lists/${encodeURIComponent(group.email)}`;
}

export default function GroupRow({ group }: GroupRowProps) {
  const navigate = useNavigate();
  const href = groupHref(group);

  return (
    <TableRow
      className="hover:bg-accent/50 cursor-pointer [&>td]:py-4"
      onClick={() => navigate(href)}
    >
      <TableCell>
        {/* A real anchor, so the row is reachable by keyboard and readable to
            screen readers. It stops propagation because the row's own onClick
            would otherwise navigate a second time and push a duplicate history
            entry, making Back need two presses. */}
        <Link
          to={href}
          onClick={(e) => e.stopPropagation()}
          className="block truncate font-medium hover:underline"
        >
          {group.displayName || group.name || group.email}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground truncate">
        {group.email}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {group.directMembersCount}
      </TableCell>
      <TableCell>
        <ChevronRight className="text-muted-foreground size-4" />
      </TableCell>
    </TableRow>
  );
}

/**
 * Mobile variant. Unlike `UserMobileRow` this is a plain tappable link, not a
 * Drawer: a Drawer exists to hold row actions that will not fit in a table
 * cell, and a group has exactly one action — go to its members.
 */
export function GroupMobileRow({ group }: GroupRowProps) {
  return (
    <Link
      to={groupHref(group)}
      className="hover:bg-accent/50 flex w-full items-center gap-3 border-b px-4 py-4 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {group.displayName || group.name || group.email}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {group.email}
        </span>
      </span>
      <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
        {group.directMembersCount}
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
