import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useCalorieTrend, useGoalComparison } from "@/features/reports/hooks";
import type { ReportRangeParams } from "@/features/reports/types";
import { toNumber } from "@/lib/numbers";

type CalorieTrendChartProps = {
  range: ReportRangeParams;
};

const AXIS = { fontSize: 11, fill: "#6B635C" };

export function CalorieTrendChart({ range }: CalorieTrendChartProps) {
  const query = useCalorieTrend(range);
  const goals = useGoalComparison(range);

  if (query.isLoading) return <LoadingState label="Loading calorie trend..." />;
  if (query.isError) {
    return (
      <ErrorState message="Could not load calorie trend." onRetry={() => void query.refetch()} />
    );
  }

  const points = query.data?.points ?? [];
  const logged = points.filter((point) => (toNumber(point.calories) ?? 0) > 0);
  const loggedTotal = logged.reduce((sum, point) => sum + (toNumber(point.calories) ?? 0), 0);
  const average = logged.length > 0 ? Math.round(loggedTotal / logged.length) : null;
  const summary = goals.data?.summary;

  if (logged.length === 0) {
    return (
      <EmptyState
        title="No calorie data"
        description="Log meals in this range to see the daily trend."
      />
    );
  }

  const data = points.map((point) => ({
    day: point.day.slice(5),
    calories: toNumber(point.calories) ?? 0,
    goal: point.goal_calories,
  }));

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid gap-2 sm:grid-cols-3">
        <Stat
          value={average != null ? average.toLocaleString() : "—"}
          label="Average per logged day"
        />
        <Stat
          value={`${logged.length} of ${points.length}`}
          label="Days logged"
        />
        <Stat
          value={
            summary
              ? `${summary.days_within_10_pct} of ${summary.days_with_goal}`
              : "—"
          }
          label="Days within 10% of goal"
        />
      </dl>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E7E0D5" vertical={false} />
            <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} width={36} />
            <Tooltip />
            <Bar dataKey="calories" name="Calories eaten" fill="#0F766E" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="goal"
              name="Goal"
              stroke="#B8AD9C"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="text-lg font-extrabold tracking-tight">{value}</dd>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
    </div>
  );
}
