import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useDeleteWeightLog, useWeightHistory } from "@/features/goals/hooks";
import { formatDecimal } from "@/lib/numbers";

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
      <EmptyState
        title="No weight logs yet"
        description="Log your weight to track progress toward your target."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[360px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Weight</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{log.logged_on}</td>
                <td className="px-3 py-2">{formatDecimal(log.weight_kg)} kg</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteLog.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this weight log?")) {
                        void deleteLog.mutateAsync(log.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.page}
        totalPages={data.total_pages}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}
