import { apiClient } from "@/api/client";
import type {
  DateFormat,
  ImportConfirmPayload,
  ImportConfirmResponse,
  ImportJob,
  ImportJobCreated,
  Page,
} from "@/features/imports/types";

export async function uploadImport(
  file: File,
  dateFormat: DateFormat = "DMY",
): Promise<ImportJobCreated> {
  const form = new FormData();
  form.append("file", file);
  form.append("date_format", dateFormat);

  const { data } = await apiClient.post<ImportJobCreated>("/imports", form);
  return data;
}

export async function listImports(page = 1, pageSize = 10): Promise<Page<ImportJob>> {
  const { data } = await apiClient.get<Page<ImportJob>>("/imports", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function getImport(jobId: string): Promise<ImportJob> {
  const { data } = await apiClient.get<ImportJob>(`/imports/${jobId}`);
  return data;
}

export async function confirmImport(
  jobId: string,
  payload: ImportConfirmPayload = {},
): Promise<ImportConfirmResponse> {
  const { data } = await apiClient.post<ImportConfirmResponse>(
    `/imports/${jobId}/confirm`,
    payload,
  );
  return data;
}
