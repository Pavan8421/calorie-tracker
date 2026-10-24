import type { EntryFormValues } from "@/features/entries/schemas";
import type {
  FoodEntry,
  FoodEntryCreatePayload,
  MealType,
} from "@/features/entries/types";
import { fromDatetimeLocalValue, nowDatetimeLocal, toDatetimeLocalValue } from "@/lib/datetime";
import { toNumber } from "@/lib/numbers";

export function emptyEntryFormValues(): EntryFormValues {
  return {
    meal_type: "breakfast",
    food_name: "",
    quantity: 1,
    unit: "serving",
    consumed_at_local: nowDatetimeLocal(),
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: undefined,
    sugar_g: undefined,
    notes: "",
    micronutrients: [],
  };
}

export function entryToFormValues(entry: FoodEntry): EntryFormValues {
  return {
    meal_type: entry.meal_type,
    food_name: entry.food_name,
    quantity: toNumber(entry.quantity) ?? 1,
    unit: entry.unit as EntryFormValues["unit"],
    consumed_at_local: toDatetimeLocalValue(entry.consumed_at),
    calories_kcal: toNumber(entry.calories_kcal) ?? 0,
    protein_g: toNumber(entry.protein_g) ?? 0,
    carbs_g: toNumber(entry.carbs_g) ?? 0,
    fat_g: toNumber(entry.fat_g) ?? 0,
    fiber_g: toNumber(entry.fiber_g) ?? undefined,
    sugar_g: toNumber(entry.sugar_g) ?? undefined,
    notes: entry.notes ?? "",
    micronutrients: Object.entries(entry.micronutrients ?? {}).map(([code, value]) => ({
      code,
      value: Number(value),
    })),
  };
}

/** Prefill from a recent food — keep selected meal type; set time to now. */
export function recentFoodToFormValues(
  entry: FoodEntry,
  currentMealType: MealType | string,
): EntryFormValues {
  return {
    ...entryToFormValues(entry),
    meal_type: currentMealType,
    consumed_at_local: nowDatetimeLocal(),
  };
}

export function formValuesToPayload(values: EntryFormValues): FoodEntryCreatePayload {
  const micros: Record<string, number> = {};
  for (const row of values.micronutrients ?? []) {
    if (row.code) micros[row.code] = row.value;
  }

  return {
    meal_type: values.meal_type as MealType,
    food_name: values.food_name.trim(),
    quantity: values.quantity,
    unit: values.unit,
    consumed_at: fromDatetimeLocalValue(values.consumed_at_local),
    calories_kcal: values.calories_kcal,
    protein_g: values.protein_g,
    carbs_g: values.carbs_g,
    fat_g: values.fat_g,
    fiber_g: values.fiber_g ?? null,
    sugar_g: values.sugar_g ?? null,
    micronutrients: micros,
    source: "manual",
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}
