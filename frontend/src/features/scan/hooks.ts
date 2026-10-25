import { useMutation } from "@tanstack/react-query";

import * as scanApi from "@/features/scan/api";
import type { AnalyzeHint } from "@/features/scan/types";

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: ({ file, hint }: { file: File; hint: AnalyzeHint }) =>
      scanApi.analyzeImage(file, hint),
  });
}
