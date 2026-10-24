import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/features/dashboard/components/ProgressBar";
import { TodayMeals } from "@/features/dashboard/components/TodayMeals";
import { useDailySummary } from "@/features/reports/hooks";
import { formatDecimal, toNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-context";

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useDailySummary();

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
  const goalProtein = toNumber(data.goal?.protein_g) ?? null;
  const goalCarbs = toNumber(data.goal?.carbs_g) ?? null;
  const goalFat = toNumber(data.goal?.fat_g) ?? null;
  const remaining = data.remaining
    ? toNumber(data.remaining.calories_kcal)
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Today{user ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">{data.date}</p>
        </div>
        <Link to="/log" className={cn(buttonVariants())}>
          Log meal
        </Link>
      </div>

      {!data.goal ? (
        <Card>
          <CardHeader>
            <CardTitle>Set a goal</CardTitle>
            <CardDescription>
              Progress bars need a nutrition goal. You can still log meals without one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/goals" className={cn(buttonVariants({ variant: "outline" }))}>
              Go to goals
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calories</CardTitle>
            <CardDescription>
              {remaining != null
                ? remaining >= 0
                  ? `${formatDecimal(remaining)} kcal remaining`
                  : `${formatDecimal(Math.abs(remaining))} kcal over`
                : `${formatDecimal(calories)} kcal logged`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar label="Calories" actual={calories} goal={goalCal} unit=" kcal" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Macros</CardTitle>
            <CardDescription>Protein, carbs, and fat vs today&apos;s goal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar label="Protein" actual={protein} goal={goalProtein} unit=" g" />
            <ProgressBar label="Carbs" actual={carbs} goal={goalCarbs} unit=" g" />
            <ProgressBar label="Fat" actual={fat} goal={goalFat} unit=" g" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s meals</CardTitle>
          <CardDescription>Grouped by meal type.</CardDescription>
        </CardHeader>
        <CardContent>
          <TodayMeals byMeal={data.by_meal} />
        </CardContent>
      </Card>
    </div>
  );
}
