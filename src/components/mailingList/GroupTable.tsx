import { Fragment } from "react";
import {
  Card,
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
import GroupRow, { GroupMobileRow } from "@/components/mailingList/GroupRow";
import { useMailingListGroups } from "@/hooks/useMailingListGroups";
import { useKeySet } from "@/hooks/useKeySet";
import { bySection } from "@/lib/groupSections";
import { getErrMessage } from "@/lib/errors";

export default function GroupTable() {
  const { data, isPending, error } = useMailingListGroups();
  const { has: isCollapsed, toggle } = useKeySet();
  const sections = bySection(data?.items ?? []);

  return (
    // No filter row and no PaginationControl: GET /api/groups takes no query
    // params, so unlike the users table there is nothing server-driven to drive.
    <Card className="gap-0 overflow-hidden md:gap-6">
      <CardHeader>
        <CardTitle className="text-2xl">Mailing Lists</CardTitle>
        <CardDescription>
          {data
            ? `${data.totalItems} group${data.totalItems === 1 ? "" : "s"}`
            : "Google groups for the club"}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 md:px-6">
        {error ? (
          // The backend answers 503 on every Google-backed route until it has a
          // Workspace service account, so this is the common local state.
          <p className="text-destructive px-6 py-10 text-center text-sm md:px-0">
            {getErrMessage(error, "Failed to load mailing lists")}
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3 px-6 py-4 md:px-0">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="text-muted-foreground px-6 py-10 text-center text-sm md:px-0">
            No mailing lists found.
          </p>
        ) : (
          <>
            <div className="md:hidden">
              {sections.map((section) => (
                <Fragment key={section.key}>
                  <SectionHeaderButton
                    name={section.name}
                    count={section.groups.length}
                    expanded={!isCollapsed(section.key)}
                    onToggle={() => toggle(section.key)}
                    className="bg-muted/50 px-4 py-2"
                  />
                  {!isCollapsed(section.key) &&
                    section.groups.map((group) => (
                      <GroupMobileRow key={group.id} group={group} />
                    ))}
                </Fragment>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[560px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">Name</TableHead>
                    <TableHead className="w-[40%]">Email</TableHead>
                    <TableHead className="w-[10%] text-right">
                      Members
                    </TableHead>
                    <TableHead className="w-[5%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <Fragment key={section.key}>
                      <SectionHeaderRow
                        colSpan={4}
                        name={section.name}
                        count={section.groups.length}
                        expanded={!isCollapsed(section.key)}
                        onToggle={() => toggle(section.key)}
                      />
                      {!isCollapsed(section.key) &&
                        section.groups.map((group) => (
                          <GroupRow key={group.id} group={group} />
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
