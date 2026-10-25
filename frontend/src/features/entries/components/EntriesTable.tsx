import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ENTRY_SOURCE_LABELS,
  MEAL_TYPES,
  type FoodEntry,
} from "@/features/entries/types";
import { formatDecimal } from "@/lib/numbers";

type EntriesTableProps = {
  entries: FoodEntry[];
  onEdit: (entry: FoodEntry) => void;
  onDelete: (entry: FoodEntry) => void;
};

export function EntriesTable({ entries, onEdit, onDelete }: EntriesTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Meal</th>
            <th className="px-3 py-2 font-medium">Food</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Calories</th>
            <th className="px-3 py-2 font-medium">P / C / F</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 whitespace-nowrap">{entry.consumed_on}</td>
              <td className="px-3 py-2">
                {MEAL_TYPES.find((m) => m.value === entry.meal_type)?.label ?? entry.meal_type}
              </td>
              <td className="px-3 py-2 font-medium">{entry.food_name}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatDecimal(entry.quantity)} {entry.unit}
              </td>
              <td className="px-3 py-2">{formatDecimal(entry.calories_kcal)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {formatDecimal(entry.protein_g)} / {formatDecimal(entry.carbs_g)} /{" "}
                {formatDecimal(entry.fat_g)}
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {ENTRY_SOURCE_LABELS[entry.source] ?? entry.source}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0 text-primary hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${entry.food_name}`}
                    title="Edit"
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${entry.food_name}`}
                    title="Delete"
                    onClick={() => onDelete(entry)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
