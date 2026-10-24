export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type EntrySource = "manual" | "ai_image" | "pdf_import" | "chat";

export type ClientEntrySource = "manual" | "ai_image";

export type DecimalValue = string | number;

export type Nutrient = {
  code: string;
  name: string;
  unit: string;
  daily_value: number | null;
};

export type FoodEntry = {
  id: string;
  meal_type: MealType;
  food_name: string;
  quantity: DecimalValue;
  unit: string;
  consumed_at: string;
  consumed_on: string;
  calories_kcal: DecimalValue;
  protein_g: DecimalValue;
  carbs_g: DecimalValue;
  fat_g: DecimalValue;
  fiber_g: DecimalValue | null;
  sugar_g: DecimalValue | null;
  micronutrients: Record<string, number>;
  source: EntrySource;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FoodEntryCreatePayload = {
  meal_type: MealType;
  food_name: string;
  quantity: number;
  unit: string;
  consumed_at?: string | null;
  calories_kcal: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  micronutrients?: Record<string, number>;
  source?: ClientEntrySource;
  notes?: string | null;
};

export type FoodEntryUpdatePayload = Partial<FoodEntryCreatePayload>;

export type EntryListParams = {
  start_date: string;
  end_date: string;
  meal_types: MealType[];
  page: number;
  page_size?: number;
};

export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
];

export const UNITS = ["g", "ml", "piece", "serving", "cup", "tbsp", "tsp"] as const;

export const ENTRY_SOURCE_LABELS: Record<EntrySource, string> = {
  manual: "Manual",
  ai_image: "AI image",
  pdf_import: "PDF import",
  chat: "Chat",
};
