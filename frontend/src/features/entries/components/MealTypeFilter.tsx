import { MEAL_TYPES, type MealType } from "@/features/entries/types";
import { cn } from "@/lib/utils";

type MealTypeFilterProps = {
  selected: MealType[];
  onChange: (next: MealType[]) => void;
  compact?: boolean;
};

export function MealTypeFilter({ selected, onChange, compact = false }: MealTypeFilterProps) {
  function toggle(value: MealType) {
    if (selected.includes(value)) {
      onChange(selected.filter((meal) => meal !== value));
      return;
    }
    onChange([...selected, value]);
  }

  const allActive = selected.length === 0;

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1.5" : "space-y-2"}>
      {compact ? null : <p className="text-sm font-medium">Meal type</p>}
      <div className={compact ? "contents" : "flex flex-wrap gap-2"}>
        {compact ? (
          <FilterChip active={allActive} onClick={() => onChange([])}>
            All meals
          </FilterChip>
        ) : null}
        {MEAL_TYPES.map((meal) => {
          const active = selected.includes(meal.value);
          if (compact) {
            return (
              <FilterChip key={meal.value} active={active} onClick={() => toggle(meal.value)}>
                {meal.label}
              </FilterChip>
            );
          }
          return (
            <button
              key={meal.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(meal.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary-soft font-medium text-primary-ink"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {meal.label}
            </button>
          );
        })}
      </div>
      {compact ? null : (
        <p className="text-xs text-muted-foreground">
          {allActive ? "All meal types" : `${selected.length} selected`}
        </p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 rounded-lg px-2.5 text-xs font-semibold",
        active ? "bg-primary-soft text-primary-ink" : "text-stone-700 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
