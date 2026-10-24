import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeightProgress } from "@/features/goals/types";
import { formatDecimal } from "@/lib/numbers";

type WeightProgressCardProps = {
  progress: WeightProgress;
};

export function WeightProgressCard({ progress }: WeightProgressCardProps) {
  const pct = Math.max(0, Math.min(100, progress.progress_pct));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weight progress</CardTitle>
        <CardDescription>Start → current → target</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Start</dt>
            <dd className="text-lg font-semibold">{formatDecimal(progress.start_kg)} kg</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current</dt>
            <dd className="text-lg font-semibold">{formatDecimal(progress.current_kg)} kg</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target</dt>
            <dd className="text-lg font-semibold">{formatDecimal(progress.target_kg)} kg</dd>
          </div>
        </dl>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
