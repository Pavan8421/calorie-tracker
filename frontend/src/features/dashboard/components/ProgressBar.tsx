import { cn } from "@/lib/utils";

type ProgressBarProps = {
  label: string;
  actual: number;
  goal: number | null;
  unit?: string;
  barClassName?: string;
};

export function ProgressBar({
  label,
  actual,
  goal,
  unit = "",
  barClassName = "bg-primary",
}: ProgressBarProps) {
  const pct = goal && goal > 0 ? Math.min(100, (actual / goal) * 100) : actual > 0 ? 100 : 0;
  const over = goal != null && goal > 0 && actual > goal;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        <span>
          <strong>{Math.round(actual)}</strong>
          <span className="text-muted-foreground">
            {goal != null ? ` / ${Math.round(goal)}${unit}` : unit}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-md bg-ring-track">
        <div
          className={cn("h-full rounded-md", over ? "bg-destructive" : barClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
