"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const LAST_ACTIVE_USER_ID_STORAGE_KEY = "pokelist:last-active-user-id";

type SessionResponse = {
  userId: string | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type AppAuthContextValue = {
  sessionUserId: string | null;
  isRestoringSession: boolean;
  refreshSession: () => Promise<string | null>;
  setSessionUserId: (userId: string | null) => void;
  logout: () => Promise<void>;
};

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function AppAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse<SessionResponse>;

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "로그인 상태를 확인하지 못했습니다.");
      }

      setSessionUserId(result.data.userId);
      return result.data.userId;
    } catch {
      setSessionUserId(null);
      return null;
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    window.localStorage.removeItem(LAST_ACTIVE_USER_ID_STORAGE_KEY);
    setSessionUserId(null);
  }, []);

  return (
    <AppAuthContext.Provider
      value={{
        sessionUserId,
        isRestoringSession,
        refreshSession,
        setSessionUserId,
        logout,
      }}
    >
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const context = useContext(AppAuthContext);

  if (!context) {
    throw new Error("useAppAuth must be used within AppAuthProvider.");
  }

  return context;
}
