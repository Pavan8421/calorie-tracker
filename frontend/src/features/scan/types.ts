export type AnalyzeHint = "auto" | "label" | "plate";

export type ImageType = "nutrition_label" | "food_plate" | "not_food";

export type Confidence = "high" | "medium" | "low";

export type DraftFoodItem = {
  food_name: string;
  quantity: number;
  unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  micronutrients: Record<string, number>;
};

export type ImageAnalysisResponse = {
  image_type: ImageType;
  items: DraftFoodItem[];
  confidence: Confidence;
  notes: string;
};

export const ANALYZE_HINTS: { value: AnalyzeHint; label: string; description: string }[] = [
  { value: "auto", label: "Auto", description: "Detect label or plate" },
  { value: "label", label: "Nutrition label", description: "Packaged food label" },
  { value: "plate", label: "Food plate", description: "Meal on a plate" },
];
