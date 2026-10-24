import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useDeleteGoal, useGoalHistory } from "@/features/goals/hooks";
import { formatDecimal } from "@/lib/numbers";

const PAGE_SIZE = 10;

export function GoalHistoryTable() {
  const [page, setPage] = useState(1);
  const history = useGoalHistory(page, PAGE_SIZE);
  const deleteGoal = useDeleteGoal();

  if (history.isLoading) return <LoadingState label="Loading goal history..." />;
  if (history.isError) {
    return (
      <ErrorState
        message="Could not load goal history."
        onRetry={() => void history.refetch()}
      />
    );
  }

  const data = history.data;
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="No goal history yet"
        description="Saved goal versions will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Effective</th>
              <th className="px-3 py-2 font-medium">Calories</th>
              <th className="px-3 py-2 font-medium">P / C / F</th>
              <th className="px-3 py-2 font-medium">Target wt</th>
              <th className="px-3 py-2 font-medium">Target date</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((goal) => (
              <tr key={goal.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{goal.effective_from}</td>
                <td className="px-3 py-2">{goal.calories_kcal}</td>
                <td className="px-3 py-2">
                  {formatDecimal(goal.protein_g)} / {formatDecimal(goal.carbs_g)} /{" "}
                  {formatDecimal(goal.fat_g)}
                </td>
                <td className="px-3 py-2">
                  {goal.target_weight_kg != null
                    ? `${formatDecimal(goal.target_weight_kg)} kg`
                    : "—"}
                </td>
                <td className="px-3 py-2">{goal.target_date ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteGoal.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this goal version?")) {
                        void deleteGoal.mutateAsync(goal.id);
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
