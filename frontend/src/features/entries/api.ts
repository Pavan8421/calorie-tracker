import { apiClient } from "@/api/client";
import type {
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
