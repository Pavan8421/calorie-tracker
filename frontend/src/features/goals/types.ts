/** Backend Decimal fields arrive as JSON strings. */
export type DecimalValue = string | number;

export type WeightProgress = {
  start_kg: DecimalValue;
  current_kg: DecimalValue;
  target_kg: DecimalValue;
  progress_pct: number;
};

export type Goal = {
  id: string;
  calories_kcal: number;
  protein_g: DecimalValue;
  carbs_g: DecimalValue;
  fat_g: DecimalValue;
  fiber_g: DecimalValue | null;
  target_weight_kg: DecimalValue | null;
  target_date: string | null;
  effective_from: string;
  created_at: string;
  updated_at: string;
  warnings: string[];
};

export type CurrentGoal = Goal & {
  weight_progress: WeightProgress | null;
};

export type GoalCreatePayload = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  target_weight_kg?: number | null;
  target_date?: string | null;
  effective_from?: string | null;
};

export type WeightLog = {
  id: string;
  logged_on: string;
  weight_kg: DecimalValue;
  created_at: string;
  updated_at: string;
};

export type WeightLogCreatePayload = {
  weight_kg: number;
  logged_on?: string | null;
};

export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};
