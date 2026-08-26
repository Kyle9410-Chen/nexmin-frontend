import { useState } from "react";
import { ChevronDown, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import RosterRow, { RosterMobileRow } from "@/components/roster/RosterRow";
import EditGroupsDialog from "@/components/roster/EditGroupsDialog";
import AddMemberDialog from "@/components/roster/AddMemberDialog";
import RemoveMemberDialog from "@/components/roster/RemoveMemberDialog";
import { useRoster } from "@/hooks/useRoster";
import { useMailingListGroups } from "@/hooks/useMailingListGroups";
import { useJwtPayload } from "@/hooks/useJwtPayload";
import { useKeySet } from "@/hooks/useKeySet";
import { getErrMessage } from "@/lib/errors";
import { JwtRoleAdmin } from "@/types/auth";
import type { RosterEntry } from "@/types/roster";

const ROLE_FILTERS = [
  { id: "admin", label: "Admin" },
  { id: "member", label: "Member" },
];

function matches(entry: RosterEntry, search: string): boolean {
  const haystack = [
    entry.email,
    entry.profile?.name ?? "",
    entry.profile?.nickname ?? "",
    entry.profile?.department ?? "",
  ];
  return haystack.some((f) => f.toLowerCase().includes(search));
}

export default function RosterTable() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<RosterEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<RosterEntry | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isPending, error } = useRoster();
  // Loaded once here rather than per row: the roster reports bare keys, and this
  // is what turns them into names and sections. Cached, and shared with the
  // edit dialog.
  const { data: groupData } = useMailingListGroups();
  const { has: isExpanded, toggle } = useKeySet();
  const canEdit = useJwtPayload()?.role === JwtRoleAdmin;

  // GET /api/users takes no query params — it returns the whole roster, already
  // sorted by the name each person goes by — so filtering is client-side, the
  // same documented exception GroupTable is.
  const needle = search.trim().toLowerCase();
  const entries = (data?.items ?? []).filter(
    (entry) =>
      (!needle || matches(entry, needle)) &&
      (!roleFilter || entry.role === roleFilter),
  );

  const roleLabel =
    ROLE_FILTERS.find((r) => r.id === roleFilter)?.label ?? "All";

  const rowProps = (entry: RosterEntry) => ({
    entry,
    groups: groupData?.items ?? [],
    expanded: isExpanded(entry.email),
    onToggle: () => toggle(entry.email),
    canEdit,
    onEditGroups: (target: RosterEntry) => {
      setEditing(target);
      setDialogOpen(true);
    },
    onRemove: (target: RosterEntry) => {
      setRemoving(target);
      setRemoveOpen(true);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            type="search"
            aria-label="Search the roster"
            placeholder="Search name, email or department"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-fit">
              Role: {roleLabel}
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem
              checked={roleFilter === ""}
              onCheckedChange={() => setRoleFilter("")}
            >
              All
            </DropdownMenuCheckboxItem>
            {ROLE_FILTERS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                checked={roleFilter === option.id}
                onCheckedChange={() => setRoleFilter(option.id)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="gap-0 overflow-hidden md:gap-6">
        <CardHeader>
          <CardTitle className="text-2xl">Club Roster</CardTitle>
          <CardDescription>
            {data
              ? `${data.totalItems} member${data.totalItems === 1 ? "" : "s"} of the club mailing list`
              : "Everyone on the club mailing list"}
          </CardDescription>
          {canEdit && (
            <CardAction>
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="size-4" />
                Add member
              </Button>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="px-0 md:px-6">
          {error ? (
            // Admin-only, and 503 without Google: both arrive here.
            <p className="text-destructive px-6 py-10 text-center text-sm md:px-0">
              {getErrMessage(error, "Failed to load the roster")}
            </p>
          ) : isPending ? (
            <div className="flex flex-col gap-3 px-6 py-4 md:px-0">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground px-6 py-10 text-center text-sm md:px-0">
              No members match that search.
            </p>
          ) : (
            <>
              <div className="md:hidden">
                {entries.map((entry) => (
                  <RosterMobileRow key={entry.email} {...rowProps(entry)} />
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[640px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[45%]">Member</TableHead>
                      <TableHead className="w-[15%]">Role</TableHead>
                      <TableHead className="w-[30%]">Groups</TableHead>
                      <TableHead className="w-[10%] text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <RosterRow key={entry.email} {...rowProps(entry)} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EditGroupsDialog
        entry={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      <RemoveMemberDialog
        entry={removing}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </div>
  );
}
