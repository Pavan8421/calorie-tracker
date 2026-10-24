import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { useMicronutrientSummary } from "@/features/reports/hooks";
import type { MicroStatus, ReportRangeParams } from "@/features/reports/types";
import { formatDecimal } from "@/lib/numbers";
import { cn } from "@/lib/utils";

type MicronutrientSummaryProps = {
  range: ReportRangeParams;
};

function statusColor(status: MicroStatus | null): string {
  if (status === "low") return "bg-amber-500";
  if (status === "high") return "bg-rose-500";
  if (status === "adequate") return "bg-teal-600";
  return "bg-muted-foreground";
}

function statusLabel(status: MicroStatus | null): string {
  if (!status) return "No DV";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function MicronutrientSummary({ range }: MicronutrientSummaryProps) {
  const query = useMicronutrientSummary(range);

  if (query.isLoading) return <LoadingState label="Loading micronutrients..." />;
  if (query.isError) {
    return (
      <ErrorState
        message="Could not load micronutrient summary."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const nutrients = query.data?.nutrients ?? [];
  if (nutrients.length === 0) {
    return (
      <EmptyState
        title="No micronutrient data"
        description="Add micronutrients when logging meals to see averages here."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {nutrients.map((n) => {
        const pct = n.percent_daily_value ?? 0;
        const width = Math.min(100, Math.max(0, pct));
        return (
          <li key={n.code} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                {n.name}{" "}
                <span className="font-normal text-muted-foreground">({n.unit})</span>
              </span>
              <span className="text-muted-foreground">
                avg {formatDecimal(n.daily_average, 2)}
                {n.percent_daily_value != null
                  ? ` · ${n.percent_daily_value.toFixed(0)}% DV`
                  : ""}
                {" · "}
                <span
                  className={cn(
                    n.status === "low" && "text-amber-700",
                    n.status === "adequate" && "text-teal-800",
                    n.status === "high" && "text-rose-700",
                  )}
                >
                  {statusLabel(n.status)}
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", statusColor(n.status))}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
