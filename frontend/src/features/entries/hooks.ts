import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as entriesApi from "@/features/entries/api";
import type {
  EntryListParams,
  FoodEntryCreatePayload,
  FoodEntryUpdatePayload,
} from "@/features/entries/types";
import { reportKeys } from "@/features/reports/hooks";

function invalidateEntryRelated(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: entryKeys.all });
  void queryClient.invalidateQueries({ queryKey: reportKeys.all });
}

export const entryKeys = {
  all: ["entries"] as const,
  recent: (page: number, pageSize: number) =>
    ["entries", "recent", page, pageSize] as const,
  list: (params: EntryListParams) => ["entries", "list", params] as const,
  detail: (id: string) => ["entries", "detail", id] as const,
};

export const nutrientKeys = {
  all: ["nutrients"] as const,
};

export function useNutrients() {
  return useQuery({
    queryKey: nutrientKeys.all,
    queryFn: entriesApi.listNutrients,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useRecentEntries(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: entryKeys.recent(page, pageSize),
    queryFn: () => entriesApi.listRecentEntries(page, pageSize),
  });
}

export function useEntries(params: EntryListParams) {
  return useQuery({
    queryKey: entryKeys.list(params),
    queryFn: () => entriesApi.listEntries(params),
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FoodEntryCreatePayload) => entriesApi.createEntry(payload),
    onSuccess: () => {
      invalidateEntryRelated(queryClient);
      toast.success("Meal logged");
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FoodEntryUpdatePayload }) =>
      entriesApi.updateEntry(id, payload),
    onSuccess: () => {
      invalidateEntryRelated(queryClient);
      toast.success("Entry updated");
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entriesApi.deleteEntry(id),
    onSuccess: () => {
      invalidateEntryRelated(queryClient);
      toast.success("Entry deleted");
    },
  });
}
