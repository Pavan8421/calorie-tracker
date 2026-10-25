import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/api/errors";
import { entryKeys } from "@/features/entries/hooks";
import * as importsApi from "@/features/imports/api";
import type {
  DateFormat,
  ImportConfirmPayload,
  ImportStatus,
} from "@/features/imports/types";
import { reportKeys } from "@/features/reports/hooks";

const TERMINAL_POLL_STATUSES: ImportStatus[] = ["preview_ready", "failed", "completed"];

export const importKeys = {
  all: ["imports"] as const,
  lists: () => [...importKeys.all, "list"] as const,
  list: (page: number, pageSize: number) =>
    [...importKeys.lists(), page, pageSize] as const,
  details: () => [...importKeys.all, "detail"] as const,
  detail: (id: string) => [...importKeys.details(), id] as const,
};

function invalidateEntryRelated(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: entryKeys.all });
  void queryClient.invalidateQueries({ queryKey: reportKeys.all });
}

export function useImportJob(jobId: string | null) {
  return useQuery({
    queryKey: importKeys.detail(jobId ?? ""),
    queryFn: () => importsApi.getImport(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_POLL_STATUSES.includes(status)) return false;
      return 2000;
    },
  });
}

export function useImportList(page: number, pageSize = 10) {
  return useQuery({
    queryKey: importKeys.list(page, pageSize),
    queryFn: () => importsApi.listImports(page, pageSize),
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, dateFormat }: { file: File; dateFormat: DateFormat }) =>
      importsApi.uploadImport(file, dateFormat),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.lists() });
      toast.success("Upload started. Parsing your PDF…");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : "Could not upload PDF.";
      toast.error(message);
    },
  });
}

export function useConfirmImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload?: ImportConfirmPayload;
    }) => importsApi.confirmImport(jobId, payload ?? {}),
    onSuccess: (result, variables) => {
      void queryClient.invalidateQueries({ queryKey: importKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: importKeys.detail(variables.jobId),
      });
      invalidateEntryRelated(queryClient);

      const skipped =
        result.skipped_duplicates > 0
          ? ` (${result.skipped_duplicates} duplicate${result.skipped_duplicates === 1 ? "" : "s"} skipped)`
          : "";
      toast.success(
        `Imported ${result.imported_count} entr${result.imported_count === 1 ? "y" : "ies"}${skipped}.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : "Could not confirm import.";
      toast.error(message);
    },
  });
}
