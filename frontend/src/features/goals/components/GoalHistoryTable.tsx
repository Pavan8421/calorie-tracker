import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useDeleteGoal, useGoalHistory } from "@/features/goals/hooks";
import type { Goal } from "@/features/goals/types";
import { parseLocalDate } from "@/lib/dates";
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
      <div className="px-4">
        <EmptyState title="No goal history yet" description="Saved goal versions will appear here." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-surface text-[11px] font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-semibold">From</th>
              <th className="px-2 py-2 font-semibold">Calories</th>
              <th className="px-2 py-2 font-semibold">Protein · Carbs · Fat</th>
              <th className="px-2 py-2 font-semibold">Target</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((goal) => (
              <tr key={goal.id} className="border-b border-[#F0EBE3] last:border-0">
                <td className="px-4 py-2 font-semibold">
                  {format(parseLocalDate(goal.effective_from), "d MMM yyyy")}
                </td>
                <td className="px-2 py-2">{goal.calories_kcal.toLocaleString()}</td>
                <td className="px-2 py-2 text-stone-700">
                  {formatDecimal(goal.protein_g)} · {formatDecimal(goal.carbs_g)} ·{" "}
                  {formatDecimal(goal.fat_g)} g
                </td>
                <td className="px-2 py-2 text-stone-700">{targetLabel(goal)}</td>
                <td className="px-2 py-1 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 px-0 text-stone-600 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete goal from ${goal.effective_from}`}
                    title="Delete"
                    disabled={deleteGoal.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this goal version?")) {
                        void deleteGoal.mutateAsync(goal.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
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

function targetLabel(goal: Goal): string {
  const weight =
    goal.target_weight_kg != null ? `${formatDecimal(goal.target_weight_kg)} kg` : null;
  const date = goal.target_date ? format(parseLocalDate(goal.target_date), "d MMM") : null;
  if (weight && date) return `${weight}, ${date}`;
  return weight ?? date ?? "—";
}
