import type { DecimalValue, MealType } from "@/features/entries/types";

export type MacroTotals = {
  calories_kcal: DecimalValue;
  protein_g: DecimalValue;
  carbs_g: DecimalValue;
  fat_g: DecimalValue;
};

export type GoalSnapshot = {
  calories_kcal: number;
  protein_g: DecimalValue;
  carbs_g: DecimalValue;
  fat_g: DecimalValue;
};

export type MealBreakdown = {
  meal_type: MealType;
  calories_kcal: DecimalValue;
  protein_g: DecimalValue;
  carbs_g: DecimalValue;
  fat_g: DecimalValue;
  entry_count: number;
};

export type DailySummary = {
  date: string;
  totals: MacroTotals;
  by_meal: MealBreakdown[];
  goal: GoalSnapshot | null;
  remaining: MacroTotals | null;
};

export type CalorieTrendPoint = {
  day: string;
  calories: DecimalValue;
  goal_calories: number | null;
};

export type CalorieTrend = {
  start_date: string;
  end_date: string;
  points: CalorieTrendPoint[];
};

export type MacroPeriodPoint = {
  period_start: string;
  protein_g: DecimalValue;
  carbs_g: DecimalValue;
  fat_g: DecimalValue;
};

export type MacroCalorieShare = {
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
};

export type MacroBreakdown = {
  start_date: string;
  end_date: string;
  group_by: "day" | "week";
  points: MacroPeriodPoint[];
  calorie_share: MacroCalorieShare;
};

export type MicroStatus = "low" | "adequate" | "high";

export type MicronutrientItem = {
  code: string;
  name: string;
  unit: string;
  total: DecimalValue;
  daily_average: DecimalValue;
  daily_value: number | null;
  percent_daily_value: number | null;
  status: MicroStatus | null;
};

export type MicronutrientSummary = {
  start_date: string;
  end_date: string;
  days_in_range: number;
  nutrients: MicronutrientItem[];
};

export type DayActuals = MacroTotals;

export type GoalComparisonDay = {
  day: string;
  actual: DayActuals;
  goal: GoalSnapshot | null;
};

export type GoalComparisonSummary = {
  days_with_goal: number;
  avg_actual_calories: number | null;
  avg_goal_calories: number | null;
  days_within_10_pct: number;
  adherence_pct: number | null;
};

export type GoalComparison = {
  start_date: string;
  end_date: string;
  days: GoalComparisonDay[];
  summary: GoalComparisonSummary;
};

export type ReportRangeParams = {
  start_date: string;
  end_date: string;
};
