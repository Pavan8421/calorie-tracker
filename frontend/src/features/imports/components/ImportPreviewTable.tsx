import { MEAL_TYPES } from "@/features/entries/types";
import type { ParsedRow } from "@/features/imports/types";
import { formatDecimal } from "@/lib/numbers";
import { cn } from "@/lib/utils";

type ImportPreviewTableProps = {
  rows: ParsedRow[];
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
};

function mealLabel(value: string | undefined): string {
  if (!value) return "—";
  return MEAL_TYPES.find((meal) => meal.value === value)?.label ?? value;
}

function rowErrorText(row: ParsedRow): string {
  if (!row.errors.length) return "Invalid row";
  return row.errors
    .map((error) => {
      const field = typeof error.field === "string" && error.field ? `${error.field}: ` : "";
      const message = typeof error.message === "string" ? error.message : "Invalid";
      return `${field}${message}`;
    })
    .join("; ");
}

export function ImportPreviewTable({
  rows,
  selected,
  onSelectedChange,
}: ImportPreviewTableProps) {
  const validRows = rows.filter((row) => row.status === "valid");
  const allValidSelected =
    validRows.length > 0 && validRows.every((row) => selected.has(row.row_number));
  const someValidSelected = validRows.some((row) => selected.has(row.row_number));

  function toggleAll() {
    if (allValidSelected) {
      onSelectedChange(new Set());
      return;
    }
    onSelectedChange(new Set(validRows.map((row) => row.row_number)));
  }

  function toggleOne(rowNumber: number, isValid: boolean) {
    if (!isValid) return;
    const next = new Set(selected);
    if (next.has(rowNumber)) next.delete(rowNumber);
    else next.add(rowNumber);
    onSelectedChange(next);
  }

  if (!rows.length) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">No rows were found in this PDF.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-surface text-[11px] font-semibold text-muted-foreground">
          <tr>
            <th className="w-10 px-4 py-2 font-semibold">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-primary"
                checked={allValidSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someValidSelected && !allValidSelected;
                }}
                disabled={validRows.length === 0}
                onChange={toggleAll}
                aria-label="Select all valid rows"
              />
            </th>
            <th className="px-2 py-2 font-semibold">Date</th>
            <th className="px-2 py-2 font-semibold">Meal</th>
            <th className="px-2 py-2 font-semibold">Food</th>
            <th className="px-2 py-2 font-semibold">Calories</th>
            <th className="px-2 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isValid = row.status === "valid";
            const date =
              (typeof row.data.consumed_on === "string" && row.data.consumed_on) ||
              (typeof row.data.consumed_at === "string" ? row.data.consumed_at.slice(0, 10) : "—");

            return (
              <tr
                key={row.row_number}
                className={cn(
                  "border-b border-[#F0EBE3] last:border-0",
                  !isValid && "bg-destructive/5",
                )}
              >
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={selected.has(row.row_number)}
                    disabled={!isValid}
                    onChange={() => toggleOne(row.row_number, isValid)}
                    aria-label={`Select row ${row.row_number}`}
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-stone-700">{date}</td>
                <td className="px-2 py-2 text-stone-700">
                  {mealLabel(typeof row.data.meal_type === "string" ? row.data.meal_type : undefined)}
                </td>
                <td className="px-2 py-2 font-semibold">
                  {typeof row.data.food_name === "string" ? row.data.food_name : "—"}
                </td>
                <td className="px-2 py-2 font-bold">{formatDecimal(row.data.calories_kcal)}</td>
                <td className="px-2 py-2">
                  {isValid ? (
                    <span className="font-semibold text-primary">Ready</span>
                  ) : (
                    <span className="text-[11px] text-destructive" title={rowErrorText(row)}>
                      {rowErrorText(row)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
