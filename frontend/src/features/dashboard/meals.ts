import type { MealType } from "@/features/entries/types";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "#134E4A",
  lunch: "#0F766E",
  dinner: "#5EB8AC",
  snacks: "#A9DCD4",
};

export const MEAL_ADD_LABEL: Record<MealType, string> = {
  breakfast: "Add breakfast",
  lunch: "Add lunch",
  dinner: "Add dinner",
  snacks: "Add a snack",
};

export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString();
}
