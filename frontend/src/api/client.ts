import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { parseApiError } from "@/api/errors";
import type { AccessTokenResponse } from "@/features/auth/types";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Bare client for refresh — no auth interceptor, avoids recursive 401 handling. */
export const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<AccessTokenResponse> | null = null;

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function refreshAccessToken(): Promise<AccessTokenResponse> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<AccessTokenResponse>("/auth/refresh")
      .then((response) => {
        setAccessToken(response.data.access_token);
        return response.data;
      })
      .catch((error: unknown) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthRefreshOrLogin(config?: InternalAxiosRequestConfig): boolean {
  const url = config?.url ?? "";
  return url.includes("/auth/refresh") || url.includes("/auth/login");
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Let the browser set multipart boundary for FormData uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (!error.response) {
      throw parseApiError(0, {
        error: {
          code: "NETWORK_ERROR",
          message: "Unable to reach the server. Please try again.",
          details: [],
        },
      });
    }

    if (
      error.response.status === 401 &&
      original &&
      !original._retry &&
      !isAuthRefreshOrLogin(original)
    ) {
      original._retry = true;
      try {
        const refreshed = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${refreshed.access_token}`;
        return apiClient(original);
      } catch {
        unauthorizedHandler?.();
        throw parseApiError(error.response.status, error.response.data);
      }
    }

    throw parseApiError(error.response.status, error.response.data);
  },
);

refreshClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      throw parseApiError(0, {
        error: {
          code: "NETWORK_ERROR",
          message: "Unable to reach the server. Please try again.",
          details: [],
        },
      });
    }
    throw parseApiError(error.response.status, error.response.data);
  },
);
