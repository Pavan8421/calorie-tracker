import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MEAL_COLORS } from "@/features/dashboard/meals";
import {
  MEAL_TYPES,
  type FoodEntry,
  type MealType,
} from "@/features/entries/types";
import { parseLocalDate, todayISO } from "@/lib/dates";
import { formatDecimal, toNumber } from "@/lib/numbers";

export type DaySummary = {
  calories: number;
  goal: number | null;
};

type EntriesTableProps = {
  entries: FoodEntry[];
  daySummaries?: Record<string, DaySummary>;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (entry: FoodEntry) => void;
};

const SOURCE_LABELS: Record<FoodEntry["source"], string> = {
  manual: "Manual",
  ai_image: "Photo",
  pdf_import: "PDF import",
  chat: "Chat",
};

export function EntriesTable({
  entries,
  daySummaries = {},
  onEdit,
  onDelete,
}: EntriesTableProps) {
  const groups = groupByDay(entries);
  const today = todayISO();

  return (
    <div className="min-w-[760px]">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 z-10 bg-card text-[11px] text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-semibold">Meal</th>
            <th className="px-3 py-2 font-semibold">Food</th>
            <th className="px-3 py-2 font-semibold">Quantity</th>
            <th className="px-3 py-2 font-semibold">Calories</th>
            <th className="px-3 py-2 font-semibold">Protein · Carbs · Fat</th>
            <th className="px-3 py-2 font-semibold">Source</th>
            <th className="px-3 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const summary = daySummaries[group.day];
            const shownCalories = group.entries.reduce(
              (sum, entry) => sum + (toNumber(entry.calories_kcal) ?? 0),
              0,
            );
            const calories = summary?.calories ?? shownCalories;
            const goal = summary?.goal ?? null;
            return (
              <DayRows
                key={group.day}
                day={group.day}
                today={today}
                calories={calories}
                goal={goal}
                entries={group.entries}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DayRows({
  day,
  today,
  calories,
  goal,
  entries,
  onEdit,
  onDelete,
}: {
  day: string;
  today: string;
  calories: number;
  goal: number | null;
  entries: FoodEntry[];
  onEdit: (entry: FoodEntry) => void;
  onDelete: (entry: FoodEntry) => void;
}) {
  return (
    <>
      <tr className="bg-surface">
        <td colSpan={7} className="bg-surface px-3 py-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-bold text-foreground">{formatDayLabel(day, today)}</span>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {Math.round(calories).toLocaleString()} kcal
              </span>
              {goal != null ? ` of ${Math.round(goal).toLocaleString()}` : ""}
            </span>
          </div>
        </td>
      </tr>
      {entries.map((entry) => {
        const meal = MEAL_TYPES.find((item) => item.value === entry.meal_type);
        return (
          <tr key={entry.id} className="border-b border-[#F0EBE3] last:border-0">
            <td className="px-3 py-2">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: MEAL_COLORS[entry.meal_type as MealType] }}
                />
                {meal?.label ?? entry.meal_type}
              </span>
            </td>
            <td className="px-3 py-2 font-medium">{entry.food_name}</td>
            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
              {formatDecimal(entry.quantity, 0)} {entry.unit}
            </td>
            <td className="whitespace-nowrap px-3 py-2 font-semibold">
              {formatDecimal(entry.calories_kcal, 0)}
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
              {formatDecimal(entry.protein_g, 0)} · {formatDecimal(entry.carbs_g, 0)} ·{" "}
              {formatDecimal(entry.fat_g, 0)}
            </td>
            <td className="px-3 py-2">
              <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                {SOURCE_LABELS[entry.source]}
              </span>
            </td>
            <td className="px-2 py-1 text-right">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0"
                  aria-label={`Edit ${entry.food_name}`}
                  onClick={() => onEdit(entry)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${entry.food_name}`}
                  onClick={() => onDelete(entry)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function groupByDay(entries: FoodEntry[]): { day: string; entries: FoodEntry[] }[] {
  const order: string[] = [];
  const grouped = new Map<string, FoodEntry[]>();
  for (const entry of entries) {
    const day = entry.consumed_on;
    const list = grouped.get(day);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(day, [entry]);
      order.push(day);
    }
  }
  return order.map((day) => ({ day, entries: grouped.get(day) ?? [] }));
}

function formatDayLabel(iso: string, today: string): string {
  const label = format(parseLocalDate(iso), "EEE d MMM");
  return iso === today ? `Today, ${label}` : label;
}
