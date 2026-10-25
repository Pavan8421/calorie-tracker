import type { EntryFormValues } from "@/features/entries/schemas";
import type {
  ClientEntrySource,
  FoodEntry,
  FoodEntryCreatePayload,
  MealType,
} from "@/features/entries/types";
import { UNITS } from "@/features/entries/types";
import type { DraftFoodItem } from "@/features/scan/types";
import { fromDatetimeLocalValue, nowDatetimeLocal, toDatetimeLocalValue } from "@/lib/datetime";
import { toNumber } from "@/lib/numbers";

const UNIT_SET = new Set<string>(UNITS);

function normalizeUnit(unit: string): EntryFormValues["unit"] {
  const trimmed = unit.trim().toLowerCase();
  if (UNIT_SET.has(trimmed)) return trimmed as EntryFormValues["unit"];
  return "serving";
}

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

/** Prefill from an AI draft item. */
export function draftToFormValues(
  draft: DraftFoodItem,
  currentMealType: MealType | string,
  analysisNotes?: string,
): EntryFormValues {
  return {
    meal_type: currentMealType,
    food_name: draft.food_name,
    quantity: draft.quantity,
    unit: normalizeUnit(draft.unit),
    consumed_at_local: nowDatetimeLocal(),
    calories_kcal: draft.calories_kcal,
    protein_g: draft.protein_g,
    carbs_g: draft.carbs_g,
    fat_g: draft.fat_g,
    fiber_g: draft.fiber_g ?? undefined,
    sugar_g: draft.sugar_g ?? undefined,
    notes: analysisNotes?.trim() ?? "",
    micronutrients: Object.entries(draft.micronutrients ?? {}).map(([code, value]) => ({
      code,
      value: Number(value),
    })),
  };
}

export function formValuesToPayload(
  values: EntryFormValues,
  source: ClientEntrySource = "manual",
): FoodEntryCreatePayload {
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
    source,
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}
