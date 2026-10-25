import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { MEAL_TYPES, type FoodEntry, type MealType } from "@/features/entries/types";
import { MEAL_ADD_LABEL, MEAL_COLORS, MEAL_ORDER, formatKcal } from "@/features/dashboard/meals";
import type { MealBreakdown } from "@/features/reports/types";
import { formatDecimal, toNumber } from "@/lib/numbers";

type TodayMealsProps = {
  byMeal: MealBreakdown[];
  entries: FoodEntry[];
  loading?: boolean;
};

export function TodayMeals({ byMeal, entries, loading = false }: TodayMealsProps) {
  const totals = new Map(byMeal.map((meal) => [meal.meal_type, meal]));
  const foods = groupFoods(entries);

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card px-5 py-4">
      <h2 className="mb-1 text-sm font-bold">Meals</h2>
      <ul>
        {MEAL_ORDER.map((type, index) => {
          const meal = totals.get(type);
          const names = foods.get(type) ?? [];
          const logged = (meal?.entry_count ?? 0) > 0 || names.length > 0;
          const label = MEAL_TYPES.find((item) => item.value === type)?.label ?? type;
          const last = index === MEAL_ORDER.length - 1;

          return (
            <li
              key={type}
              className={
                last
                  ? "flex items-center justify-between gap-3 py-1.5"
                  : "flex items-center justify-between gap-3 border-b border-[#F0EBE3] py-1.5"
              }
            >
              {logged ? (
                <>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <MealDot color={MEAL_COLORS[type]} />
                      {label}
                    </span>
                    <span className="truncate text-xs text-stone-700">
                      {names.length > 0 ? names.join(", ") : loading ? "Loading foods…" : label}
                    </span>
                    {meal ? (
                      <span className="text-xs text-muted-foreground">
                        Protein {formatDecimal(meal.protein_g, 0)} g, carbs{" "}
                        {formatDecimal(meal.carbs_g, 0)} g, fat {formatDecimal(meal.fat_g, 0)} g
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-bold">
                    {formatKcal(toNumber(meal?.calories_kcal) ?? 0)} kcal
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <MealDot color={MEAL_COLORS[type]} hollow />
                    {label}
                  </span>
                  {loading ? (
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  ) : (
                    <Link
                      to={`/log?meal=${type}`}
                      className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-foreground no-underline hover:text-primary"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {MEAL_ADD_LABEL[type]}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MealDot({ color, hollow = false }: { color: string; hollow?: boolean }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
      style={
        hollow
          ? { border: `1.5px solid ${color}` }
          : { backgroundColor: color }
      }
      aria-hidden="true"
    />
  );
}

function groupFoods(entries: FoodEntry[]): Map<MealType, string[]> {
  const grouped = new Map<MealType, string[]>();
  for (const entry of entries) {
    const names = grouped.get(entry.meal_type) ?? [];
    if (!names.includes(entry.food_name)) names.push(entry.food_name);
    grouped.set(entry.meal_type, names);
  }
  return grouped;
}
