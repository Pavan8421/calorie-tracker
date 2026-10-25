import { format, isToday } from "date-fns";

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
  if (status === "completed" || status === "preview_ready") {
    return "bg-primary-soft text-primary-ink";
  }
  return "bg-muted text-muted-foreground";
}

function whenLabel(iso: string, job: ImportJob): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = isToday(date) ? "Today" : format(date, "d MMM");
  const time = format(date, "h:mm a");
  const added =
    job.status === "completed"
      ? `. ${job.imported_count} entr${job.imported_count === 1 ? "y" : "ies"} added.`
      : "";
  return `${day}, ${time}${added}`;
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
      <div className="px-4">
        <EmptyState title="No imports yet" description="Upload a food diary PDF to see it listed here." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul>
        {data.items.map((job) => {
          const isActive = job.id === activeJobId;
          return (
            <li
              key={job.id}
              className={cn(
                "flex flex-col gap-1 border-b border-[#F0EBE3] px-4 py-2.5 last:border-0",
                isActive && "bg-surface",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-bold">{job.filename}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold",
                    statusClass(job.status),
                  )}
                >
                  {IMPORT_STATUS_LABELS[job.status]}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{whenLabel(job.created_at, job)}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-fit px-0 text-xs font-semibold text-primary hover:bg-transparent hover:text-primary-deep"
                onClick={() => onSelectJob(job)}
              >
                {isActive ? "Viewing" : "View rows"}
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="px-4">
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          total={data.total}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
