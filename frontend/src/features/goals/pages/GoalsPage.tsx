import { ApiError } from "@/api/errors";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
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

  const goal = currentQuery.data ?? null;

  return (
    <div className="tabular-data flex flex-col gap-3">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight">Goals</h1>
        <p className="text-xs text-muted-foreground">Daily targets and your weight goal.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          {currentQuery.isLoading ? <LoadingState label="Loading current goals..." /> : null}
          {currentQuery.isError && !goalNotSet ? (
            <ErrorState
              message="Could not load your current goals."
              onRetry={() => void currentQuery.refetch()}
            />
          ) : null}
          {goal ? <CurrentGoalCard goal={goal} /> : null}
          {!currentQuery.isLoading && (goalNotSet || (!goal && !currentQuery.isError)) ? (
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold">Daily goal</h2>
              <p className="text-xs text-muted-foreground">
                No daily goal yet. Set calories and macros below.
              </p>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <WeightProgressCard goal={goal} />
          <WeightLogForm />
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-bold">{goal ? "Change goals" : "Set goals"}</h2>
          <p className="text-[11px] text-muted-foreground">
            New goals apply from today. Saving again today replaces today’s version.
          </p>
        </div>
        <GoalForm current={goal} />
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card py-3">
          <h2 className="px-4 text-sm font-bold">Goal history</h2>
          <GoalHistoryTable />
        </section>
        <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card py-3">
          <h2 className="px-4 text-sm font-bold">Weigh-ins</h2>
          <WeightHistoryTable />
        </section>
      </div>
    </div>
  );
}
