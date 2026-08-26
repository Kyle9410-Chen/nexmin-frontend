import { Link, useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MembershipItem } from "@/types/membership";

export interface MembershipRowProps {
  item: MembershipItem;
}

/** `key` is a bare group name, which the group routes accept as a `group_key`. */
export function membershipHref(item: MembershipItem): string {
  return `/mailing-lists/${encodeURIComponent(item.key)}`;
}

/**
 * How the caller reaches this list. `via` is what makes an indirect entry
 * explainable — the org chart is a DAG, so a list can turn up under more than
 * one parent.
 */
function Membership({ item }: MembershipRowProps) {
  if (item.direct) {
    return <Badge variant="secondary">Direct</Badge>;
  }

  const chain = item.via ?? [];

  return (
    <span className="text-muted-foreground text-sm">
      {chain.length > 0 ? `via ${chain.join(" → ")}` : "Indirect"}
    </span>
  );
}

export default function MembershipRow({ item }: MembershipRowProps) {
  const navigate = useNavigate();
  const href = membershipHref(item);

  return (
    <TableRow
      className="hover:bg-accent/50 cursor-pointer [&>td]:py-4"
      onClick={() => navigate(href)}
    >
      <TableCell>
        {/* A real anchor, so the row is reachable by keyboard. It stops
            propagation because the row's own onClick would otherwise navigate a
            second time and push a duplicate history entry. */}
        <Link
          to={href}
          onClick={(e) => e.stopPropagation()}
          className="block truncate font-medium hover:underline"
        >
          {item.name}
        </Link>
        <span className="text-muted-foreground block truncate text-xs">
          {item.key}
          {item.ownerRole && ` · ${item.ownerRole.name}`}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {item.memberCount}
      </TableCell>
      <TableCell className="truncate">
        <Membership item={item} />
      </TableCell>
      <TableCell>
        <ChevronRight className="text-muted-foreground size-4" />
      </TableCell>
    </TableRow>
  );
}

export function MembershipMobileRow({ item }: MembershipRowProps) {
  return (
    <Link
      to={membershipHref(item)}
      className="hover:bg-accent/50 flex w-full items-center gap-3 border-b px-4 py-4 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.name}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {item.key}
          {item.ownerRole && ` · ${item.ownerRole.name}`}
        </span>
      </span>
      <span className="shrink-0">
        <Membership item={item} />
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
