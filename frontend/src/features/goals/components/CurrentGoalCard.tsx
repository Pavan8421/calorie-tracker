import { format } from "date-fns";

import type { CurrentGoal } from "@/features/goals/types";
import { parseLocalDate } from "@/lib/dates";
import { formatDecimal, toNumber } from "@/lib/numbers";

type CurrentGoalCardProps = {
  goal: CurrentGoal;
};

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export function CurrentGoalCard({ goal }: CurrentGoalCardProps) {
  const proteinG = toNumber(goal.protein_g) ?? 0;
  const carbsG = toNumber(goal.carbs_g) ?? 0;
  const fatG = toNumber(goal.fat_g) ?? 0;
  const rows = [
    { key: "protein", label: "Protein", color: "#115E59", grams: goal.protein_g, kcal: proteinG * KCAL_PER_GRAM.protein },
    { key: "carbs", label: "Carbs", color: "#E3A828", grams: goal.carbs_g, kcal: carbsG * KCAL_PER_GRAM.carbs },
    { key: "fat", label: "Fat", color: "#8A68B4", grams: goal.fat_g, kcal: fatG * KCAL_PER_GRAM.fat },
  ] as const;
  const macroKcal = rows.reduce((sum, row) => sum + row.kcal, 0);
  const calorieGoal = Math.max(goal.calories_kcal, 1);

  return (
    <div className="flex h-full flex-1 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Daily goal</h2>
        <span className="text-[11px] text-muted-foreground">
          Since {format(parseLocalDate(goal.effective_from), "d MMM yyyy")}
        </span>
      </div>
      <div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight">
            {goal.calories_kcal.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">kcal a day</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Macros add up to {Math.round(macroKcal).toLocaleString()} kcal
        </p>
      </div>
      <dl className="flex flex-1 flex-col justify-between gap-3">
        {rows.map((row) => {
          const share = Math.round((row.kcal / calorieGoal) * 100);
          return (
            <div key={row.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <dt className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: row.color }} />
                  {row.label}
                </dt>
                <dd className="text-right">
                  <span className="font-bold">{formatDecimal(row.grams)} g</span>
                  <span className="ml-2 text-[11px] font-semibold text-muted-foreground">
                    {Math.round(row.kcal).toLocaleString()} kcal · {share}%
                  </span>
                </dd>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ring-track">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(share, 100)}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between gap-2 border-t border-[#F0EBE3] pt-2 text-xs">
          <dt className="font-semibold text-stone-700">Fiber</dt>
          <dd className="font-bold">
            {goal.fiber_g != null ? `${formatDecimal(goal.fiber_g)} g` : "—"}
          </dd>
        </div>
      </dl>
      {goal.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-xl bg-[#F8E7C4] px-3 py-2 text-[11px] text-[#9A5B0B]">
          {goal.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
