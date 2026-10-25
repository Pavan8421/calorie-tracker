import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Pagination } from "@/components/common/Pagination";
import { buttonVariants } from "@/components/ui/button-variants";
import { DeleteEntryDialog } from "@/features/entries/components/DeleteEntryDialog";
import { EditEntryDialog } from "@/features/entries/components/EditEntryDialog";
import { EntriesTable, type DaySummary } from "@/features/entries/components/EntriesTable";
import { MealTypeFilter } from "@/features/entries/components/MealTypeFilter";
import { useEntries } from "@/features/entries/hooks";
import type { FoodEntry, MealType } from "@/features/entries/types";
import { MEAL_TYPES } from "@/features/entries/types";
import { useCalorieTrend } from "@/features/reports/hooks";
import { defaultEntryRange } from "@/lib/dates";
import { toNumber } from "@/lib/numbers";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const MEAL_SET = new Set(MEAL_TYPES.map((meal) => meal.value));

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
  const [query, setQuery] = useState("");

  const startDate = searchParams.get("start_date") || defaults.start_date;
  const endDate = searchParams.get("end_date") || defaults.end_date;
  const mealTypes = parseMealTypes(searchParams);
  const mealTypesKey = mealTypes.join(",");
  const page = parsePage(searchParams);

  const listParams = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      meal_types: mealTypesKey ? (mealTypesKey.split(",") as MealType[]) : ([] as MealType[]),
      page,
      page_size: PAGE_SIZE,
    }),
    [startDate, endDate, mealTypesKey, page],
  );

  const entriesQuery = useEntries(listParams);
  const trend = useCalorieTrend({ start_date: startDate, end_date: endDate });
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

  const items = entriesQuery.data?.items ?? [];
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((entry) => entry.food_name.toLowerCase().includes(needle))
    : items;
  const daySummaries = useMemo(() => summariesFromTrend(trend.data?.points ?? []), [trend.data?.points]);
  const summaryLine = buildSummary(
    entriesQuery.data?.total ?? 0,
    trend.data?.points ?? [],
    trend.isLoading,
  );

  return (
    <div className="flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">Entries</h1>
          <p className="text-xs text-muted-foreground">{summaryLine}</p>
        </div>
        <Link to="/log" className={cn(buttonVariants({ size: "sm" }), "font-bold")}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Log meal
        </Link>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <DateRangePicker
          compact
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MealTypeFilter
            compact
            selected={mealTypes}
            onChange={(next) => updateParams({ meal_types: next, page: 1 })}
          />
          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="entry-search" className="sr-only">
              Search foods
            </label>
            <input
              id="entry-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search foods"
              className="h-8 w-full rounded-lg border border-border-strong bg-card pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <section className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card">
        {entriesQuery.isLoading ? <LoadingState label="Loading entries..." /> : null}

        {entriesQuery.isError ? (
          <ErrorState
            message="Could not load entries for this range."
            onRetry={() => void entriesQuery.refetch()}
          />
        ) : null}

        {entriesQuery.data && items.length === 0 ? (
          <EmptyState
            title="No entries in this range"
            description="Try a wider date range or clear the meal filters."
          />
        ) : null}

        {entriesQuery.data && items.length > 0 && visible.length === 0 ? (
          <EmptyState
            title="No foods match"
            description="Nothing on this page matches that search."
          />
        ) : null}

        {visible.length > 0 ? (
          <EntriesTable
            entries={visible}
            daySummaries={needle || mealTypes.length > 0 ? undefined : daySummaries}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        ) : null}
      </section>

      <Pagination
        page={entriesQuery.data?.page ?? page}
        totalPages={entriesQuery.data?.total_pages ?? 1}
        total={entriesQuery.data?.total}
        onPageChange={(nextPage) => updateParams({ page: nextPage })}
      />

      <EditEntryDialog entry={editing} open={Boolean(editing)} onClose={() => setEditing(null)} />
      <DeleteEntryDialog
        entry={deleting}
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function summariesFromTrend(
  points: { day: string; calories: string | number; goal_calories: number | null }[],
): Record<string, DaySummary> {
  const summaries: Record<string, DaySummary> = {};
  for (const point of points) {
    summaries[point.day.slice(0, 10)] = {
      calories: toNumber(point.calories) ?? 0,
      goal: point.goal_calories,
    };
  }
  return summaries;
}

function buildSummary(
  totalEntries: number,
  points: { calories: string | number }[],
  trendLoading: boolean,
): string {
  if (trendLoading && totalEntries === 0) return "Loading entries…";
  const activeDays = points.filter((point) => (toNumber(point.calories) ?? 0) > 0).length;
  const totalKcal = points.reduce((sum, point) => sum + (toNumber(point.calories) ?? 0), 0);
  const entriesLabel = `${totalEntries} ${totalEntries === 1 ? "entry" : "entries"}`;
  if (trendLoading || points.length === 0) return entriesLabel;
  const daysLabel = `${activeDays} ${activeDays === 1 ? "day" : "days"}`;
  return `${entriesLabel} over ${daysLabel}, ${Math.round(totalKcal).toLocaleString()} kcal in total.`;
}
