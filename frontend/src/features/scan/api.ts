import { apiClient } from "@/api/client";
import type { AnalyzeHint, ImageAnalysisResponse } from "@/features/scan/types";

export async function analyzeImage(
  file: File,
  hint: AnalyzeHint = "auto",
): Promise<ImageAnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("hint", hint);

  const { data } = await apiClient.post<ImageAnalysisResponse>("/ai/analyze-image", form);
  return data;
}
