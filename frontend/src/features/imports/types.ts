export type DateFormat = "DMY" | "MDY";

export type ImportStatus =
  | "pending"
  | "processing"
  | "preview_ready"
  | "completed"
  | "failed";

export type ParsedRowStatus = "valid" | "invalid";

export type ParsedRowData = {
  meal_type?: string;
  food_name?: string;
  quantity?: string | number;
  unit?: string;
  calories_kcal?: string | number;
  protein_g?: string | number;
  carbs_g?: string | number;
  fat_g?: string | number;
  fiber_g?: string | number | null;
  sugar_g?: string | number | null;
  consumed_at?: string;
  consumed_on?: string;
  notes?: string | null;
  [key: string]: unknown;
};

export type ParsedRowError = {
  field?: string | null;
  message?: string;
  [key: string]: unknown;
};

export type ParsedRow = {
  row_number: number;
  data: ParsedRowData;
  status: ParsedRowStatus;
  errors: ParsedRowError[];
};

export type ImportJob = {
  id: string;
  filename: string;
  date_format: string;
  status: ImportStatus;
  parsed_rows: ParsedRow[] | null;
  error_message: string | null;
  imported_count: number;
  created_at: string;
  updated_at: string;
};

export type ImportJobCreated = {
  id: string;
  status: ImportStatus;
};

export type ImportConfirmPayload = {
  row_numbers?: number[] | null;
  skip_duplicates?: boolean;
};

export type ImportConfirmResponse = {
  id: string;
  status: ImportStatus;
  imported_count: number;
  skipped_duplicates: number;
};

export type Page<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  pending: "Queued",
  processing: "Parsing",
  preview_ready: "Ready to review",
  completed: "Imported",
  failed: "Failed",
};

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; hint: string }[] = [
  { value: "DMY", label: "Day / Month / Year", hint: "e.g. 24/10/2026" },
  { value: "MDY", label: "Month / Day / Year", hint: "e.g. 10/24/2026" },
];
