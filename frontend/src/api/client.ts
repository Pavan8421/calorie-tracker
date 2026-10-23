import axios from "axios";

import { parseApiError } from "@/api/errors";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      throw parseApiError(error.response.status, error.response.data);
    }
    throw parseApiError(0, {
      error: {
        code: "NETWORK_ERROR",
        message: "Unable to reach the server. Please try again.",
        details: [],
      },
    });
  },
);
