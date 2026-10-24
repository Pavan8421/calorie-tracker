import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "@/api/errors";

/** Map backend 422 field details onto react-hook-form errors. Returns true if handled. */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return false;
  }

  let mapped = false;
  for (const detail of error.details) {
    if (!detail.field) continue;
    const field = detail.field.split(".").pop();
    if (!field) continue;
    setError(field as Path<T>, { type: "server", message: detail.message });
    mapped = true;
  }
  return mapped;
}
