import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useRecentEntries } from "@/features/entries/hooks";
import type { FoodEntry } from "@/features/entries/types";
import { formatDecimal } from "@/lib/numbers";
import { cn } from "@/lib/utils";

type RecentFoodsPickerProps = {
  onSelect: (entry: FoodEntry) => void;
};

export function RecentFoodsPicker({ onSelect }: RecentFoodsPickerProps) {
  const recent = useRecentEntries(1, 12);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = recent.data?.items ?? [];
  const filtered = useMemo(() => {
    const list = recent.data?.items ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((entry) => entry.food_name.toLowerCase().includes(needle));
  }, [recent.data?.items, query]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-card py-2.5">
      <div className="flex shrink-0 flex-col gap-1.5 px-3">
        <h2 className="text-sm font-bold">Recent foods</h2>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="recent-food-search" className="sr-only">
            Search recent foods
          </label>
          <input
            id="recent-food-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recent foods"
            className="h-8 w-full rounded-lg border border-border-strong bg-card pl-8 pr-3 text-xs font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {recent.isLoading ? <LoadingState label="Loading recent foods..." /> : null}
      {recent.isError ? (
        <div className="px-4">
          <ErrorState
            message="Could not load recent foods."
            onRetry={() => void recent.refetch()}
          />
        </div>
      ) : null}
      {!recent.isLoading && !recent.isError && items.length === 0 ? (
        <div className="px-4">
          <EmptyState
            title="No recent foods"
            description="Logged meals will appear here for one-click re-logging."
          />
        </div>
      ) : null}
      {!recent.isLoading && !recent.isError && items.length > 0 && filtered.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground">No foods match that search.</p>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((entry) => {
            const selected = entry.id === selectedId;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedId(entry.id);
                    onSelect(entry);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-3 px-3 text-left",
                    selected ? "bg-[#EEF7F5]" : "hover:bg-muted",
                  )}
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-xs",
                        selected ? "font-bold text-primary-ink" : "font-semibold",
                      )}
                    >
                      {entry.food_name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatDecimal(entry.quantity, 0)} {entry.unit}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-semibold",
                      selected ? "text-primary-ink" : "text-stone-700",
                    )}
                  >
                    {formatDecimal(entry.calories_kcal, 0)} kcal
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
