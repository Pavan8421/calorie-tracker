import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useGoalComparison } from "@/features/reports/hooks";
import type { ReportRangeParams } from "@/features/reports/types";
import { toNumber } from "@/lib/numbers";

type GoalComparisonChartProps = {
  range: ReportRangeParams;
};

export function GoalComparisonChart({ range }: GoalComparisonChartProps) {
  const query = useGoalComparison(range);

  if (query.isLoading) return <LoadingState label="Loading goal comparison..." />;
  if (query.isError) {
    return (
      <ErrorState
        message="Could not load goal comparison."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data!;
  const chartRows = data.days
    .filter((d) => d.goal != null)
    .map((d) => ({
      day: d.day.slice(5),
      actual: toNumber(d.actual.calories_kcal) ?? 0,
      goal: d.goal?.calories_kcal ?? 0,
    }));

  if (chartRows.length === 0) {
    return (
      <EmptyState
        title="No goal comparison"
        description="Set goals that cover this date range to compare actual vs target calories."
      />
    );
  }

  const summary = data.summary;

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Days with goal"
          value={String(summary.days_with_goal)}
        />
        <Stat
          label="Avg actual"
          value={
            summary.avg_actual_calories != null
              ? `${Math.round(summary.avg_actual_calories)} kcal`
              : "—"
          }
        />
        <Stat
          label="Avg goal"
          value={
            summary.avg_goal_calories != null
              ? `${Math.round(summary.avg_goal_calories)} kcal`
              : "—"
          }
        />
        <Stat
          label="Adherence (±10%)"
          value={
            summary.adherence_pct != null
              ? `${summary.adherence_pct.toFixed(0)}% (${summary.days_within_10_pct} days)`
              : "—"
          }
        />
      </dl>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="actual" name="Actual" fill="#0f766e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="goal" name="Goal" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
