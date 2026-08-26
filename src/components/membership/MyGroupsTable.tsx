import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SectionHeaderButton,
  SectionHeaderRow,
} from "@/components/customUI/SectionHeader";
import MembershipRow, {
  MembershipMobileRow,
} from "@/components/membership/MembershipRow";
import { useMyGroups } from "@/hooks/useMyGroups";
import { useKeySet } from "@/hooks/useKeySet";
import { getErrMessage } from "@/lib/errors";

export default function MyGroupsTable() {
  const { data, isPending, error } = useMyGroups();
  const { has: isCollapsed, toggle } = useKeySet();
  const sections = data?.sections ?? [];

  return (
    <Card className="gap-0 overflow-hidden md:gap-6">
      <CardHeader>
        <CardTitle className="text-2xl">My Mailing Lists</CardTitle>
        <CardDescription>
          {data
            ? `${data.totalItems} list${data.totalItems === 1 ? "" : "s"}, direct and nested`
            : "The lists you are on"}
        </CardDescription>
        {data?.leadership && (
          <CardAction>
            {/* Google cannot tell the six officer positions apart — every one of
                them is MANAGER of every department group — so this says that
                the caller holds an office, not which. */}
            <Badge title="You hold an officer position; the API cannot say which one">
              Officer
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="px-0 md:px-6">
        {error ? (
          // Nothing here degrades: without Google credentials the backend
          // answers 503, which is the common local state.
          <p className="text-destructive px-6 py-10 text-center text-sm md:px-0">
            {getErrMessage(error, "Failed to load your mailing lists")}
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3 px-6 py-4 md:px-0">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="text-muted-foreground px-6 py-10 text-center text-sm md:px-0">
            You are not on any mailing lists.
          </p>
        ) : (
          <>
            <div className="md:hidden">
              {sections.map((section) => (
                <Fragment key={section.key}>
                  <SectionHeaderButton
                    name={section.name}
                    count={section.items.length}
                    expanded={!isCollapsed(section.key)}
                    onToggle={() => toggle(section.key)}
                    className="bg-muted/50 px-4 py-2"
                  />
                  {!isCollapsed(section.key) &&
                    section.items.map((item) => (
                      <MembershipMobileRow key={item.key} item={item} />
                    ))}
                </Fragment>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[520px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Group</TableHead>
                    <TableHead className="w-[15%] text-right">
                      Members
                    </TableHead>
                    <TableHead className="w-[25%]">Membership</TableHead>
                    <TableHead className="w-[10%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <Fragment key={section.key}>
                      {/* One table with heading rows, rather than a card per
                          section: the sections are labels, not containers. */}
                      <SectionHeaderRow
                        colSpan={4}
                        name={section.name}
                        count={section.items.length}
                        expanded={!isCollapsed(section.key)}
                        onToggle={() => toggle(section.key)}
                      />
                      {!isCollapsed(section.key) &&
                        section.items.map((item) => (
                          <MembershipRow key={item.key} item={item} />
                        ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
