import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { setAccessToken, setUnauthorizedHandler } from "@/api/client";
import { ApiError } from "@/api/errors";
import { LoadingState } from "@/components/common/LoadingState";
import * as authApi from "@/features/auth/api";
import type { LoginPayload, RegisterPayload, User } from "@/features/auth/types";
import { AuthContext, type AuthContextValue } from "@/providers/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const session = await authApi.refreshSession();
        if (cancelled) return;
        setAccessToken(session.access_token);
        setUser(session.user);
      } catch (error) {
        if (cancelled) return;
        // No cookie / expired session — stay logged out quietly.
        if (!(error instanceof ApiError && error.status === 401)) {
          console.warn("Session restore failed", error);
        }
        clearSession();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authApi.loginUser(payload);
    setAccessToken(result.access_token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await authApi.registerUser(payload);
    const result = await authApi.loginUser({
      email: payload.email,
      password: payload.password,
    });
    setAccessToken(result.access_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logoutUser();
    } catch {
      // Always clear local session even if the network call fails.
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  }, [clearSession, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
      setUser,
    }),
    [user, isBootstrapping, login, register, logout],
  );

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Restoring session..." />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
