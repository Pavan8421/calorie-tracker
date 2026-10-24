import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { useCalorieTrend } from "@/features/reports/hooks";
import type { ReportRangeParams } from "@/features/reports/types";
import { toNumber } from "@/lib/numbers";

type CalorieTrendChartProps = {
  range: ReportRangeParams;
};

export function CalorieTrendChart({ range }: CalorieTrendChartProps) {
  const query = useCalorieTrend(range);

  if (query.isLoading) return <LoadingState label="Loading calorie trend..." />;
  if (query.isError) {
    return (
      <ErrorState message="Could not load calorie trend." onRetry={() => void query.refetch()} />
    );
  }

  const points = query.data?.points ?? [];
  const hasData = points.some((p) => (toNumber(p.calories) ?? 0) > 0);
  if (!hasData) {
    return (
      <EmptyState
        title="No calorie data"
        description="Log meals in this range to see the daily trend."
      />
    );
  }

  const data = points.map((p) => ({
    day: p.day.slice(5),
    calories: toNumber(p.calories) ?? 0,
    goal: p.goal_calories,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="calories" name="Calories" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="goal"
            name="Goal"
            stroke="#b45309"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
