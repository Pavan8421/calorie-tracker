import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEntryDialog } from "@/features/entries/components/DeleteEntryDialog";
import { EditEntryDialog } from "@/features/entries/components/EditEntryDialog";
import { EntriesTable } from "@/features/entries/components/EntriesTable";
import { MealTypeFilter } from "@/features/entries/components/MealTypeFilter";
import { useEntries } from "@/features/entries/hooks";
import type { FoodEntry, MealType } from "@/features/entries/types";
import { MEAL_TYPES } from "@/features/entries/types";
import { defaultEntryRange } from "@/lib/dates";

const PAGE_SIZE = 20;
const MEAL_SET = new Set(MEAL_TYPES.map((m) => m.value));

function parseMealTypes(params: URLSearchParams): MealType[] {
  return params
    .getAll("meal_type")
    .filter((value): value is MealType => MEAL_SET.has(value as MealType));
}

function parsePage(params: URLSearchParams): number {
  const raw = Number(params.get("page") ?? "1");
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export function EntriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = useMemo(() => defaultEntryRange(), []);

  const startDate = searchParams.get("start_date") || defaults.start_date;
  const endDate = searchParams.get("end_date") || defaults.end_date;
  const mealTypes = parseMealTypes(searchParams);
  const mealTypesKey = mealTypes.join(",");
  const page = parsePage(searchParams);

  const listParams = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      meal_types: mealTypesKey
        ? (mealTypesKey.split(",") as MealType[])
        : ([] as MealType[]),
      page,
      page_size: PAGE_SIZE,
    }),
    [startDate, endDate, mealTypesKey, page],
  );

  const entriesQuery = useEntries(listParams);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [deleting, setDeleting] = useState<FoodEntry | null>(null);

  function updateParams(patch: {
    start_date?: string;
    end_date?: string;
    meal_types?: MealType[];
    page?: number;
  }) {
    const next = new URLSearchParams();
    const start = patch.start_date ?? startDate;
    const end = patch.end_date ?? endDate;
    const meals = patch.meal_types ?? mealTypes;
    const nextPage = patch.page ?? page;

    next.set("start_date", start);
    next.set("end_date", end);
    if (nextPage > 1) next.set("page", String(nextPage));
    for (const meal of meals) {
      next.append("meal_type", meal);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>
            Filter by date range and meal type. Filters are kept in the URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(range) =>
              updateParams({
                start_date: range.start_date,
                end_date: range.end_date,
                page: 1,
              })
            }
          />
          <MealTypeFilter
            selected={mealTypes}
            onChange={(next) => updateParams({ meal_types: next, page: 1 })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {startDate} → {endDate}
            {mealTypes.length ? ` · ${mealTypes.join(", ")}` : " · all meals"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entriesQuery.isLoading ? <LoadingState label="Loading entries..." /> : null}

          {entriesQuery.isError ? (
            <ErrorState
              message="Could not load entries for this range."
              onRetry={() => void entriesQuery.refetch()}
            />
          ) : null}

          {entriesQuery.data && entriesQuery.data.items.length === 0 ? (
            <EmptyState
              title="No entries in this range"
              description="Try a wider date range or clear meal type filters."
            />
          ) : null}

          {entriesQuery.data && entriesQuery.data.items.length > 0 ? (
            <>
              <EntriesTable
                entries={entriesQuery.data.items}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
              <Pagination
                page={entriesQuery.data.page}
                totalPages={entriesQuery.data.total_pages}
                total={entriesQuery.data.total}
                onPageChange={(nextPage) => updateParams({ page: nextPage })}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <EditEntryDialog
        entry={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
      />
      <DeleteEntryDialog
        entry={deleting}
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
