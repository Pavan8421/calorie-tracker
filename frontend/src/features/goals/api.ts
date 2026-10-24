import { apiClient } from "@/api/client";
import type {
  CurrentGoal,
  Goal,
  GoalCreatePayload,
  Page,
  WeightLog,
  WeightLogCreatePayload,
} from "@/features/goals/types";

export async function getCurrentGoal(): Promise<CurrentGoal> {
  const { data } = await apiClient.get<CurrentGoal>("/goals/current");
  return data;
}

export async function listGoals(page = 1, pageSize = 10): Promise<Page<Goal>> {
  const { data } = await apiClient.get<Page<Goal>>("/goals", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function createGoal(payload: GoalCreatePayload): Promise<Goal> {
  const { data } = await apiClient.post<Goal>("/goals", payload);
  return data;
}

export async function deleteGoal(goalId: string): Promise<void> {
  await apiClient.delete(`/goals/${goalId}`);
}

export async function listWeightLogs(page = 1, pageSize = 10): Promise<Page<WeightLog>> {
  const { data } = await apiClient.get<Page<WeightLog>>("/weight-logs", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function createWeightLog(payload: WeightLogCreatePayload): Promise<WeightLog> {
  const { data } = await apiClient.post<WeightLog>("/weight-logs", payload);
  return data;
}

export async function deleteWeightLog(logId: string): Promise<void> {
  await apiClient.delete(`/weight-logs/${logId}`);
}
