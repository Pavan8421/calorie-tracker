import { apiClient, refreshClient } from "@/api/client";
import type {
  AccessTokenResponse,
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  UpdateProfilePayload,
  User,
} from "@/features/auth/types";

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/register", payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);
  return data;
}

export async function refreshSession(): Promise<AccessTokenResponse> {
  const { data } = await refreshClient.post<AccessTokenResponse>("/auth/refresh");
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}

export async function updateMe(payload: UpdateProfilePayload): Promise<User> {
  const { data } = await apiClient.patch<User>("/users/me", payload);
  return data;
}
