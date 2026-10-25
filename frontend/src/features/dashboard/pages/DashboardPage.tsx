import { format, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { buttonVariants } from "@/components/ui/button-variants";
import { CalorieRing } from "@/features/dashboard/components/CalorieRing";
import { ProgressBar } from "@/features/dashboard/components/ProgressBar";
import { TodayMeals } from "@/features/dashboard/components/TodayMeals";
import { WeekBars } from "@/features/dashboard/components/WeekBars";
import { MEAL_COLORS, MEAL_ORDER, formatKcal } from "@/features/dashboard/meals";
import { MEAL_TYPES } from "@/features/entries/types";
import { useEntries } from "@/features/entries/hooks";
import { useCalorieTrend, useDailySummary } from "@/features/reports/hooks";
import { formatDateISO, parseLocalDate, todayISO } from "@/lib/dates";
import { toNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-context";

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useDailySummary();
  const day = summary.data?.date ?? todayISO();
  const weekRange = useMemo(() => rangeEndingOn(day, 7), [day]);
  const week = useCalorieTrend(weekRange);
  const entries = useEntries({
    start_date: day,
    end_date: day,
    meal_types: [],
    page: 1,
    page_size: 100,
  });

  if (summary.isLoading) {
    return <LoadingState label="Loading today's summary..." />;
  }

  if (summary.isError || !summary.data) {
    return (
      <ErrorState
        message="Could not load today's dashboard."
        onRetry={() => void summary.refetch()}
      />
    );
  }

  const data = summary.data;
  const calories = toNumber(data.totals.calories_kcal) ?? 0;
  const protein = toNumber(data.totals.protein_g) ?? 0;
  const carbs = toNumber(data.totals.carbs_g) ?? 0;
  const fat = toNumber(data.totals.fat_g) ?? 0;
  const goalCal = data.goal?.calories_kcal ?? null;
  const firstName = user?.full_name.split(" ")[0];

  return (
    <div className="tabular-data flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">{formatLongDate(data.date)}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <Link to="/log" className={cn(buttonVariants({ size: "sm" }), "px-3 text-sm font-bold")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Log meal
        </Link>
      </div>

      {!data.goal ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Set a daily goal to see calories left. You can still log meals without one.
          </p>
          <Link to="/goals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Go to goals
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-5 py-4 sm:flex-row sm:gap-6">
          <CalorieRing
            eaten={calories}
            goal={goalCal}
            byMeal={data.by_meal.map((meal) => ({
              meal_type: meal.meal_type,
              calories: toNumber(meal.calories_kcal) ?? 0,
            }))}
          />
          <div className="flex w-full flex-1 flex-col gap-2.5">
            <StatRow label="Eaten" value={`${formatKcal(calories)} kcal`} />
            <StatRow
              label="Daily goal"
              value={goalCal != null ? `${formatKcal(goalCal)} kcal` : "Not set"}
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-700">
              {MEAL_ORDER.map((type) => (
                <span key={type} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-[3px]"
                    style={{ backgroundColor: MEAL_COLORS[type] }}
                  />
                  {MEAL_TYPES.find((meal) => meal.value === type)?.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">The ring fills by meal as you log.</p>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <h2 className="text-sm font-bold">Macros</h2>
          <ProgressBar
            label="Protein"
            actual={protein}
            goal={toNumber(data.goal?.protein_g)}
            unit=" g"
            barClassName="bg-[#115E59]"
          />
          <ProgressBar
            label="Carbs"
            actual={carbs}
            goal={toNumber(data.goal?.carbs_g)}
            unit=" g"
            barClassName="bg-accent-gold"
          />
          <ProgressBar
            label="Fat"
            actual={fat}
            goal={toNumber(data.goal?.fat_g)}
            unit=" g"
            barClassName="bg-accent-purple"
          />
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <TodayMeals
          byMeal={data.by_meal}
          entries={entries.data?.items ?? []}
          loading={entries.isLoading}
        />
        <WeekBars points={week.data?.points ?? []} today={data.date} loading={week.isLoading} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#F0EBE3] pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base font-bold">{value}</span>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatLongDate(iso: string): string {
  return format(parseLocalDate(iso), "EEEE, d MMMM");
}

function rangeEndingOn(endISO: string, days: number): { start_date: string; end_date: string } {
  const end = parseLocalDate(endISO);
  return {
    start_date: formatDateISO(subDays(end, Math.max(days, 1) - 1)),
    end_date: formatDateISO(end),
  };
}
