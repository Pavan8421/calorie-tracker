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
  if (status === "low") return "bg-[#E3A828]";
  if (status === "high") return "bg-destructive";
  if (status === "adequate") return "bg-primary";
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

  const missingValue = nutrients.some((nutrient) => nutrient.percent_daily_value == null);

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {nutrients.map((nutrient) => {
          const pct = nutrient.percent_daily_value ?? 0;
          const width = Math.min(100, Math.max(0, pct));
          return (
            <li key={nutrient.code} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold">
                  {nutrient.name}{" "}
                  <span className="font-normal text-muted-foreground">{nutrient.unit}</span>
                </span>
                <span className="text-muted-foreground">
                  {formatDecimal(nutrient.daily_average, 1)}
                  {nutrient.percent_daily_value != null
                    ? ` · ${nutrient.percent_daily_value.toFixed(0)}%`
                    : ""}
                  {" · "}
                  <span
                    className={cn(
                      nutrient.status === "low" && "text-[#9A5B0B]",
                      nutrient.status === "adequate" && "text-primary",
                      nutrient.status === "high" && "text-destructive",
                    )}
                  >
                    {statusLabel(nutrient.status)}
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ring-track">
                <div
                  className={cn("h-full rounded-full", statusColor(nutrient.status))}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {missingValue ? (
        <p className="text-[11px] text-muted-foreground">
          Some entries have no micronutrient data, so these averages can be incomplete.
        </p>
      ) : null}
    </div>
  );
}
