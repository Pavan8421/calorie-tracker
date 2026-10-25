import { Button } from "@/components/ui/button";
import type { DraftFoodItem, ImageAnalysisResponse } from "@/features/scan/types";
import { formatDecimal } from "@/lib/numbers";
import { cn } from "@/lib/utils";

type DraftReviewProps = {
  analysis: ImageAnalysisResponse;
  onUse: (item: DraftFoodItem) => void;
  onRescan: () => void;
};

function confidenceClass(confidence: ImageAnalysisResponse["confidence"]): string {
  if (confidence === "high") return "bg-teal-100 text-teal-900";
  if (confidence === "low") return "bg-amber-100 text-amber-900";
  return "bg-muted text-foreground";
}

export function DraftReview({ analysis, onUse, onRescan }: DraftReviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
            confidenceClass(analysis.confidence),
          )}
        >
          {analysis.confidence} confidence
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          Detected: {analysis.image_type.replace("_", " ")}
        </span>
      </div>

      {analysis.notes ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {analysis.notes}
        </p>
      ) : null}

      {analysis.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No food items were detected.</p>
      ) : (
        <ul className="space-y-3">
          {analysis.items.map((item, index) => (
            <li
              key={`${item.food_name}-${index}`}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.food_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDecimal(item.quantity)} {item.unit} ·{" "}
                    {formatDecimal(item.calories_kcal)} kcal
                  </p>
                  <p className="text-xs text-muted-foreground">
                    P {formatDecimal(item.protein_g)} · C {formatDecimal(item.carbs_g)} · F{" "}
                    {formatDecimal(item.fat_g)}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => onUse(item)}>
                  Use this
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" onClick={onRescan}>
        Scan another photo
      </Button>
    </div>
  );
}
