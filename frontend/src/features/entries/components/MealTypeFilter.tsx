import { MEAL_TYPES, type MealType } from "@/features/entries/types";
import { cn } from "@/lib/utils";

type MealTypeFilterProps = {
  selected: MealType[];
  onChange: (next: MealType[]) => void;
};

export function MealTypeFilter({ selected, onChange }: MealTypeFilterProps) {
  function toggle(value: MealType) {
    if (selected.includes(value)) {
      onChange(selected.filter((m) => m !== value));
      return;
    }
    onChange([...selected, value]);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Meal type</p>
      <div className="flex flex-wrap gap-2">
        {MEAL_TYPES.map((meal) => {
          const active = selected.includes(meal.value);
          return (
            <button
              key={meal.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(meal.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-accent font-medium text-teal-900"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {meal.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length === 0 ? "All meal types" : `${selected.length} selected`}
      </p>
    </div>
  );
}
