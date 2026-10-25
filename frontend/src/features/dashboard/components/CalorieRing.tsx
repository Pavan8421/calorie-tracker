import type { MealType } from "@/features/entries/types";
import { MEAL_COLORS, MEAL_ORDER, formatKcal } from "@/features/dashboard/meals";

type CalorieRingProps = {
  byMeal: { meal_type: MealType; calories: number }[];
  eaten: number;
  goal: number | null;
};

const R = 96;
const CIRC = 2 * Math.PI * R;

export function CalorieRing({ byMeal, eaten, goal }: CalorieRingProps) {
  const remaining = goal != null ? goal - eaten : null;
  const over = remaining != null && remaining < 0;
  const centerValue = remaining == null ? eaten : Math.abs(remaining);
  const centerLabel = remaining == null ? "kcal eaten" : over ? "kcal over" : "kcal left";
  const denom = goal != null && goal > 0 && eaten <= goal ? goal : Math.max(eaten, 1);

  const amounts = new Map(byMeal.map((meal) => [meal.meal_type, meal.calories]));
  let offset = 0;
  const segments = MEAL_ORDER.flatMap((type) => {
    const calories = amounts.get(type) ?? 0;
    if (calories <= 0) return [];
    const length = (calories / denom) * CIRC;
    const segment = { type, length, offset };
    offset += length;
    return [segment];
  });

  const aria =
    goal != null
      ? `${formatKcal(eaten)} of ${formatKcal(goal)} kcal eaten`
      : `${formatKcal(eaten)} kcal eaten`;

  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 232 232" className="h-full w-full" role="img" aria-label={aria}>
        <g transform="rotate(-90 116 116)" fill="none" strokeWidth="20">
          <circle cx="116" cy="116" r={R} className="stroke-ring-track" />
          {segments.map((segment) => (
            <circle
              key={segment.type}
              cx="116"
              cy="116"
              r={R}
              stroke={MEAL_COLORS[segment.type]}
              strokeDasharray={`${segment.length} ${CIRC}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-extrabold tracking-tight text-foreground">
          {formatKcal(centerValue)}
        </span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}
