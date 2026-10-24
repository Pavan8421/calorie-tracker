import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { useMacroBreakdown } from "@/features/reports/hooks";
import type { ReportRangeParams } from "@/features/reports/types";
import { toNumber } from "@/lib/numbers";

type MacroBreakdownChartProps = {
  range: ReportRangeParams;
  groupBy: "day" | "week";
  onGroupByChange: (value: "day" | "week") => void;
};

const PIE_COLORS = ["#0f766e", "#0ea5e9", "#b45309"];

export function MacroBreakdownChart({
  range,
  groupBy,
  onGroupByChange,
}: MacroBreakdownChartProps) {
  const query = useMacroBreakdown({ ...range, group_by: groupBy });

  if (query.isLoading) return <LoadingState label="Loading macros..." />;
  if (query.isError) {
    return (
      <ErrorState message="Could not load macro breakdown." onRetry={() => void query.refetch()} />
    );
  }

  const data = query.data!;
  const hasBars = data.points.some(
    (p) =>
      (toNumber(p.protein_g) ?? 0) +
        (toNumber(p.carbs_g) ?? 0) +
        (toNumber(p.fat_g) ?? 0) >
      0,
  );

  if (!hasBars) {
    return (
      <EmptyState
        title="No macro data"
        description="Log meals with protein, carbs, or fat in this range."
      />
    );
  }

  const stacked = data.points.map((p) => ({
    period: p.period_start.slice(5),
    protein: toNumber(p.protein_g) ?? 0,
    carbs: toNumber(p.carbs_g) ?? 0,
    fat: toNumber(p.fat_g) ?? 0,
  }));

  const pie = [
    { name: "Protein", value: data.calorie_share.protein_pct },
    { name: "Carbs", value: data.calorie_share.carbs_pct },
    { name: "Fat", value: data.calorie_share.fat_pct },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={groupBy === "day" ? "default" : "outline"}
          onClick={() => onGroupByChange("day")}
        >
          By day
        </Button>
        <Button
          type="button"
          size="sm"
          variant={groupBy === "week" ? "default" : "outline"}
          onClick={() => onGroupByChange("week")}
        >
          By week
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stacked} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="protein" name="Protein" stackId="a" fill="#0f766e" />
              <Bar dataKey="carbs" name="Carbs" stackId="a" fill="#0ea5e9" />
              <Bar dataKey="fat" name="Fat" stackId="a" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name} ${value.toFixed(0)}%`}
              >
                {pie.map((_, i) => (
                  <Cell key={pie[i].name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
