export type ErrorDetail = {
  field?: string | null;
  message: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details: ErrorDetail[];
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: ErrorDetail[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? [];
  }
}

export function parseApiError(status: number, data: unknown): ApiError {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object"
  ) {
    const error = data.error as Partial<ApiErrorBody>;
    return new ApiError(status, {
      code: error.code ?? "UNKNOWN_ERROR",
      message: error.message ?? "Request failed",
      details: error.details ?? [],
    });
  }

  return new ApiError(status, {
    code: "UNKNOWN_ERROR",
    message: "Request failed",
    details: [],
  });
}
