import { z } from "zod";

import { MEAL_TYPES, UNITS } from "@/features/entries/types";

const mealTypeValues = MEAL_TYPES.map((m) => m.value) as [string, ...string[]];
const unitValues = [...UNITS] as [string, ...string[]];

function optionalNumber(min: number, max: number) {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return Number(val);
  }, z.number().min(min).max(max).optional());
}

export const micronutrientRowSchema = z.object({
  code: z.string().min(1, "Select a nutrient"),
  value: z.coerce.number().min(0, "Must be ≥ 0"),
});

export const entryFormSchema = z.object({
  meal_type: z.enum(mealTypeValues),
  food_name: z.string().trim().min(1, "Food name is required").max(200),
  quantity: z.coerce.number().gt(0, "Must be greater than 0"),
  unit: z.enum(unitValues),
  consumed_at_local: z.string().optional(),
  calories_kcal: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1000),
  fat_g: z.coerce.number().min(0).max(1000),
  fiber_g: optionalNumber(0, 1000),
  sugar_g: optionalNumber(0, 1000),
  notes: z.string().max(2000).optional(),
  micronutrients: z.array(micronutrientRowSchema).default([]),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;
export type MicronutrientRow = z.infer<typeof micronutrientRowSchema>;
