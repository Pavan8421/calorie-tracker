import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useGoalComparison, useMacroBreakdown } from "@/features/reports/hooks";
import type { GoalSnapshot, ReportRangeParams } from "@/features/reports/types";
import { toNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";

type MacroBreakdownChartProps = {
  range: ReportRangeParams;
  groupBy: "day" | "week";
  onGroupByChange: (value: "day" | "week") => void;
};

const COLORS = {
  protein: "#115E59",
  carbs: "#E3A828",
  fat: "#8A68B4",
};

const AXIS = { fontSize: 11, fill: "#6B635C" };

export function MacroBreakdownChart({
  range,
  groupBy,
  onGroupByChange,
}: MacroBreakdownChartProps) {
  const query = useMacroBreakdown({ ...range, group_by: groupBy });
  const goals = useGoalComparison(range);

  if (query.isLoading) return <LoadingState label="Loading macros..." />;
  if (query.isError) {
    return (
      <ErrorState message="Could not load macro breakdown." onRetry={() => void query.refetch()} />
    );
  }

  const data = query.data!;
  const hasBars = data.points.some(
    (point) =>
      (toNumber(point.protein_g) ?? 0) +
        (toNumber(point.carbs_g) ?? 0) +
        (toNumber(point.fat_g) ?? 0) >
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

  const stacked = data.points.map((point) => ({
    period: point.period_start.slice(5),
    protein: toNumber(point.protein_g) ?? 0,
    carbs: toNumber(point.carbs_g) ?? 0,
    fat: toNumber(point.fat_g) ?? 0,
  }));

  const share = [
    { name: "Protein", value: data.calorie_share.protein_pct, color: COLORS.protein },
    { name: "Carbs", value: data.calorie_share.carbs_pct, color: COLORS.carbs },
    { name: "Fat", value: data.calorie_share.fat_pct, color: COLORS.fat },
  ];
  const goalSplit = goalMacroSplit(goals.data?.days.map((day) => day.goal) ?? []);

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Macros per day</h2>
          <div className="flex gap-1">
            {(["day", "week"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={groupBy === value}
                onClick={() => onGroupByChange(value)}
                className={cn(
                  "h-7 rounded-lg px-2.5 text-xs font-semibold",
                  groupBy === value
                    ? "bg-primary-soft text-primary-ink"
                    : "text-stone-700 hover:bg-muted",
                )}
              >
                {value === "day" ? "By day" : "By week"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stacked} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E7E0D5" vertical={false} />
              <XAxis dataKey="period" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={32} />
              <Tooltip />
              <Bar dataKey="protein" name="Protein" stackId="a" fill={COLORS.protein} />
              <Bar dataKey="carbs" name="Carbs" stackId="a" fill={COLORS.carbs} />
              <Bar dataKey="fat" name="Fat" stackId="a" fill={COLORS.fat} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground">Totals in grams.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <h2 className="text-sm font-bold">Where calories came from</h2>
        <ul className="flex flex-col gap-3">
          {share.map((item) => (
            <li key={item.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold">{Math.round(item.value)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ring-track">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, item.value)}%`, backgroundColor: item.color }}
                />
              </div>
            </li>
          ))}
        </ul>
        {goalSplit ? (
          <p className="text-[11px] text-muted-foreground">
            Your goal splits as {goalSplit.protein}% protein, {goalSplit.carbs}% carbs,{" "}
            {goalSplit.fat}% fat.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function goalMacroSplit(goals: Array<GoalSnapshot | null>): {
  protein: number;
  carbs: number;
  fat: number;
} | null {
  const goal = [...goals].reverse().find((item) => item != null);
  if (!goal) return null;
  const protein = (toNumber(goal.protein_g) ?? 0) * 4;
  const carbs = (toNumber(goal.carbs_g) ?? 0) * 4;
  const fat = (toNumber(goal.fat_g) ?? 0) * 9;
  const total = protein + carbs + fat;
  if (total <= 0) return null;
  return {
    protein: Math.round((protein / total) * 100),
    carbs: Math.round((carbs / total) * 100),
    fat: Math.round((fat / total) * 100),
  };
}
