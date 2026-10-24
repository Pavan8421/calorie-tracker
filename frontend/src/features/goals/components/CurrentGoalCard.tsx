import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CurrentGoal } from "@/features/goals/types";
import { formatDecimal } from "@/lib/numbers";

type CurrentGoalCardProps = {
  goal: CurrentGoal;
};

export function CurrentGoalCard({ goal }: CurrentGoalCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current goals</CardTitle>
        <CardDescription>Effective from {goal.effective_from}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Calories" value={`${goal.calories_kcal} kcal`} />
          <Stat label="Protein" value={`${formatDecimal(goal.protein_g)} g`} />
          <Stat label="Carbs" value={`${formatDecimal(goal.carbs_g)} g`} />
          <Stat label="Fat" value={`${formatDecimal(goal.fat_g)} g`} />
          {goal.fiber_g != null ? (
            <Stat label="Fiber" value={`${formatDecimal(goal.fiber_g)} g`} />
          ) : null}
          {goal.target_weight_kg != null ? (
            <Stat label="Target weight" value={`${formatDecimal(goal.target_weight_kg)} kg`} />
          ) : null}
          {goal.target_date ? <Stat label="Target date" value={goal.target_date} /> : null}
        </dl>
        {goal.warnings.length > 0 ? (
          <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {goal.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
