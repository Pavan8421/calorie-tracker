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
  if (confidence === "high") return "bg-primary-soft text-primary-ink";
  if (confidence === "low") return "bg-[#F8E7C4] text-[#9A5B0B]";
  return "bg-muted text-foreground";
}

export function DraftReview({ analysis, onUse, onRescan }: DraftReviewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
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
        <p className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          {analysis.notes}
        </p>
      ) : null}

      {analysis.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No food items were detected.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {analysis.items.map((item, index) => (
            <li
              key={`${item.food_name}-${index}`}
              className="rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.food_name}</p>
                  <p className="text-xs text-muted-foreground">
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

      <Button type="button" variant="outline" size="sm" onClick={onRescan}>
        Scan another photo
      </Button>
    </div>
  );
}
