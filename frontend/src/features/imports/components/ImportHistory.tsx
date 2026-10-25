import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useImportList } from "@/features/imports/hooks";
import {
  IMPORT_STATUS_LABELS,
  type ImportJob,
  type ImportStatus,
} from "@/features/imports/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type ImportHistoryProps = {
  page: number;
  onPageChange: (page: number) => void;
  activeJobId: string | null;
  onSelectJob: (job: ImportJob) => void;
};

function statusClass(status: ImportStatus): string {
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "completed") return "bg-muted text-foreground";
  if (status === "preview_ready") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

export function ImportHistory({
  page,
  onPageChange,
  activeJobId,
  onSelectJob,
}: ImportHistoryProps) {
  const listQuery = useImportList(page, PAGE_SIZE);

  if (listQuery.isLoading) {
    return <LoadingState label="Loading import history…" />;
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        message="Could not load import history."
        onRetry={() => void listQuery.refetch()}
      />
    );
  }

  const data = listQuery.data;
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="No imports yet"
        description="Upload a food diary PDF to see it listed here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {data.items.map((job) => {
          const isActive = job.id === activeJobId;
          return (
            <li
              key={job.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-3 py-3",
                isActive && "bg-muted/40",
              )}
            >
              <div className="min-w-0 grid gap-1">
                <p className="truncate text-sm font-medium">{job.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                  {job.status === "completed"
                    ? ` · ${job.imported_count} imported`
                    : null}
                  {job.date_format ? ` · ${job.date_format}` : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                    statusClass(job.status),
                  )}
                >
                  {IMPORT_STATUS_LABELS[job.status]}
                </span>
                <Button
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectJob(job)}
                >
                  {isActive ? "Viewing" : "View"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination
        page={data.page}
        totalPages={data.total_pages}
        total={data.total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
