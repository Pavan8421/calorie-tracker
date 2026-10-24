import { Link, useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/common/EmptyState";
import { MEAL_TYPES } from "@/features/entries/types";
import type { MealBreakdown } from "@/features/reports/types";
import { formatDecimal } from "@/lib/numbers";

type TodayMealsProps = {
  byMeal: MealBreakdown[];
};

const ORDER = ["breakfast", "lunch", "dinner", "snacks"] as const;

export function TodayMeals({ byMeal }: TodayMealsProps) {
  const navigate = useNavigate();
  const byType = new Map(byMeal.map((m) => [m.meal_type, m]));
  const hasAny = byMeal.some((m) => m.entry_count > 0);

  if (!hasAny) {
    return (
      <EmptyState
        title="No meals logged today"
        description="Log breakfast, lunch, dinner, or a snack to see them here."
        actionLabel="Log meal"
        onAction={() => navigate("/log")}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {ORDER.map((type) => {
        const meal = byType.get(type);
        const label = MEAL_TYPES.find((m) => m.value === type)?.label ?? type;
        if (!meal || meal.entry_count === 0) {
          return (
            <li
              key={type}
              className="flex items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">{label}</span>
              <Link to="/log" className="text-primary hover:underline">
                Add
              </Link>
            </li>
          );
        }
        return (
          <li
            key={type}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {meal.entry_count} {meal.entry_count === 1 ? "entry" : "entries"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatDecimal(meal.calories_kcal)} kcal</p>
              <p className="text-xs text-muted-foreground">
                P {formatDecimal(meal.protein_g)} · C {formatDecimal(meal.carbs_g)} · F{" "}
                {formatDecimal(meal.fat_g)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
