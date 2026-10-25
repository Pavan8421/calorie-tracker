import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useDeleteWeightLog, useWeightHistory } from "@/features/goals/hooks";
import { parseLocalDate } from "@/lib/dates";
import { formatDecimal, toNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export function WeightHistoryTable() {
  const [page, setPage] = useState(1);
  const history = useWeightHistory(page, PAGE_SIZE);
  const deleteLog = useDeleteWeightLog();

  if (history.isLoading) return <LoadingState label="Loading weight history..." />;
  if (history.isError) {
    return (
      <ErrorState
        message="Could not load weight history."
        onRetry={() => void history.refetch()}
      />
    );
  }

  const data = history.data;
  if (!data || data.items.length === 0) {
    return (
      <div className="px-4">
        <EmptyState
          title="No weight logs yet"
          description="Log your weight to track progress toward your target."
        />
      </div>
    );
  }

  const lastPage = data.page >= data.total_pages;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-xs">
          <thead className="bg-surface text-[11px] font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-2 py-2 font-semibold">Weight</th>
              <th className="px-2 py-2 font-semibold">Change</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((log, index) => {
              const change = changeFromOlder(data.items, index, lastPage);
              return (
                <tr key={log.id} className="border-b border-[#F0EBE3] last:border-0">
                  <td className="px-4 py-2 font-semibold">
                    {format(parseLocalDate(log.logged_on), "EEE d MMM")}
                  </td>
                  <td className="px-2 py-2 font-bold">{formatDecimal(log.weight_kg)} kg</td>
                  <td className={cn("px-2 py-2", change.className)}>{change.text}</td>
                  <td className="px-2 py-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 px-0 text-stone-600 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete weight log from ${log.logged_on}`}
                      title="Delete"
                      disabled={deleteLog.isPending}
                      onClick={() => {
                        if (window.confirm("Delete this weight log?")) {
                          void deleteLog.mutateAsync(log.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4">
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          total={data.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function changeFromOlder(
  logs: { weight_kg: string | number }[],
  index: number,
  isLastPage: boolean,
): { text: string; className: string } {
  const older = logs[index + 1];
  if (!older) {
    return isLastPage
      ? { text: "Start", className: "text-muted-foreground" }
      : { text: "—", className: "text-muted-foreground" };
  }
  const current = toNumber(logs[index].weight_kg) ?? 0;
  const previous = toNumber(older.weight_kg) ?? 0;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) {
    return { text: "0 kg", className: "text-muted-foreground" };
  }
  return {
    text: `${delta > 0 ? "+" : "−"}${formatDecimal(Math.abs(delta))} kg`,
    className: delta > 0 ? "text-[#9A5B0B]" : "text-primary",
  };
}
