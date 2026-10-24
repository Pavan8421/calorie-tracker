import { apiClient } from "@/api/client";
import type {
  EntryListParams,
  FoodEntry,
  FoodEntryCreatePayload,
  FoodEntryUpdatePayload,
  Nutrient,
  Page,
} from "@/features/entries/types";

export async function listNutrients(): Promise<Nutrient[]> {
  const { data } = await apiClient.get<Nutrient[]>("/nutrients");
  return data;
}

export async function createEntry(payload: FoodEntryCreatePayload): Promise<FoodEntry> {
  const { data } = await apiClient.post<FoodEntry>("/entries", payload);
  return data;
}

export async function getEntry(id: string): Promise<FoodEntry> {
  const { data } = await apiClient.get<FoodEntry>(`/entries/${id}`);
  return data;
}

export async function updateEntry(
  id: string,
  payload: FoodEntryUpdatePayload,
): Promise<FoodEntry> {
  const { data } = await apiClient.patch<FoodEntry>(`/entries/${id}`, payload);
  return data;
}

export async function deleteEntry(id: string): Promise<void> {
  await apiClient.delete(`/entries/${id}`);
}

export async function listRecentEntries(page = 1, pageSize = 20): Promise<Page<FoodEntry>> {
  const { data } = await apiClient.get<Page<FoodEntry>>("/entries/recent", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function listEntries(params: EntryListParams): Promise<Page<FoodEntry>> {
  const query = new URLSearchParams();
  query.set("start_date", params.start_date);
  query.set("end_date", params.end_date);
  query.set("page", String(params.page));
  query.set("page_size", String(params.page_size ?? 20));
  for (const meal of params.meal_types) {
    query.append("meal_type", meal);
  }
  const { data } = await apiClient.get<Page<FoodEntry>>(`/entries?${query.toString()}`);
  return data;
}
