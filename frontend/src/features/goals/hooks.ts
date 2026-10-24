import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import * as goalsApi from "@/features/goals/api";
import type { GoalCreatePayload, WeightLogCreatePayload } from "@/features/goals/types";

export const goalKeys = {
  all: ["goals"] as const,
  current: ["goals", "current"] as const,
  list: (page: number, pageSize: number) => ["goals", "list", page, pageSize] as const,
};

export const weightKeys = {
  all: ["weight-logs"] as const,
  list: (page: number, pageSize: number) => ["weight-logs", "list", page, pageSize] as const,
};

export function useCurrentGoal() {
  return useQuery({
    queryKey: goalKeys.current,
    queryFn: goalsApi.getCurrentGoal,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.code === "GOAL_NOT_SET") return false;
      return failureCount < 1;
    },
  });
}

export function useGoalHistory(page: number, pageSize = 10) {
  return useQuery({
    queryKey: goalKeys.list(page, pageSize),
    queryFn: () => goalsApi.listGoals(page, pageSize),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GoalCreatePayload) => goalsApi.createGoal(payload),
    onSuccess: (goal) => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.all });
      if (goal.warnings.length) {
        goal.warnings.forEach((w) => toast.warning(w));
      } else {
        toast.success("Goals saved");
      }
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => goalsApi.deleteGoal(goalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Goal version deleted");
    },
  });
}

export function useWeightHistory(page: number, pageSize = 10) {
  return useQuery({
    queryKey: weightKeys.list(page, pageSize),
    queryFn: () => goalsApi.listWeightLogs(page, pageSize),
  });
}

export function useCreateWeightLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WeightLogCreatePayload) => goalsApi.createWeightLog(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: weightKeys.all });
      void queryClient.invalidateQueries({ queryKey: goalKeys.current });
      toast.success("Weight logged");
    },
  });
}

export function useDeleteWeightLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => goalsApi.deleteWeightLog(logId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: weightKeys.all });
      void queryClient.invalidateQueries({ queryKey: goalKeys.current });
      toast.success("Weight log deleted");
    },
  });
}
