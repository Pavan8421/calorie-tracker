import { z } from "zod";

function optionalNumber(min: number, max: number) {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return Number(val);
  }, z.number().min(min).max(max).optional());
}

function optionalDate() {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    return val;
  }, z.string().optional());
}

export const goalFormSchema = z.object({
  calories_kcal: z.coerce.number().int().min(800, "Min 800").max(10000, "Max 10000"),
  protein_g: z.coerce.number().min(0, "Must be ≥ 0"),
  carbs_g: z.coerce.number().min(0, "Must be ≥ 0"),
  fat_g: z.coerce.number().min(0, "Must be ≥ 0"),
  fiber_g: optionalNumber(0, 1000),
  target_weight_kg: optionalNumber(20, 400),
  target_date: optionalDate(),
  effective_from: optionalDate(),
});

export const weightLogSchema = z.object({
  weight_kg: z.coerce.number().min(20, "Min 20 kg").max(400, "Max 400 kg"),
  logged_on: optionalDate(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;
export type WeightLogFormValues = z.infer<typeof weightLogSchema>;
