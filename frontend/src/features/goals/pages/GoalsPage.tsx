import { ApiError } from "@/api/errors";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrentGoalCard } from "@/features/goals/components/CurrentGoalCard";
import { GoalForm } from "@/features/goals/components/GoalForm";
import { GoalHistoryTable } from "@/features/goals/components/GoalHistoryTable";
import { WeightHistoryTable } from "@/features/goals/components/WeightHistoryTable";
import { WeightLogForm } from "@/features/goals/components/WeightLogForm";
import { WeightProgressCard } from "@/features/goals/components/WeightProgressCard";
import { useCurrentGoal } from "@/features/goals/hooks";

export function GoalsPage() {
  const currentQuery = useCurrentGoal();

  const goalNotSet =
    currentQuery.isError &&
    currentQuery.error instanceof ApiError &&
    currentQuery.error.code === "GOAL_NOT_SET";

  return (
    <div className="grid gap-6">
      {currentQuery.isLoading ? <LoadingState label="Loading current goals..." /> : null}

      {currentQuery.isError && !goalNotSet ? (
        <ErrorState
          message="Could not load your current goals."
          onRetry={() => void currentQuery.refetch()}
        />
      ) : null}

      {currentQuery.data ? (
        <>
          <CurrentGoalCard goal={currentQuery.data} />
          {currentQuery.data.weight_progress ? (
            <WeightProgressCard progress={currentQuery.data.weight_progress} />
          ) : null}
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{currentQuery.data ? "Update goals" : "Set goals"}</CardTitle>
          <CardDescription>
            Daily nutrition targets and optional weight goal. Same-day saves replace the current
            version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoalForm current={currentQuery.data ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goal history</CardTitle>
          <CardDescription>Past and scheduled goal versions.</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalHistoryTable />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log weight</CardTitle>
          <CardDescription>One entry per day; logging again updates that day.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeightLogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weight history</CardTitle>
          <CardDescription>Recent weigh-ins.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeightHistoryTable />
        </CardContent>
      </Card>
    </div>
  );
}
