import { useQuery } from "@tanstack/react-query";

import * as reportsApi from "@/features/reports/api";
import type { ReportRangeParams } from "@/features/reports/types";

export const reportKeys = {
  all: ["reports"] as const,
  dailySummary: (date?: string) => ["reports", "daily-summary", date ?? "today"] as const,
  calorieTrend: (params: ReportRangeParams) => ["reports", "calorie-trend", params] as const,
  macros: (params: ReportRangeParams & { group_by: "day" | "week" }) =>
    ["reports", "macros", params] as const,
  micronutrients: (params: ReportRangeParams) =>
    ["reports", "micronutrients", params] as const,
  goalComparison: (params: ReportRangeParams) =>
    ["reports", "goal-comparison", params] as const,
};

export function useDailySummary(date?: string) {
  return useQuery({
    queryKey: reportKeys.dailySummary(date),
    queryFn: () => reportsApi.getDailySummary(date),
  });
}

export function useCalorieTrend(params: ReportRangeParams) {
  return useQuery({
    queryKey: reportKeys.calorieTrend(params),
    queryFn: () => reportsApi.getCalorieTrend(params),
  });
}

export function useMacroBreakdown(
  params: ReportRangeParams & { group_by: "day" | "week" },
) {
  return useQuery({
    queryKey: reportKeys.macros(params),
    queryFn: () => reportsApi.getMacroBreakdown(params),
  });
}

export function useMicronutrientSummary(params: ReportRangeParams) {
  return useQuery({
    queryKey: reportKeys.micronutrients(params),
    queryFn: () => reportsApi.getMicronutrientSummary(params),
  });
}

export function useGoalComparison(params: ReportRangeParams) {
  return useQuery({
    queryKey: reportKeys.goalComparison(params),
    queryFn: () => reportsApi.getGoalComparison(params),
  });
}
