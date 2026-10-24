import { cn } from "@/lib/utils";

type ProgressBarProps = {
  label: string;
  actual: number;
  goal: number | null;
  unit?: string;
};

export function ProgressBar({ label, actual, goal, unit = "" }: ProgressBarProps) {
  const pct = goal && goal > 0 ? Math.min(100, (actual / goal) * 100) : 0;
  const over = goal != null && goal > 0 && actual > goal;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(actual)}
          {unit}
          {goal != null ? ` / ${Math.round(goal)}${unit}` : ""}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${goal ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}
