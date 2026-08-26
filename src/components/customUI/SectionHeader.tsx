import { ChevronDown } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  name: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * The heading that opens and closes one section of a table. Shared by the
 * mailing list and my-groups views so both behave the same.
 */
export function SectionHeaderButton({
  name,
  count,
  expanded,
  onToggle,
  className,
}: SectionHeaderProps & { className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "hover:text-foreground text-muted-foreground flex w-full items-center gap-2 text-left text-xs font-medium",
        className,
      )}
    >
      <ChevronDown
        className={cn("size-4 transition-transform", !expanded && "-rotate-90")}
      />
      {name}
      <span className="tabular-nums opacity-70">({count})</span>
    </button>
  );
}

/** The same control as a full-width row inside a `<Table>`. */
export function SectionHeaderRow({
  colSpan,
  ...props
}: SectionHeaderProps & { colSpan: number }) {
  return (
    // hover:bg-transparent so it does not read as a clickable data row.
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="bg-muted/50 py-2">
        <SectionHeaderButton {...props} />
      </TableCell>
    </TableRow>
  );
}
