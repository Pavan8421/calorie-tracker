import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { useRecentEntries } from "@/features/entries/hooks";
import type { FoodEntry } from "@/features/entries/types";
import { formatDecimal } from "@/lib/numbers";

type RecentFoodsPickerProps = {
  onSelect: (entry: FoodEntry) => void;
};

export function RecentFoodsPicker({ onSelect }: RecentFoodsPickerProps) {
  const recent = useRecentEntries(1, 12);

  if (recent.isLoading) return <LoadingState label="Loading recent foods..." />;
  if (recent.isError) {
    return (
      <ErrorState
        message="Could not load recent foods."
        onRetry={() => void recent.refetch()}
      />
    );
  }

  const items = recent.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No recent foods"
        description="Logged meals will appear here for one-click re-logging."
      />
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((entry) => (
        <li key={entry.id}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
            onClick={() => onSelect(entry)}
          >
            <span className="truncate font-medium">{entry.food_name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {formatDecimal(entry.quantity)} {entry.unit} · {formatDecimal(entry.calories_kcal)}{" "}
              kcal
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
