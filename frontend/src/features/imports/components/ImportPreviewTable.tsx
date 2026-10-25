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
  return MEAL_TYPES.find((m) => m.value === value)?.label ?? value;
}

function rowErrorText(row: ParsedRow): string {
  if (!row.errors.length) return "Invalid row";
  return row.errors
    .map((e) => {
      const field = typeof e.field === "string" && e.field ? `${e.field}: ` : "";
      const msg = typeof e.message === "string" ? e.message : "Invalid";
      return `${field}${msg}`;
    })
    .join("; ");
}

export function ImportPreviewTable({
  rows,
  selected,
  onSelectedChange,
}: ImportPreviewTableProps) {
  const validRows = rows.filter((r) => r.status === "valid");
  const allValidSelected =
    validRows.length > 0 && validRows.every((r) => selected.has(r.row_number));
  const someValidSelected = validRows.some((r) => selected.has(r.row_number));

  function toggleAll() {
    if (allValidSelected) {
      onSelectedChange(new Set());
      return;
    }
    onSelectedChange(new Set(validRows.map((r) => r.row_number)));
  }

  function toggleOne(rowNumber: number, isValid: boolean) {
    if (!isValid) return;
    const next = new Set(selected);
    if (next.has(rowNumber)) next.delete(rowNumber);
    else next.add(rowNumber);
    onSelectedChange(next);
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">No rows were found in this PDF.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium w-10">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={allValidSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someValidSelected && !allValidSelected;
                }}
                disabled={validRows.length === 0}
                onChange={toggleAll}
                aria-label="Select all valid rows"
              />
            </th>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Meal</th>
            <th className="px-3 py-2 font-medium">Food</th>
            <th className="px-3 py-2 font-medium">Calories</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isValid = row.status === "valid";
            const checked = selected.has(row.row_number);
            const date =
              (typeof row.data.consumed_on === "string" && row.data.consumed_on) ||
              (typeof row.data.consumed_at === "string"
                ? row.data.consumed_at.slice(0, 10)
                : "—");

            return (
              <tr
                key={row.row_number}
                className={cn(
                  "border-b border-border last:border-0",
                  !isValid && "bg-destructive/5",
                )}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={checked}
                    disabled={!isValid}
                    onChange={() => toggleOne(row.row_number, isValid)}
                    aria-label={`Select row ${row.row_number}`}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.row_number}</td>
                <td className="px-3 py-2 whitespace-nowrap">{date}</td>
                <td className="px-3 py-2">
                  {mealLabel(
                    typeof row.data.meal_type === "string" ? row.data.meal_type : undefined,
                  )}
                </td>
                <td className="px-3 py-2 font-medium">
                  {typeof row.data.food_name === "string" ? row.data.food_name : "—"}
                </td>
                <td className="px-3 py-2">{formatDecimal(row.data.calories_kcal)}</td>
                <td className="px-3 py-2">
                  {isValid ? (
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      Valid
                    </span>
                  ) : (
                    <span className="text-xs text-destructive" title={rowErrorText(row)}>
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
