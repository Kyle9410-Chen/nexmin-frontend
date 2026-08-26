import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlProps {
  /** Zero-indexed, matching the API's `page` param. */
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

/**
 * Windowed page numbers with leading/trailing ellipses. Pages are zero-indexed
 * throughout the app and rendered as `page + 1`.
 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages: (number | "gap")[] = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);

  if (start > 1) pages.push("gap");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 2) pages.push("gap");

  pages.push(total - 1);
  return pages;
}

export default function PaginationControl({
  currentPage,
  totalPages,
  setCurrentPage,
}: PaginationControlProps) {
  if (totalPages <= 1) return null;

  const isFirst = currentPage === 0;
  const isLast = currentPage >= totalPages - 1;

  return (
    <Pagination className="mx-0 w-auto justify-start">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={isFirst}
            className={isFirst ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (!isFirst) setCurrentPage(currentPage - 1);
            }}
          />
        </PaginationItem>

        {pageWindow(currentPage, totalPages).map((page, i) =>
          page === "gap" ? (
            <PaginationItem key={`gap-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(page);
                }}
              >
                {page + 1}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={isLast}
            className={isLast ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (!isLast) setCurrentPage(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
