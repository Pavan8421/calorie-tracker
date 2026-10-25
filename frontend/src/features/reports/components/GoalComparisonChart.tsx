import { format } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useGoalComparison } from "@/features/reports/hooks";
import type { ReportRangeParams } from "@/features/reports/types";
import { parseLocalDate } from "@/lib/dates";
import { toNumber } from "@/lib/numbers";

type GoalComparisonChartProps = {
  range: ReportRangeParams;
};

const AXIS = { fontSize: 11, fill: "#6B635C" };

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

  const days = query.data!.days.filter((day) => day.goal != null);
  if (days.length === 0) {
    return (
      <EmptyState
        title="No goal comparison"
        description="Set goals that cover this date range to compare actual vs target calories."
      />
    );
  }

  const chartRows = days.map((day) => ({
    day: day.day.slice(5),
    actual: toNumber(day.actual.calories_kcal) ?? 0,
    goal: day.goal?.calories_kcal ?? 0,
  }));
  const recent = [...days].reverse().slice(0, 4);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ul className="flex flex-col">
        {recent.map((day) => {
          const actual = toNumber(day.actual.calories_kcal) ?? 0;
          const goal = day.goal?.calories_kcal ?? 0;
          return (
            <li
              key={day.day}
              className="flex items-baseline justify-between gap-3 border-b border-[#F0EBE3] py-2 last:border-0"
            >
              <span className="text-xs font-semibold">
                {format(parseLocalDate(day.day), "EEE d MMM")}
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{Math.round(actual).toLocaleString()}</span>
                {" of "}
                {Math.round(goal).toLocaleString()} kcal
              </span>
            </li>
          );
        })}
      </ul>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} width={36} />
            <Tooltip />
            <Bar dataKey="actual" name="Eaten" fill="#0F766E" radius={[3, 3, 0, 0]} />
            <Bar dataKey="goal" name="Goal" fill="#E7E0D5" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground lg:col-span-2">
        A day counts as on target within 10% of the goal.
      </p>
    </div>
  );
}
