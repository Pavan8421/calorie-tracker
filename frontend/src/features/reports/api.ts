import { apiClient } from "@/api/client";
import type {
  CalorieTrend,
  DailySummary,
  GoalComparison,
  MacroBreakdown,
  MicronutrientSummary,
  ReportRangeParams,
} from "@/features/reports/types";

export async function getDailySummary(date?: string): Promise<DailySummary> {
  const { data } = await apiClient.get<DailySummary>("/reports/daily-summary", {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function getCalorieTrend(params: ReportRangeParams): Promise<CalorieTrend> {
  const { data } = await apiClient.get<CalorieTrend>("/reports/calorie-trend", {
    params,
  });
  return data;
}

export async function getMacroBreakdown(
  params: ReportRangeParams & { group_by?: "day" | "week" },
): Promise<MacroBreakdown> {
  const { data } = await apiClient.get<MacroBreakdown>("/reports/macros", {
    params: {
      start_date: params.start_date,
      end_date: params.end_date,
      group_by: params.group_by ?? "day",
    },
  });
  return data;
}

export async function getMicronutrientSummary(
  params: ReportRangeParams,
): Promise<MicronutrientSummary> {
  const { data } = await apiClient.get<MicronutrientSummary>("/reports/micronutrients", {
    params,
  });
  return data;
}

export async function getGoalComparison(params: ReportRangeParams): Promise<GoalComparison> {
  const { data } = await apiClient.get<GoalComparison>("/reports/goal-comparison", {
    params,
  });
  return data;
}
