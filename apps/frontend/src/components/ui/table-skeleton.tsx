import { Skeleton } from "./skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Whether to show the table header skeleton */
  showHeader?: boolean;
  /** Custom column widths (optional) */
  columnWidths?: string[];
  /** Class name for the container */
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  showHeader = true,
  columnWidths,
  className,
}: TableSkeletonProps) {
  return (
    <div className={className}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead
                  key={i}
                  style={columnWidths?.[i] ? { width: columnWidths[i] } : undefined}
                >
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell
                  key={colIndex}
                  style={columnWidths?.[colIndex] ? { width: columnWidths[colIndex] } : undefined}
                >
                  <Skeleton
                    className={`h-4 ${
                      colIndex === 0
                        ? "w-32"
                        : colIndex === columns - 1
                        ? "w-8 ml-auto"
                        : "w-20"
                    }`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface PageSkeletonProps {
  /** Show stats cards skeleton */
  showStats?: boolean;
  /** Number of stats cards */
  statsCount?: number;
  /** Number of table rows */
  tableRows?: number;
  /** Number of table columns */
  tableColumns?: number;
}

export function PageSkeleton({
  showStats = true,
  statsCount = 3,
  tableRows = 5,
  tableColumns = 6,
}: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards skeleton */}
      {showStats && (
        <div className={`grid gap-4 md:grid-cols-${statsCount}`}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Table card skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-64" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <TableSkeleton rows={tableRows} columns={tableColumns} />
        </div>
      </div>
    </div>
  );
}

interface ContentSkeletonProps {
  /** Number of table rows */
  rows?: number;
  /** Number of table columns */
  columns?: number;
}

export function ContentSkeleton({ rows = 5, columns = 6 }: ContentSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

